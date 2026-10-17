import { AUDIO_VALUES } from "../config/visual";
import { DiveAudio } from "../dive/DiveAudio";
import type { DiveState } from "../dive/diveTimeline";

const AUDIO_CONFIG = AUDIO_VALUES;

type AudioManagerState = {
  readonly initialized: boolean;
  readonly muted: boolean;
};

type EffectOptions = {
  gain?: number;
  fadeInSeconds?: number;
};

class AudioManager {
  private context: AudioContext | null = null;

  private masterGain: GainNode | null = null;

  private musicGain: GainNode | null = null;

  private effectsGain: GainNode | null = null;

  private lowPass: BiquadFilterNode | null = null;

  private musicSource: AudioBufferSourceNode | null = null;

  private musicBuffer: AudioBuffer | null = null;

  private musicLoadPromise: Promise<AudioBuffer | null> | null = null;

  private musicLoadComplete = false;

  private procedural: Array<OscillatorNode | AudioBufferSourceNode> = [];

  private musicActive = false;

  private readonly ownedNodes = new Set<AudioNode>();

  private isInitialized = false;

  private isMuted = true;

  private lastCutoffTarget: number = AUDIO_CONFIG.normalCutoff;

  private lastCutoffUpdateTime = Number.NEGATIVE_INFINITY;

  private lastMusicGainTarget = 0;

  private immersion = 0;
  private diveAudio: DiveAudio | null = null;

  private disposed = false;

  private muteChangeVersion = 0;

  get state(): AudioManagerState {
    return {
      initialized: this.isInitialized,
      muted: this.isMuted,
    };
  }

  async initialize(): Promise<void> {
    if (!this.context) {
      const AudioContextConstructor =
        window.AudioContext;

      if (!AudioContextConstructor) {
        throw new Error(
          "The Web Audio API is not available in this browser.",
        );
      }

      this.disposed = false;
      this.context = new AudioContextConstructor();
      this.masterGain = this.context.createGain();
      this.musicGain = this.context.createGain();
      this.effectsGain = this.context.createGain();
      this.lowPass = this.context.createBiquadFilter();

      this.masterGain.gain.value = 0;
      this.musicGain.gain.value = 0;
      this.effectsGain.gain.value = 1;
      this.lowPass.type = "lowpass";
      this.lowPass.frequency.value = AUDIO_CONFIG.normalCutoff;
      this.lowPass.Q.value = 0.7;

      this.musicGain.connect(this.lowPass);
      this.lowPass.connect(this.masterGain);
      this.effectsGain.connect(this.masterGain);
      this.masterGain.connect(this.context.destination);

      this.ownedNodes.add(this.masterGain);
      this.ownedNodes.add(this.musicGain);
      this.ownedNodes.add(this.effectsGain);
      this.ownedNodes.add(this.lowPass);
      this.diveAudio = new DiveAudio(this.context, this.masterGain);

      this.isInitialized = true;
      this.lastCutoffTarget = AUDIO_CONFIG.normalCutoff;
    }

    const wasSuspended = this.context.state !== "running";
    await this.context.resume();
    if (wasSuspended && import.meta.env.DEV) {
      console.info("[Audio] context resumed");
    }
  }

  setEnabled(enabled: boolean, fadeSeconds?: number): Promise<void> {
    return this.setMuted(!enabled, fadeSeconds);
  }

  setTransitionProgress(progress: number, isProjectsPhase = false): void {
    this.updateTransition(progress, isProjectsPhase);
  }

  update(progress: number, isProjectsPhase = false): void {
    this.updateTransition(progress, isProjectsPhase);
  }

  updateDive(state: DiveState | null): void {
    // Never initialize/resume audio here: only the existing gesture can do so.
    if (state) this.updateTransition(state.immersion, false);
    this.diveAudio?.update(state, state !== null && !this.isMuted);
  }

  // Starts the track (or procedural fallback) once; it keeps running while muted.
  async startMusic(): Promise<boolean> {
    if (!this.isInitialized || !this.context || !this.musicGain) {
      throw new Error(
        "Initialize AudioManager from a user gesture before starting music.",
      );
    }

    if (this.musicActive) {
      return true;
    }

    const buffer = await this.loadMusic();

    if (this.musicActive) {
      return true;
    }

    if (this.disposed || !this.context || !this.musicGain) {
      return false;
    }

    if (buffer) {
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(this.musicGain);
      source.start();
      this.musicSource = source;
      this.ownedNodes.add(source);
      if (import.meta.env.DEV) {
        console.info("[Audio] using file soundtrack");
      }
    } else {
      this.startProceduralAmbience(this.context, this.musicGain);
      if (import.meta.env.DEV) {
        console.info("[Audio] using procedural fallback");
      }
    }

    this.musicActive = true;
    this.lastMusicGainTarget =
      this.musicGainForImmersion(this.immersion);
    this.setAudioParamTarget(
      this.musicGain.gain,
      this.lastMusicGainTarget,
      AUDIO_CONFIG.musicFadeSeconds,
    );

    return true;
  }

