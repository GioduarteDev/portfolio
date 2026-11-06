export const DIVE_PHASES = {
  approach: [0, 0.18], contact: [0.18, 0.30], crossing: [0.30, 0.46],
  submerged: [0.46, 0.78], arrival: [0.78, 1],
} as const;

export type DivePhase = keyof typeof DIVE_PHASES;
export const DIVE_CHAPTERS = {
  contemplation: [0, 0], call: [0, 0.12], approach: [0.12, 0.22],
  contact: [0.22, 0.34], crossing: [0.34, 0.48], descent: [0.48, 0.78], revelation: [0.78, 1],
} as const;
export type DiveChapter = keyof typeof DIVE_CHAPTERS;
export type DiveState = {
  chapter: DiveChapter; anticipation: number; descent: number;
  progress: number; phase: DivePhase; contact: number; crossing: number;
  immersion: number; arrival: number; travel: number; wet: number; bubbles: number;
};

export const smoothRange = (start: number, end: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
};

export const createDiveState = (): DiveState => ({
  chapter: "contemplation", anticipation: 0, descent: 0,
  progress: 0, phase: "approach", contact: 0, crossing: 0,
  immersion: 0, arrival: 0, travel: 0, wet: 0, bubbles: 0,
});

/** One shared, reversible scroll timeline; the supplied object is reused. */
export function sampleDiveState(progress: number, state: DiveState): DiveState {
  const p = Math.min(1, Math.max(0, progress));
  state.progress = p;
  state.chapter = p === 0 ? "contemplation" : p < 0.12 ? "call" : p < 0.22 ? "approach"
    : p < 0.34 ? "contact" : p < 0.48 ? "crossing" : p < 0.78 ? "descent" : "revelation";
  state.anticipation = smoothRange(0, 0.22, p) * (1 - smoothRange(0.30, 0.48, p));
  state.descent = smoothRange(0.46, 0.78, p) * (1 - smoothRange(0.88, 1, p));
  state.phase = p < 0.18 ? "approach" : p < 0.30 ? "contact"
    : p < 0.46 ? "crossing" : p < 0.78 ? "submerged" : "arrival";
  state.contact = smoothRange(0.18, 0.26, p) * (1 - smoothRange(0.30, 0.48, p));
  state.crossing = smoothRange(0.30, 0.46, p);
  state.arrival = smoothRange(0.78, 1, p);
  state.immersion = state.crossing * (1 - state.arrival);
  state.travel = smoothRange(0.44, 0.86, p);
  state.wet = smoothRange(0.18, 0.44, p) * (1 - state.arrival);
  state.bubbles = smoothRange(0.21, 0.32, p) * (1 - smoothRange(0.72, 0.98, p));
  return state;
}
