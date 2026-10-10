import * as THREE from "three";
import type { QualitySettings } from "../core/quality";
import { seededRandom } from "./sanctuaryMaterials";

/** Closed, irregular prisms with a faceted crown, never emissive. */
export function createCrystalCluster(
  quality: QualitySettings, material: THREE.MeshPhysicalMaterial,
  seed: number, scale: number, geometries: THREE.BufferGeometry[],
) {
  const random = seededRandom(seed);
  const group = new THREE.Group();
  group.name = `${material.name} cluster`;
  const count = quality.mode === "low" ? 3 : 5;
  for (let crystal = 0; crystal < count; crystal++) {
    const sides = 5 + Math.floor(random() * 3);
    const radius = (0.2 + random() * 0.15) * scale;
    const height = (0.85 + random() * 1.55) * scale;
    const crown = height * (0.72 + random() * 0.1);
    const ring = Array.from({ length: sides }, (_, i) => {
      const angle = i * Math.PI * 2 / sides;
      const width = radius * (0.85 + random() * 0.25);
      return new THREE.Vector3(Math.cos(angle) * width, 0, Math.sin(angle) * width);
    });
    const vertices: number[] = [];
    const triangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) =>
      vertices.push(...a.toArray(), ...b.toArray(), ...c.toArray());
    const tip = new THREE.Vector3(radius * 0.2, height, -radius * 0.15);
    for (let side = 0; side < sides; side++) {
      const a = ring[side], b = ring[(side + 1) % sides];
      const at = a.clone().setY(crown), bt = b.clone().setY(crown);
      triangle(a, at, b);
      triangle(b, at, bt);
      triangle(at, tip, bt);
      triangle(new THREE.Vector3(), a, b);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set((random() - 0.5) * 1.2 * scale, 0, (random() - 0.5) * scale);
    mesh.rotation.set((random() - 0.5) * 0.22, random() * Math.PI, (random() - 0.5) * 0.32);
    mesh.castShadow = quality.shadows;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}
