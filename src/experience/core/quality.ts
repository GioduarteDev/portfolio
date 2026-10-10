export type QualityMode = "high" | "medium" | "low";

export type QualitySettings = {
  mode: QualityMode;
  maxPixelRatio: number;
  antialias: boolean;
  shadows: boolean;
  shadowMapSize: number;
  reflectionScale: number;
  maxReflectionSize: number;
  terrainSegments: number;
  grassCount: number;
  dustCount: number;
  petalCount: number;
  waterSegments: readonly [number, number];
  projectParticles: number;
  worldProjectCount: number;
  labelTextureSize: number;
  maxFps: number;
};

export const QUALITY_MODE_OVERRIDE: QualityMode | null = null;

const QUALITY_SETTINGS: Record<QualityMode, QualitySettings> = {
  high: {
    mode: "high",
    maxPixelRatio: 2,
    antialias: true,
    shadows: true,
    shadowMapSize: 1024,
    reflectionScale: 0.5,
    maxReflectionSize: 1024,
    terrainSegments: 112,
    grassCount: 1500,
    dustCount: 180,
    petalCount: 72,
    waterSegments: [112, 224],
    projectParticles: 150,
    worldProjectCount: 8,
    labelTextureSize: 512,
    maxFps: 60,
  },
  medium: {
    mode: "medium",
    maxPixelRatio: 1.5,
    antialias: true,
    shadows: true,
    shadowMapSize: 768,
    reflectionScale: 0.4,
    maxReflectionSize: 768,
    terrainSegments: 84,
    grassCount: 950,
    dustCount: 120,
    petalCount: 48,
    waterSegments: [80, 160],
    projectParticles: 100,
    worldProjectCount: 8,
    labelTextureSize: 384,
    maxFps: 60,
  },
  low: {
    mode: "low",
    maxPixelRatio: 1,
    antialias: false,
    shadows: false,
    shadowMapSize: 512,
    reflectionScale: 0.3,
    maxReflectionSize: 512,
    terrainSegments: 56,
    grassCount: 520,
    dustCount: 64,
    petalCount: 28,
    waterSegments: [56, 112],
    projectParticles: 64,
    worldProjectCount: 6,
    labelTextureSize: 256,
    maxFps: 30,
  },
};

const isQualityMode = (value: string | null): value is QualityMode =>
  value === "high" || value === "medium" || value === "low";

const detectQualityMode = (): QualityMode => {
  const device = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const cores = navigator.hardwareConcurrency || 8;
  const memory = device.deviceMemory;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

  if (
    device.connection?.saveData ||
    cores <= 4 ||
    (memory !== undefined && memory <= 4)
  ) {
    return "low";
  }

  if (
    cores <= 8 ||
    (memory !== undefined && memory <= 8) ||
    (coarsePointer && window.devicePixelRatio > 2)
  ) {
    return "medium";
  }

  return "high";
};

export const getQualitySettings = (): QualitySettings => {
  const queryMode = new URLSearchParams(window.location.search).get("quality");
  const mode = QUALITY_MODE_OVERRIDE ??
    (isQualityMode(queryMode) ? queryMode : detectQualityMode());

  return QUALITY_SETTINGS[mode];
};

export const getQualityPixelRatio = (
  settings: QualitySettings,
): number =>
  Math.min(
    Math.max(1, window.devicePixelRatio || 1),
    settings.maxPixelRatio,
  );
