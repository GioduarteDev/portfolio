import * as THREE from "three";
import type { QualitySettings } from "../core/quality";
import { ecologyRandom, MINERAL_OUTCROPS, outcropSurface, SANCTUARY_ECOLOGY } from "./sanctuaryEcology";
import { SANCTUARY_ARCHITECTURE } from "./sanctuaryComposition";

const PALETTES = [
  { name: "moonstone", color: "#E5EDF7", glow: "#D2E6EF", roughness: 0.26, transmission: 0.16, iridescence: 0.16 },
  { name: "opal", color: "#E9E2F5", glow: "#D6CFE9", roughness: 0.20, transmission: 0.25, iridescence: 0.34 },
  { name: "deep sapphire", color: "#829FBD", glow: "#9EBFD8", roughness: 0.18, transmission: 0.30, iridescence: 0.08 },
  { name: "glacial cyan", color: "#D0EDF2", glow: "#BFDFE8", roughness: 0.22, transmission: 0.32, iridescence: 0.18 },
] as const;
/** A clean six-sided prism with a true faceted termination, rooted at y=0. */
function createCrystalGeometry() {
  const positions: number[] = [];
  const indices: number[] = [];
  for (const [height, radius] of [[0, 0.85], [0.78, 1], [0.86, 0.88]]) {
    for (let side = 0; side < 6; side++) {
      const angle = side * Math.PI / 3;
      positions.push(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    }
  }
  positions.push(0.12, 1, -0.08);
  for (let ring = 0; ring < 2; ring++) {
    for (let side = 0; side < 6; side++) {
      const a = ring * 6 + side, b = ring * 6 + (side + 1) % 6;
      indices.push(a, a + 6, b, b, a + 6, b + 6);
    }
  }
  for (let side = 0; side < 6; side++) {
    indices.push(12 + side, 18, 12 + (side + 1) % 6);
    if (side > 0 && side < 5) indices.push(0, side, side + 1);
  }
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  indexed.setIndex(indices);
  const geometry = indexed.toNonIndexed();
  indexed.dispose();
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Complete mineral colonies, with shared facets and four shell batches.
 * Every root and fallen shard samples its host stone; only highlights receive cores. */
export function createMineralClusters(
  quality: QualitySettings,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
): THREE.Group {
  const group = new THREE.Group();
  group.name = "living sanctuary crystals";
  const geometry = createCrystalGeometry();
  geometries.push(geometry);
  const density = SANCTUARY_ECOLOGY.density[quality.mode];
  const controls = SANCTUARY_ECOLOGY.crystals;
  const shells: THREE.Matrix4[][] = PALETTES.map(() => []);
  const hearts: THREE.Matrix4[][] = PALETTES.map(() => []);
  const dummy = new THREE.Object3D();
  const coreTransform = new THREE.Matrix4().compose(new THREE.Vector3(0, 0.06, 0),
    new THREE.Quaternion(), new THREE.Vector3(0.3, 0.78, 0.3));

  MINERAL_OUTCROPS.forEach((outcrop, index) => {
    const random = ecologyRandom(1829 + index * 173);
    const medium = Math.max(2, Math.round(controls.medium * density));
    const small = Math.max(4, Math.round(controls.small * density));
    const fragments = Math.max(3, Math.round(controls.fragments * density));
    const scale = index < 2 ? 1 : index < 4 ? 0.68 : index < 6 ? 0.66 : 0.30;
    const innerFlank = index === 4 || index === 5 ? -Math.sign(outcrop.position[0]) * outcrop.scale[0] * 0.62 : 0;
    const anchor = new THREE.Object3D();
    anchor.name = `${outcrop.name} crystal garden`;
    anchor.position.copy(outcropSurface(outcrop, innerFlank, 0));
    group.add(anchor);
    for (let i = 0; i < 1 + medium + small + fragments; i++) {
      const hero = i === 0;
      const secondary = i > 0 && i <= medium;
      const fallen = i > medium + small;
      const angle = random() * Math.PI * 2;
      const spread = hero ? 0.04 : secondary ? 0.25 + random() * 0.20 : 0.42 + random() * 0.32;
      const x = innerFlank + Math.cos(angle) * spread * scale;
      const z = Math.sin(angle) * spread * scale;
      dummy.position.copy(outcropSurface(outcrop, x, z));
      const height = (hero ? controls.dominantHeight : secondary ? 0.65 + random() * 0.5
        : fallen ? 0.13 + random() * 0.28 : 0.18 + random() * 0.28) * scale;
      const radius = (hero ? 0.22 : secondary ? 0.11 + random() * 0.04 : 0.04 + random() * 0.04) * scale;
      const lean = hero ? 0.07 : fallen ? 1.05 + random() * 0.35 : 0.12 + random() * 0.35;
      dummy.rotation.set(Math.cos(angle) * lean, random() * Math.PI, Math.sin(angle) * lean);
      dummy.scale.set(radius, height, radius);
      dummy.updateMatrix();
      const choice = random();
      const family = hero ? (index === 1 || index === 5 ? 1 : 0)
        : choice < 0.68 ? 0 : choice < 0.87 ? 1 : choice < 0.94 ? 3 : 2;
      shells[family].push(dummy.matrix.clone());
      if ((hero || secondary) && quality.mode !== "low") {
        hearts[family].push(dummy.matrix.clone().multiply(coreTransform));
      }
    }
  });
  const stairs = SANCTUARY_ARCHITECTURE.steps;
  for (const side of [-1, 1]) {
    for (const step of [2, 8, 11]) {
      dummy.position.set(side * (stairs.halfWidth - step * stairs.taper - 0.08),
        stairs.baseHeight + step * stairs.rise + 0.012, stairs.front - step * stairs.run - 0.12);
      dummy.rotation.set(0.2, step, side * 0.22);
      dummy.scale.set(0.035, 0.12 + step * 0.004, 0.035);
      dummy.updateMatrix();
      shells[0].push(dummy.matrix.clone());
    }
  }

  PALETTES.forEach((palette, index) => {
    const shellMaterial = new THREE.MeshPhysicalMaterial({
      name: `${palette.name} crystal shell`, color: palette.color,
      roughness: palette.roughness, clearcoat: 0.5, clearcoatRoughness: 0.18,
      transmission: quality.mode === "low" ? 0 : palette.transmission,
      thickness: 0.4, ior: 1.46, attenuationDistance: 2.5,
      attenuationColor: new THREE.Color(palette.color),
      iridescence: palette.iridescence, iridescenceIOR: 1.3, iridescenceThicknessRange: [180, 380],
      envMapIntensity: 0.65, emissive: palette.glow, emissiveIntensity: 0.20,
    });
    materials.push(shellMaterial);
    const batch = (matrices: THREE.Matrix4[], material: THREE.Material, name: string) => {
      const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
      mesh.name = name;
      matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.receiveShadow = true;
      mesh.castShadow = quality.shadows && material === shellMaterial;
      mesh.computeBoundingSphere();
      group.add(mesh);
    };
    batch(shells[index], shellMaterial, `${palette.name} rooted colonies and mineral fragments`);
    if (hearts[index].length) {
      const heartMaterial = new THREE.MeshStandardMaterial({
        name: `${palette.name} luminous heart`, color: palette.glow,
        emissive: palette.glow, emissiveIntensity: 0.5, roughness: 0.4,
      });
      materials.push(heartMaterial);
      batch(hearts[index], heartMaterial, `${palette.name} quiet inner radiance`);
    }
  });
  return group;
}
