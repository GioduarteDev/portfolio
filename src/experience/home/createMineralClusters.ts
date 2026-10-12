import * as THREE from "three";
import type { QualitySettings } from "../core/quality";

type Family = "moonstone" | "sapphire" | "amethyst" | "opal";

interface ClusterSpec {
  name: string;
  family: Family;
  position: [number, number, number];
  scale: number;
  crystals: number;
  seed: number;
  // Lower tiers drop secondary clusters; 0 is always kept.
  tier: 0 | 1;
}

// Sparse, asymmetric and kept outside the stair footprint (x > 4.3).
const CLUSTERS: readonly ClusterSpec[] = [
  { name: "left moonstone cluster", family: "moonstone", position: [-5.5, 0.18, -3.4], scale: 1, crystals: 5, seed: 3, tier: 0 },
  { name: "right sapphire cluster", family: "sapphire", position: [5.9, 0.18, -3.9], scale: 0.85, crystals: 4, seed: 11, tier: 0 },
  { name: "left opal accent", family: "opal", position: [-4.7, 0.18, -2.5], scale: 0.4, crystals: 3, seed: 23, tier: 1 },
  { name: "right amethyst accent", family: "amethyst", position: [4.9, 0.18, -2.7], scale: 0.38, crystals: 3, seed: 37, tier: 1 },
  { name: "distant moonstone cluster", family: "moonstone", position: [-8.2, 0.18, -9.5], scale: 1.1, crystals: 3, seed: 51, tier: 1 },
];

function seeded(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function createCrystalGeometry(rand: () => number, height: number, radius: number) {
  const geometry = new THREE.CylinderGeometry(radius * (0.25 + rand() * 0.2), radius, height, 6, 3, false);
  const pos = geometry.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / height + 0.5;
    const wobble = 1 + (rand() - 0.5) * 0.3;
    pos.setX(i, pos.getX(i) * wobble * (1 + t * 0.2));
    pos.setZ(i, pos.getZ(i) * wobble * (1 - t * 0.15));
    // Broken, slanted termination instead of a perfect point.
    if (t > 0.99) pos.setY(i, pos.getY(i) - pos.getX(i) * 0.6 - rand() * height * 0.06);
    pos.setY(i, pos.getY(i) + height / 2);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function createBaseGeometry(rand: () => number, width: number) {
  const geometry = new THREE.IcosahedronGeometry(width, 2);
  const pos = geometry.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = 0.82 + 0.3 * Math.sin(x * 3.1 + z * 2.3) * Math.cos(y * 2.7 + rand() * 0.15);
    pos.setXYZ(i, x * n * 1.25, Math.max(y * n * 0.55, -0.02), z * n);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function createFamilyMaterial(family: Family) {
  switch (family) {
    case "sapphire":
      return new THREE.MeshPhysicalMaterial({
        name: "sapphire", color: "#2F4B8F", roughness: 0.3, clearcoat: 0.45,
        clearcoatRoughness: 0.2, ior: 1.7, sheen: 0.3, sheenColor: new THREE.Color("#A9C4EE"),
        sheenRoughness: 0.4, envMapIntensity: 0.7, emissive: "#1A2C5C", emissiveIntensity: 0.03,
      });
    case "amethyst":
      return new THREE.MeshPhysicalMaterial({
        name: "amethyst", color: "#B9A7DC", roughness: 0.34, clearcoat: 0.3,
        clearcoatRoughness: 0.25, ior: 1.55, sheen: 0.25, sheenColor: new THREE.Color("#E4DAF5"),
        sheenRoughness: 0.5, envMapIntensity: 0.6,
      });
    case "opal":
      return new THREE.MeshPhysicalMaterial({
        name: "opal", color: "#F4EFF0", roughness: 0.4, clearcoat: 0.2, ior: 1.45,
        iridescence: 0.22, iridescenceIOR: 1.3, iridescenceThicknessRange: [300, 600],
        envMapIntensity: 0.5,
      });
    default:
      return new THREE.MeshPhysicalMaterial({
        name: "moonstone", color: "#EEF0FA", roughness: 0.38, clearcoat: 0.3,
        clearcoatRoughness: 0.3, ior: 1.52, iridescence: 0.3, iridescenceIOR: 1.3,
        iridescenceThicknessRange: [200, 420], sheen: 0.4, sheenColor: new THREE.Color("#C8D0F2"),
        sheenRoughness: 0.45, envMapIntensity: 0.6,
      });
  }
}

/** A handful of mineral outcrops. Crystals are milky and opaque-ish (no
 * transmission pass) and emerge from a rough ivory/lavender base. */
export function createMineralClusters(
  quality: QualitySettings,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
): THREE.Group {
  const group = new THREE.Group();
  group.name = "mineral clusters";
  const baseMaterial = new THREE.MeshPhysicalMaterial({
    name: "mineral base", color: "#DAD4DF", roughness: 0.66, clearcoat: 0,
    sheen: 0.1, sheenColor: new THREE.Color("#E9E2F0"), envMapIntensity: 0.4,
  });
  materials.push(baseMaterial);
  const familyMaterials = new Map<Family, THREE.MeshPhysicalMaterial>();

  const maxTier = quality.mode === "low" ? 0 : 1;
  for (const spec of CLUSTERS) {
    if (spec.tier > maxTier) continue;
    if (!familyMaterials.has(spec.family)) {
      const material = createFamilyMaterial(spec.family);
      familyMaterials.set(spec.family, material);
      materials.push(material);
    }
    const material = familyMaterials.get(spec.family)!;
    const rand = seeded(spec.seed);
    const cluster = new THREE.Group();
    cluster.name = spec.name;
    cluster.position.set(...spec.position);
    cluster.rotation.y = rand() * Math.PI * 2;

    const baseGeometry = createBaseGeometry(rand, 0.55 * spec.scale);
    geometries.push(baseGeometry);
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.name = `${spec.name} base`;
    base.castShadow = quality.shadows;
    base.receiveShadow = true;
    cluster.add(base);

    const count = quality.mode === "high" ? spec.crystals : Math.max(2, spec.crystals - 1);
    for (let i = 0; i < count; i++) {
      const height = (0.45 + rand() * 0.75) * spec.scale * (i === 0 ? 1.25 : 1);
      const radius = (0.06 + rand() * 0.07) * spec.scale;
      const geometry = createCrystalGeometry(rand, height, radius);
      geometries.push(geometry);
      const crystal = new THREE.Mesh(geometry, material);
      crystal.name = `${spec.name} crystal ${i}`;
      const angle = rand() * Math.PI * 2;
      const spread = i === 0 ? 0.04 : (0.12 + rand() * 0.3) * spec.scale;
      crystal.position.set(Math.cos(angle) * spread, 0.04 * spec.scale, Math.sin(angle) * spread);
      const lean = (i === 0 ? 0.08 : 0.2 + rand() * 0.35);
      crystal.rotation.set(Math.sin(angle) * lean, rand() * Math.PI, -Math.cos(angle) * lean);
      crystal.castShadow = quality.shadows;
      crystal.receiveShadow = true;
      cluster.add(crystal);
    }
    group.add(cluster);
  }
  return group;
}
