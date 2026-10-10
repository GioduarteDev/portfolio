const AUDIO_CONFIG = {
  musicUrl: "/audio/ambient-loop.mp3",
  masterFadeSeconds: 0.48,
  musicFadeSeconds: 0.56,
  musicGain: 0.68,
  submergedMusicGain: 0.58,
  normalCutoff: 20_000,
  submergedCutoff: 1_650,
  cutoffUpdateInterval: 0.08,
  cutoffUpdateThreshold: 70,
  cutoffSmoothingSeconds: 0.22,
} as const;

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

  private readonly ownedNodes = new Set<AudioNode>();

  private isInitialized = false;

  private isMuted = true;

  private lastCutoffTarget: number = AUDIO_CONFIG.normalCutoff;

  private lastCutoffUpdateTime = Number.NEGATIVE_INFINITY;

  private lastMusicGainTarget = 0;

  private immersion = 0;

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

      this.lowPass.connect(this.musicGain);
      this.musicGain.connect(this.masterGain);
      this.effectsGain.connect(this.masterGain);
      this.masterGain.connect(this.context.destination);

      this.ownedNodes.add(this.masterGain);
      this.ownedNodes.add(this.musicGain);
      this.ownedNodes.add(this.effectsGain);
      this.ownedNodes.add(this.lowPass);

      this.isInitialized = true;
      this.lastCutoffTarget = AUDIO_CONFIG.normalCutoff;
    }

    await this.context.resume();
  }

  async startMusic(): Promise<boolean> {
    if (!this.isInitialized || !this.context || !this.lowPass) {
      throw new Error(
        "Initialize AudioManager from a user gesture before starting music.",
      );
    }

    if (this.musicSource) {
      return true;
    }

    const buffer = await this.loadMusic();

    if (!buffer || !this.context || !this.lowPass || !this.musicGain) {
      return false;
    }

    if (this.musicSource) {
      return true;
    }

    if (this.disposed) {
      return false;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.lowPass);
    source.start();
    this.musicSource = source;
    this.ownedNodes.add(source);

    this.setAudioParamTarget(
      this.musicGain.gain,
      this.isMuted
        ? 0
        : this.musicGainForImmersion(this.immersion),
      AUDIO_CONFIG.musicFadeSeconds,
    );
    this.lastMusicGainTarget =
      this.musicGainForImmersion(this.immersion);

    return true;
  }

  async setMuted(
    muted: boolean,
    fadeSeconds = AUDIO_CONFIG.masterFadeSeconds,
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

    if (this.musicGain && this.musicSource) {
      this.setAudioParamTarget(
        this.musicGain.gain,
        muted
          ? 0
          : this.musicGainForImmersion(this.immersion),
        AUDIO_CONFIG.masterFadeSeconds,
      );
      this.lastMusicGainTarget =
        this.musicGainForImmersion(this.immersion);
    }
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

    if (
      !this.isMuted &&
      this.musicGain &&
      this.musicSource
    ) {
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
    this.disposed = true;
    this.isInitialized = false;
    this.musicSource?.stop();
    this.musicSource = null;

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

        if (!response.ok) {
          throw new Error(
            `Music request failed with HTTP ${response.status}.`,
          );
        }

        const audioData = await response.arrayBuffer();
        const buffer = await context.decodeAudioData(audioData);
        this.musicBuffer = buffer;
        return buffer;
      } catch (error) {
        console.warn(
          `Ambient music is unavailable at ${AUDIO_CONFIG.musicUrl}; the experience will continue silently until an authorized track is added.`,
          error,
        );
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