  private startProceduralAmbience(
    context: AudioContext,
    destination: AudioNode,
  ): void {
    const out = context.createGain();
    out.gain.value = 0.9;
    this.ownedNodes.add(out);

    const tone = context.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 1500;
    tone.Q.value = 0.4;
    tone.connect(out);
    this.ownedNodes.add(tone);

    const reverb = context.createConvolver();
    reverb.buffer = this.createImpulseResponse(context, 4.5);
    const wet = context.createGain();
    wet.gain.value = 0.55;
    tone.connect(reverb);
    reverb.connect(wet);
    wet.connect(out);
    this.ownedNodes.add(reverb);
    this.ownedNodes.add(wet);

    const addLfo = (
      frequency: number,
      depth: number,
      target: AudioParam,
    ) => {
      const lfo = context.createOscillator();
      const lfoDepth = context.createGain();
      lfo.type = "sine";
      lfo.frequency.value = frequency;
      lfoDepth.gain.value = depth;
      lfo.connect(lfoDepth);
      lfoDepth.connect(target);
      lfo.start();
      this.procedural.push(lfo);
      this.ownedNodes.add(lfo);
      this.ownedNodes.add(lfoDepth);
    };

    // A minor, open voicing: root, fifth, octave, ninth, tenth.
    const voices: ReadonlyArray<
      readonly [number, OscillatorType, number, number]
    > = [
      [55, "sine", 0.1, 0.031],
      [82.41, "sine", 0.075, 0.047],
      [110, "triangle", 0.035, 0.037],
      [164.81, "sine", 0.05, 0.053],
      [246.94, "sine", 0.025, 0.043],
      [329.63, "sine", 0.014, 0.029],
    ];

    voices.forEach(([frequency, type, level, lfoRate], index) => {
      const oscillator = context.createOscillator();
      const voiceGain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      oscillator.detune.value = (index % 2 === 0 ? 1 : -1) * (3 + index);
      voiceGain.gain.value = level;
      oscillator.connect(voiceGain);
      voiceGain.connect(tone);
      oscillator.start();
      addLfo(lfoRate, level * 0.6, voiceGain.gain);
      this.procedural.push(oscillator);
      this.ownedNodes.add(oscillator);
      this.ownedNodes.add(voiceGain);
    });

    addLfo(0.021, 500, tone.frequency);

    // Barely audible air, low-passed so it reads as space rather than hiss.
    const noiseBuffer = context.createBuffer(
      1,
      context.sampleRate * 4,
      context.sampleRate,
    );
    const data = noiseBuffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i += 1) {
      last = last * 0.98 + (Math.random() * 2 - 1) * 0.02;
      data[i] = last * 6;
    }
    const noise = context.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const noiseFilter = context.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.value = 420;
    const noiseGain = context.createGain();
    noiseGain.gain.value = 0.012;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(tone);
    noise.start();
    this.procedural.push(noise);
    this.ownedNodes.add(noise);
    this.ownedNodes.add(noiseFilter);
    this.ownedNodes.add(noiseGain);

