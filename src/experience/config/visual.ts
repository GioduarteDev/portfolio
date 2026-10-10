/**
 * Central calibration tokens.
 *
 * Every value preserves the number that previously lived inline in its
 * scene/manager. Change one only with a reference observation to back it
 * (see docs/VISUAL_FIDELITY_AUDIT.md).
 */

// HOME
export const HOME_CAMERA_FOV = 38;
export const HOME_CAMERA_NEAR = 0.1;
export const HOME_CAMERA_FAR = 100;
export const HOME_CAMERA_START = [0, 2.1, 9] as const;

export const HOME_BACKGROUND = "#c8b0bd";
export const HOME_FOG_COLOR = "#d7c1c7";
export const HOME_FOG_NEAR = 22;
export const HOME_FOG_FAR = 58;

export const HOME_PARALLAX_X = 0.55;
export const HOME_PARALLAX_Y = 0.28;

// SCROLL / TRANSITION
export const EXPERIENCE_SCROLL_VALUES = {
  homeScrollLength: 0.36,
  transitionScrollLength: 0.22,
  projectsScrollUnit: 0.42,
  homeCameraPathAtTransitionStart: 0.36,
  homeCameraPathEnd: 0.58,
  dampingRate: 4,
  wheelStrength: 0.00055,
  touchStrength: 0.0025,
  directionEpsilon: 0.000001,
  settleEpsilon: 0.0001,
  homeUiFadeStart: 0.75,
  homeParallaxFadeStart: 0.27,
  projectsUiFadeStart: 0.73,
  homeParallaxEndStrength: 0,
} as const;

/** Global scroll position where the dive starts / ends. */
export const TRANSITION_START =
  EXPERIENCE_SCROLL_VALUES.homeScrollLength;
export const TRANSITION_END =
  EXPERIENCE_SCROLL_VALUES.homeScrollLength +
  EXPERIENCE_SCROLL_VALUES.transitionScrollLength;

// PROJECTS
export const PROJECT_SCENE_VALUES = {
  background: "#f0eeea",
  fogNear: 34,
  fogFar: 62,
  cameraFov: 40,
  cameraNear: 0.1,
  cameraFar: 100,
  cameraZ: -17,
  cameraTargetZ: -27,
  planeZ: -26.5,
  architectureZ: -36,
  floorY: -5.2,
  columnX: [-2.6, 2.6] as const,
  rowGap: 4.6,
  firstRowY: 1.2,
  columnYStagger: [0.5, -0.5] as const,
  imageMaxWidth: 3.9,
  imageMaxHeight: 3.4,
  shadowOffset: [0.055, -0.075, -0.035] as const,
  scrollDistancePerOffset: 20,
  endSectionViewports: 1.15,
  visibleRange: 6.2,
  fadeRange: 1.6,
  minimumResponsiveScale: 0.3,
  responsiveReferenceAspect: 1.48,
  maximumResponsiveScale: 1,
  filterTransitionDuration: 0.48,
  swayAmplitude: 0.012,
  swayFrequency: 0.16,
  columnYaw: 0.009,
  scrollTiltScale: 0.0025,
  maximumScrollTilt: 0.014,
  maximumScrollStretch: 0.018,
  metaOffsetPx: 12,
  particles: 150,
  particleWidth: 20,
  particleHeight: 13,
  particleNearZ: -30,
  particleDepth: 14,
  reflectionDepthOffset: 0.035,
} as const;

export const PROJECTS_CAMERA_FOV = PROJECT_SCENE_VALUES.cameraFov;
export const PROJECT_COLUMN_X = PROJECT_SCENE_VALUES.columnX;
export const PROJECT_ROW_GAP = PROJECT_SCENE_VALUES.rowGap;
export const PROJECT_WIDTH = PROJECT_SCENE_VALUES.imageMaxWidth;
export const FOG_NEAR = PROJECT_SCENE_VALUES.fogNear;
export const FOG_FAR = PROJECT_SCENE_VALUES.fogFar;

// AUDIO
export const AUDIO_VALUES = {
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
