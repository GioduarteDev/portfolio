/** Landmarks traced from the supplied 16:9 concept; U/V are frame fractions. */
export type FacadeLandmark = readonly [u: number, v: number, z: number];
export type SanctuaryPanel = {
  name: string; inner: readonly FacadeLandmark[]; outer: readonly FacadeLandmark[];
  thickness: number; seam?: number;
  /** Per-side vertical offset (frame fraction) so left and right are not mirrored. */
  asymmetry?: number;
};
export const SANCTUARY_PANELS: readonly SanctuaryPanel[] = [
  {
    name: "central oval shell", thickness: 0.85, seam: 0.24,
    inner: [[0.395, 0.63, -5], [0.351, 0.557, -6.8], [0.292, 0.44, -9], [0.266, 0.30, -11],
      [0.269, 0.145, -12], [0.315, 0.025, -12.5], [0.382, -0.075, -13]],
    outer: [[0.268, 0.63, -5], [0.286, 0.548, -6.8], [0.235, 0.438, -9], [0.204, 0.30, -11],
      [0.213, 0.13, -12], [0.248, -0.025, -12.5], [0.30, -0.12, -13]],
  },
  {
    name: "outer folded shell", thickness: 1.1,
    inner: [[0.265, 0.63, -4.8], [0.216, 0.50, -5.7], [0.161, 0.38, -6.4],
      [0.144, 0.21, -7], [0.17, 0.07, -7.7], [0.227, -0.08, -8]],
    outer: [[0.165, 0.63, -4.8], [0.125, 0.49, -5.7], [0.092, 0.35, -6.4],
      [0.103, 0.19, -7], [0.13, 0.04, -7.7], [0.177, -0.08, -8]],
  },
  {
    name: "peripheral monumental wall", thickness: 1.7,
    inner: [[0.09, 0.637, -3.7], [0.068, 0.50, -4.3], [0.01, 0.31, -4.7],
      [-0.02, 0.10, -5.5], [0.06, -0.08, -6.7]],
    outer: [[-0.2, 0.637, -3.7], [-0.16, 0.48, -4.3], [-0.17, 0.25, -4.7],
      [-0.15, 0.04, -5.5], [-0.06, -0.10, -6.7]],
  },
  {
    name: "diagonal inner membrane", thickness: 0.38,
    inner: [[0.19, 0.025, -12.3], [0.176, 0.13, -12], [0.21, 0.27, -11], [0.246, 0.43, -9], [0.305, 0.575, -7]],
    outer: [[0.172, 0.025, -12.3], [0.155, 0.16, -12], [0.183, 0.29, -11], [0.224, 0.45, -9], [0.287, 0.59, -7]],
  },
  {
    name: "waterward rising wing", thickness: 0.7,
    inner: [[-0.045, 0.26, -1.5], [0.09, 0.36, -2.8], [0.185, 0.435, -4],
      [0.268, 0.525, -5], [0.32, 0.588, -6], [0.362, 0.53, -6.7]],
    outer: [[-0.05, 0.48, -1.5], [0.09, 0.56, -2.8], [0.18, 0.605, -4],
      [0.255, 0.634, -5], [0.34, 0.636, -6], [0.37, 0.586, -6.7]],
  },
  {
    name: "upper canopy ribbon", thickness: 1.3, seam: 0.5, asymmetry: 0.035,
    inner: [[0.0, 0.21, -4.0], [0.12, 0.135, -5.0], [0.26, 0.115, -6.2], [0.395, -0.15, -7.4]],
    outer: [[0.0, -0.05, -4.0], [0.12, -0.08, -5.0], [0.26, -0.07, -6.2], [0.395, -0.32, -7.4]],
  },
  // The chamber frames the existing distant shells without extra overlapping folds.
  {
    name: "foreground chamber wall", thickness: 2.4, asymmetry: 0.02,
    inner: [[0.07, 0.64, -0.4], [0.045, 0.47, -0.7], [0.012, 0.28, -1.0],
      [0.0, 0.08, -1.4], [0.05, -0.1, -2.0]],
    outer: [[-0.3, 0.64, -0.4], [-0.27, 0.45, -0.7], [-0.25, 0.25, -1.0],
      [-0.22, 0.05, -1.4], [-0.15, -0.12, -2.0]],
  },
  {
    name: "upper outer canopy", thickness: 2.0, asymmetry: 0.03,
    inner: [[-0.02, 0.17, -2.6], [0.07, 0.07, -3.4], [0.19, 0.01, -4.4],
      [0.31, -0.01, -5.6], [0.40, -0.12, -6.8]],
    outer: [[-0.2, 0.02, -2.6], [-0.1, -0.12, -3.4], [0.05, -0.24, -4.4],
      [0.2, -0.28, -5.6], [0.33, -0.22, -6.8]],
  },
];
