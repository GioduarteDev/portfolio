/** Editable silhouettes in the reference 16:9 camera frame, with real world depth. */
export type FacadeLandmark = readonly [u: number, v: number, z: number];
export type SanctuaryPanel = {
  name: string;
  inner: readonly FacadeLandmark[];
  outer: readonly FacadeLandmark[];
  thickness: number;
  seam?: number;
  span?: "arch" | "side";
  finish?: "pearl" | "recess";
};

/** Art controls: world units except curvature / light intensity (multipliers). */
export const SANCTUARY_ARCHITECTURE = {
  scale: 1,
  position: [0, 0, 0] as const,
  depthOffset: 0,
  thickness: 1.25,
  curvature: 0.72,
  lightIntensity: 0.26,
  lightRadius: 0.009,
  cavern: { depth: 3.8, erosion: 0.22, roofDrop: 0, lightIntensity: 0.14 },
  steps: { count: 14, rise: 0.087, run: 0.52, halfWidth: 3.65, taper: 0.035,
    front: -0.65, baseHeight: 0.23, landingDepth: 2.8, curvature: 0.24 },
} as const;

/** Continuous crowns replace mirrored half-arch end caps. Different profiles,
 * shoulder heights and depths distinguish the structural families. */
export const SANCTUARY_PANELS: readonly SanctuaryPanel[] = [
  {
    name: "distant ocean apse", thickness: 1.3, seam: 0.17,
    inner: [[0.30, 0.78, -15], [0.255, 0.58, -17], [0.248, 0.39, -18],
      [0.30, 0.245, -19], [0.40, 0.19, -19.5], [0.5, 0.18, -19.5]],
    outer: [[0.225, 0.8, -15], [0.185, 0.58, -17], [0.18, 0.37, -18],
      [0.24, 0.19, -19], [0.37, 0.125, -19.5], [0.5, 0.12, -19.5]],
  },
  {
    name: "recessed chamber reveal", thickness: 1.1, finish: "recess",
    inner: [[0.235, 0.82, -9], [0.19, 0.58, -11], [0.17, 0.36, -12],
      [0.25, 0.18, -13], [0.38, 0.115, -14], [0.5, 0.10, -14]],
    outer: [[0.145, 0.84, -9], [0.10, 0.58, -11], [0.08, 0.32, -12],
      [0.17, 0.10, -13], [0.34, 0.045, -14], [0.5, 0.035, -14]],
  },
  {
    name: "folded inner nacre shell", thickness: 1.5, seam: 0.23,
    inner: [[0.215, 0.83, -7], [0.15, 0.61, -8], [0.135, 0.34, -9],
      [0.21, 0.155, -10], [0.37, 0.10, -11], [0.5, 0.105, -11]],
    outer: [[0.14, 0.85, -7], [0.07, 0.60, -8], [0.055, 0.29, -9],
      [0.155, 0.065, -10], [0.34, 0.015, -11], [0.5, 0.025, -11]],
  },
  {
    name: "primary load bearing vault", thickness: 3.0,
    inner: [[-0.025, 0.90, 0.6], [-0.015, 0.67, -0.3], [0.015, 0.36, -1.6],
      [0.13, 0.12, -3], [0.32, 0.025, -4.5], [0.5, 0.045, -5]],
    outer: [[-0.30, 0.95, 0.6], [-0.24, 0.65, -0.3], [-0.24, 0.24, -1.6],
      [-0.08, -0.12, -3], [0.20, -0.20, -4.5], [0.5, -0.18, -5]],
  },
  {
    name: "selective mineral lamella", thickness: 0.5, span: "side", seam: 0.42,
    inner: [[0.205, 0.80, -6.4], [0.16, 0.62, -7], [0.16, 0.43, -8],
      [0.195, 0.28, -9], [0.26, 0.185, -10]],
    outer: [[0.18, 0.81, -6.4], [0.13, 0.62, -7], [0.13, 0.42, -8],
      [0.17, 0.26, -9], [0.26, 0.185, -10]],
  },
  {
    name: "swept mineral buttress", thickness: 1.4, span: "side",
    inner: [[-0.04, 0.51, -0.5], [0.07, 0.58, -2], [0.16, 0.69, -4],
      [0.24, 0.77, -7], [0.30, 0.79, -11]],
    outer: [[-0.05, 0.88, -0.5], [0.06, 0.87, -2], [0.16, 0.85, -4],
      [0.24, 0.83, -7], [0.31, 0.83, -11]],
  },
];

/** Stable choreography / interaction anchors in local sanctuary space. */
export const SANCTUARY_STAGING = {
  stairs: [0, 0.23, -0.65],
  landing: [0, 1.361, -8.6],
  leftCrystals: [-5.6, 0.43, -2.18],
  rightCrystals: [5.8, 0.49, -2.78],
  foregroundStones: [0, 0.16, 2],
  motionFocus: [0, 2.4, -14],
} as const;
