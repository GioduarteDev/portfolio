import * as THREE from "three";
import type { QualityMode } from "../core/quality";

/** Shared art controls. All randomness is seeded so captures and quality tiers
 * retain the same ecological landmarks and a clear central processional axis. */
export const SANCTUARY_ECOLOGY = {
  density: { high: 1, medium: 0.78, low: 0.55 } satisfies Record<QualityMode, number>,
  plants: { foreground: 1.25, midground: 1, distant: 0.5, stairEdges: 0.65,
    longLeaves: 15, broadLeaves: 13, tufts: 25, hangingLeaves: 16 },
  motion: { speed: 0.16, longAmplitude: 0.09, broadAmplitude: 0.035,
    tuftAmplitude: 0.008, hangingAmplitude: 0.065 },
  crystals: { medium: 3, small: 8, fragments: 6, dominantHeight: 1.65 },
  sediment: { pebblesPerBed: 11, patchesPerBed: 5, stairPebbles: 5 },
  wetStone: { waterline: 0.16, dryHeight: 0.62, roughness: 0.22 },
} as const;

export function ecologyRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export const MINERAL_OUTCROPS = [
  { name: "left tidal foundation", position: [-5.6, -0.35, -2.3], scale: [2.0, 1.35, 2.6], turn: 0.3 },
  { name: "right tidal foundation", position: [5.8, -0.38, -2.9], scale: [2.15, 1.5, 2.8], turn: -0.25 },
  { name: "left apse shelf", position: [-5.1, -0.26, -8.4], scale: [1.5, 1.1, 2.5], turn: 0.15 },
  { name: "right apse shelf", position: [5.2, -0.3, -9.1], scale: [1.6, 1.3, 2.3], turn: -0.15 },
  { name: "left foreground shoal", position: [-4.75, -0.45, 2.5], scale: [2.1, 1.5, 2.1], turn: 0.45 },
  { name: "right foreground shoal", position: [5.05, -0.5, 2.1], scale: [2.2, 1.45, 2.3], turn: -0.5 },
  { name: "left stair mineral island", position: [-4.25, -0.22, -5.6], scale: [0.82, 0.85, 1.2], turn: 0.15 },
  { name: "right stair mineral island", position: [4.4, -0.24, -5.9], scale: [0.9, 0.88, 1.3], turn: -0.28 },
] as const;

export type Outcrop = typeof MINERAL_OUTCROPS[number];

export function rockErosion(x: number, y: number, z: number) {
  return 1 + 0.10 * Math.sin(x * 4 + z * 2) * Math.cos(y * 3 - z)
    + 0.045 * Math.sin(z * 8 + x * 3 + y * 5);
}

export function rockShelf(x: number, y: number, z: number) {
  return Math.sign(y) * Math.pow(Math.abs(y), 0.72) * 0.74
    + Math.sin(y * 13 + x * 2 + z) * 0.05;
}

/** Root on the water-eroded upper surface, slightly embedded in the stone.
 * x/z are local bed coordinates, shared by plants, mineral shards and sediment. */
export function outcropSurface(spec: Outcrop, x: number, z: number, target = new THREE.Vector3()) {
  const normalizedX = x / spec.scale[0], normalizedZ = z / spec.scale[2];
  let sx = normalizedX, sz = normalizedZ;
  // Invert the same spatial erosion used to build the stone, rather than placing
  // plants on a generic ellipsoid that can bury leaves or suspend sediment.
  for (let i = 0; i < 6; i++) {
    const sy = Math.sqrt(Math.max(0, 1 - sx * sx - sz * sz));
    const erosion = rockErosion(sx, sy, sz);
    sx = normalizedX / erosion;
    sz = normalizedZ / erosion;
  }
  const sy = Math.sqrt(Math.max(0, 1 - sx * sx - sz * sz));
  const height = rockShelf(sx, sy, sz) * rockErosion(sx, sy, sz) * spec.scale[1] - 0.025;
  const c = Math.cos(spec.turn), s = Math.sin(spec.turn);
  return target.set(spec.position[0] + x * c + z * s, spec.position[1] + height,
    spec.position[2] - x * s + z * c);
}
