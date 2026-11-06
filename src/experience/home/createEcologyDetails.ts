import * as THREE from "three";
import type { QualitySettings } from "../core/quality";
import { SANCTUARY_ARCHITECTURE } from "./sanctuaryComposition";
import { ecologyRandom, MINERAL_OUTCROPS, outcropSurface, SANCTUARY_ECOLOGY } from "./sanctuaryEcology";

/** Sediment collects against roots and along tread edges, never across the
 * processional axis. Two shared instance batches keep small detail inexpensive. */
export function createEcologyDetails(
  quality: QualitySettings, geometries: THREE.BufferGeometry[], materials: THREE.Material[],
) {
  const group = new THREE.Group();
  group.name = "centuries of tidal deposits and discoveries";
  const random = ecologyRandom(81937);
  const density = SANCTUARY_ECOLOGY.density[quality.mode];
  const dummy = new THREE.Object3D();
  const pebbles: THREE.Matrix4[] = [], deposits: THREE.Matrix4[] = [];
  const record = (target: THREE.Matrix4[], position: THREE.Vector3, x: number, y: number, z: number) => {
    dummy.position.copy(position);
    dummy.rotation.set(0, random() * Math.PI * 2, (random() - 0.5) * 0.12);
    dummy.scale.set(x, y, z);
    dummy.updateMatrix();
    target.push(dummy.matrix.clone());
  };
  for (const outcrop of MINERAL_OUTCROPS) {
    for (let i = 0; i < Math.round(SANCTUARY_ECOLOGY.sediment.pebblesPerBed * density); i++) {
      const angle = random() * Math.PI * 2, spread = 0.4 + random() * 0.45;
      const point = outcropSurface(outcrop, Math.cos(angle) * outcrop.scale[0] * spread,
        Math.sin(angle) * outcrop.scale[2] * spread);
      const size = 0.055 + random() ** 2 * 0.22;
      record(pebbles, point, size * 1.4, size * 0.55, size);
    }
    for (let i = 0; i < Math.round(SANCTUARY_ECOLOGY.sediment.patchesPerBed * density); i++) {
      const x = (random() - 0.5) * outcrop.scale[0] * 1.2;
      const z = (random() - 0.5) * outcrop.scale[2] * 1.1;
      const point = outcropSurface(outcrop, x, z).add(new THREE.Vector3(0, 0.018, 0));
      record(deposits, point, 0.22 + random() * 0.38, 0.018, 0.17 + random() * 0.32);
    }
  }
  const stairs = SANCTUARY_ARCHITECTURE.steps;
  for (const side of [-1, 1]) {
    for (let step = 0; step < stairs.count - 1; step += 2) {
      if (random() < 0.24) continue;
      const width = stairs.halfWidth - step * stairs.taper;
      const top = stairs.baseHeight + step * stairs.rise;
      for (let i = 0; i < Math.round(SANCTUARY_ECOLOGY.sediment.stairPebbles * density); i++) {
        const point = new THREE.Vector3(side * (width - 0.06 - random() * 0.25), top + 0.018,
          stairs.front - step * stairs.run - 0.08 - random() * 0.30);
        const size = 0.025 + random() * 0.055;
        record(pebbles, point, size, size * 0.4, size * 1.2);
        if (i === 0) record(deposits, point, 0.08 + random() * 0.08, 0.005, 0.09 + random() * 0.09);
      }
    }
  }
  const pebbleGeometry = new THREE.IcosahedronGeometry(1, 1);
  const sedimentGeometry = new THREE.IcosahedronGeometry(1, 2);
  const pebbleMaterial = new THREE.MeshPhysicalMaterial({
    name: "tidal aggregate and mineral fragments", color: "#B5C5CD", roughness: 0.40,
    clearcoat: 0.18, clearcoatRoughness: 0.25, envMapIntensity: 0.55,
  });
  const sedimentMaterial = new THREE.MeshStandardMaterial({
    name: "pale silt and mineral patina", color: "#D2CEBF", roughness: 0.95,
    emissive: "#B5B8A5", emissiveIntensity: 0.055,
  });
  geometries.push(pebbleGeometry, sedimentGeometry);
  materials.push(pebbleMaterial, sedimentMaterial);
  const batch = (name: string, matrices: THREE.Matrix4[], geometry: THREE.BufferGeometry, material: THREE.Material) => {
    const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
    mesh.name = name;
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  };
  batch("water sorted pebble accumulations", pebbles, pebbleGeometry, pebbleMaterial);
  batch("silt caught in mineral pockets and tread edges", deposits, sedimentGeometry, sedimentMaterial);

  // A partly buried piece of worked stone hints at a history beyond the intact
  // ceremonial flight. Its marks are worn cuts in the stone, not bright signage.
  const fragment = new THREE.Group();
  fragment.name = "half buried fragment of an older ceremonial pavement";
  fragment.position.copy(outcropSurface(MINERAL_OUTCROPS[0], 1.05, 0.5));
  fragment.rotation.set(0.12, -0.3, -0.10);
  const slabGeometry = new THREE.BoxGeometry(0.85, 0.12, 0.52);
  const cutGeometry = new THREE.BoxGeometry(0.32, 0.003, 0.008);
  const cutMaterial = new THREE.MeshStandardMaterial({ color: "#788D98", roughness: 0.8 });
  geometries.push(slabGeometry, cutGeometry);
  materials.push(cutMaterial);
  fragment.add(new THREE.Mesh(slabGeometry, pebbleMaterial));
  for (let i = 0; i < 3; i++) {
    const cut = new THREE.Mesh(cutGeometry, cutMaterial);
    cut.position.set(-0.06 + i * 0.07, 0.062, (i - 1) * 0.09);
    cut.rotation.y = i === 1 ? -0.4 : 0.4;
    fragment.add(cut);
  }
  group.add(fragment);
  return group;
}