    out.connect(destination);
  }

  private createImpulseResponse(
    context: AudioContext,
    seconds: number,
  ): AudioBuffer {
    const length = Math.floor(context.sampleRate * seconds);
    const impulse = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        data[i] =
          (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
      }
    }
    return impulse;
  }

  async setMuted(
    muted: boolean,
    fadeSeconds: number = AUDIO_CONFIG.masterFadeSeconds,
  ): Promise<void> {
    this.isMuted = muted;
    const version = ++this.muteChangeVersion;

    if (!this.isInitialized || !this.context || !this.masterGain) {
      return;
    }

    await this.context.resume();

    if (
      version !== this.muteChangeVersion ||
      !this.context ||
      !this.masterGain
    ) {
      return;
    }

    this.setAudioParamTarget(
      this.masterGain.gain,
      muted ? 0 : 1,
      fadeSeconds,
    );

  }

  updateTransition(
    transitionProgress: number,
    isProjectsPhase: boolean,
  ): void {
    if (!this.isInitialized || !this.context || !this.lowPass) {
      return;
    }

    const immersion = isProjectsPhase
      ? 0
      : Math.min(1, Math.max(0, transitionProgress));
    this.immersion = immersion;
    const cutoffTarget =
      AUDIO_CONFIG.normalCutoff +
      (AUDIO_CONFIG.submergedCutoff - AUDIO_CONFIG.normalCutoff) *
        immersion;
    const now = this.context.currentTime;

    if (
      Math.abs(cutoffTarget - this.lastCutoffTarget) >=
        AUDIO_CONFIG.cutoffUpdateThreshold &&
      now - this.lastCutoffUpdateTime >=
        AUDIO_CONFIG.cutoffUpdateInterval
    ) {
      this.setAudioParamTarget(
        this.lowPass.frequency,
        cutoffTarget,
        AUDIO_CONFIG.cutoffSmoothingSeconds,
      );
      this.lastCutoffTarget = cutoffTarget;
      this.lastCutoffUpdateTime = now;
    }

    if (this.musicGain && this.musicActive) {
      const volume = this.musicGainForImmersion(immersion);
      if (Math.abs(volume - this.lastMusicGainTarget) < 0.005) {
        return;
      }

      this.setAudioParamTarget(
        this.musicGain.gain,
        volume,
        AUDIO_CONFIG.cutoffSmoothingSeconds,
      );
      this.lastMusicGainTarget = volume;
    }
  }

  playEffect(
    buffer: AudioBuffer,
    { gain = 1, fadeInSeconds = 0.02 }: EffectOptions = {},
  ): void {
    if (!this.isInitialized || !this.context || !this.effectsGain) {
      throw new Error(
        "Initialize AudioManager before playing an audio effect.",
      );
    }

    const source = this.context.createBufferSource();
    const effectGain = this.context.createGain();
    const startTime = this.context.currentTime;
    const safeGain = Math.max(0, gain);

    source.buffer = buffer;
    effectGain.gain.setValueAtTime(0, startTime);
    effectGain.gain.setTargetAtTime(
      safeGain,
      startTime,
      Math.max(0.001, fadeInSeconds / 4),
    );
    source.connect(effectGain);
    effectGain.connect(this.effectsGain);
    source.onended = () => {
      source.disconnect();
      effectGain.disconnect();
      this.ownedNodes.delete(source);
      this.ownedNodes.delete(effectGain);
    };

    this.ownedNodes.add(source);
    this.ownedNodes.add(effectGain);
    source.start(startTime);
  }

  createAmbientLayerGain(initialGain = 0): GainNode {
    if (!this.isInitialized || !this.context || !this.masterGain) {
      throw new Error(
        "Initialize AudioManager before creating an ambient layer.",
      );
    }

    const layerGain = this.context.createGain();
    layerGain.gain.value = Math.max(0, initialGain);
    layerGain.connect(this.masterGain);
    this.ownedNodes.add(layerGain);

    return layerGain;
  }

  dispose(): void {
    this.diveAudio?.dispose();
    this.diveAudio = null;
    this.disposed = true;
    this.isInitialized = false;
    this.musicSource?.stop();
    this.musicSource = null;
    for (const node of this.procedural) {
      try {
        node.stop();
      } catch {
        // already stopped
      }
    }
    this.procedural = [];
    this.musicActive = false;
    this.musicLoadComplete = false;
    this.musicLoadPromise = null;
    this.musicBuffer = null;

    for (const node of this.ownedNodes) {
      node.disconnect();
    }
    this.ownedNodes.clear();

    const context = this.context;
    this.context = null;
    this.masterGain = null;
    this.musicGain = null;
    this.effectsGain = null;
    this.lowPass = null;

    if (context && context.state !== "closed") {
      void context.close().catch((error: unknown) => {
        console.error("Unable to close the Web Audio context.", error);
      });
    }
  }

  private async loadMusic(): Promise<AudioBuffer | null> {
    if (this.musicLoadComplete) {
      return this.musicBuffer;
    }

    if (this.musicLoadPromise) {
      return this.musicLoadPromise;
    }

    if (!this.context) {
      throw new Error(
        "Initialize AudioManager before loading its music track.",
      );
    }

    const context = this.context;
    this.musicLoadPromise = (async () => {
      try {
        const response = await fetch(AUDIO_CONFIG.musicUrl);
        const type = response.headers.get("content-type") ?? "";

        // Dev servers answer missing files with index.html (200).
        if (!response.ok || type.includes("text/html")) {
          return null;
        }

        const audioData = await response.arrayBuffer();
        const buffer = await context.decodeAudioData(audioData);
        this.musicBuffer = buffer;
        return buffer;
      } catch {
        return null;
      } finally {
        this.musicLoadComplete = true;
        this.musicLoadPromise = null;
      }
    })();

    return this.musicLoadPromise;
  }

  private setAudioParamTarget(
    parameter: AudioParam,
    target: number,
    durationSeconds: number,
  ): void {
    if (!this.context) {
      return;
    }

    const now = this.context.currentTime;
    const timeConstant = Math.max(0.001, durationSeconds / 4.6);

    parameter.cancelScheduledValues(now);
    parameter.setValueAtTime(parameter.value, now);
    parameter.setTargetAtTime(target, now, timeConstant);
  }

  private musicGainForImmersion(immersion: number): number {
    return (
      AUDIO_CONFIG.musicGain +
      (AUDIO_CONFIG.submergedMusicGain - AUDIO_CONFIG.musicGain) *
        immersion
    );
  }
}

export default AudioManager;
