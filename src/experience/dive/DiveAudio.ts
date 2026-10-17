import type { DiveState } from "./diveTimeline";

/** Quiet procedural water layers, allocated once after the user's audio gesture.
 * All sources are pooled; scrolling only changes existing AudioParams. */
export class DiveAudio {
  private readonly sources: AudioScheduledSourceNode[] = [];
  private readonly nodes: AudioNode[] = [];
  private readonly impact: GainNode;
  private readonly flow: GainNode;
  private readonly bubble: GainNode;
  private readonly bubbleTone: OscillatorNode;
  private previousProgress = 0;
  private previousTime = 0;
  private lastUpdate = -Infinity;
  private readonly context: AudioContext;

  constructor(context: AudioContext, destination: AudioNode) {
    this.context = context;
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * 2), context.sampleRate);
    const samples = buffer.getChannelData(0);
    let previous = 0, seed = 9137;
    for (let i = 0; i < samples.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      previous = previous * 0.93 + (seed / 4294967296 * 2 - 1) * 0.07;
      samples[i] = previous * 2;
    }
    const noiseLayer = (cutoff: number) => {
      const source = context.createBufferSource();
      source.buffer = buffer; source.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = "lowpass"; filter.frequency.value = cutoff;
      const gain = context.createGain(); gain.gain.value = 0;
      source.connect(filter); filter.connect(gain); gain.connect(destination);
      source.start();
      this.sources.push(source); this.nodes.push(source, filter, gain);
      return gain;
    };
    this.impact = noiseLayer(1400);
    this.flow = noiseLayer(650);
    this.bubbleTone = context.createOscillator();
    this.bubbleTone.frequency.value = 340;
    this.bubble = context.createGain(); this.bubble.gain.value = 0;
    this.bubbleTone.connect(this.bubble); this.bubble.connect(destination);
    this.bubbleTone.start();
    this.sources.push(this.bubbleTone); this.nodes.push(this.bubbleTone, this.bubble);
  }

  update(state: DiveState | null, enabled: boolean) {
    const now = this.context.currentTime;
    const p = state?.progress ?? 0;
    if (enabled && state && this.previousProgress < 0.18 && p >= 0.18 && p < 0.6) {
      const gain = this.impact.gain;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(0, now);
      gain.linearRampToValueAtTime(0.022, now + 0.025);
      gain.linearRampToValueAtTime(0, now + 0.28);
    }
    const speed = Math.min(1, Math.abs(p - this.previousProgress) / Math.max(0.01, now - this.previousTime));
    this.previousProgress = p;
    this.previousTime = now;
    if (now - this.lastUpdate < 0.045) return;
    this.lastUpdate = now;
    const movement = Math.min(1, speed * 4);
    const flow = enabled && state ? (state.contact * 0.016 + state.immersion * 0.005) * movement : 0;
    this.flow.gain.setTargetAtTime(flow, now, 0.08);
    const bubble = enabled && state ? Math.pow(Math.max(0, Math.sin(p * 48)), 12) *
      state.immersion * movement * 0.005 : 0;
    this.bubble.gain.setTargetAtTime(bubble, now, 0.025);
    this.bubbleTone.frequency.setTargetAtTime(240 + p * 170, now, 0.08);
    if (!enabled) {
      this.impact.gain.cancelScheduledValues(now);
      this.impact.gain.setTargetAtTime(0, now, 0.04);
    }
  }

  dispose() {
    for (const source of this.sources) source.stop();
    for (const node of this.nodes) node.disconnect();
  }
}
