import * as THREE from "three";
import type { QualitySettings } from "../core/quality";
import { createFacadeProjector } from "./sanctuaryGeometry";
import { SANCTUARY_ARCHITECTURE } from "./sanctuaryComposition";
import { ecologyRandom, MINERAL_OUTCROPS, outcropSurface, SANCTUARY_ECOLOGY } from "./sanctuaryEcology";

type Family = "kelp" | "broad" | "tuft" | "hanging";
type LeafInstance = { matrix: THREE.Matrix4; color: THREE.Color; phase: number; frequency: number; amplitude: number };

/** Curved, folded ribbons with tapered tips. Hanging strands include opposite
 * pairs of tiny leaves, all rooted in the same normalized stem. */
function leafGeometry(family: Family) {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const rows = family === "tuft" ? 6 : 14;
  const across = 4;
  const width = family === "broad" ? 0.31 : family === "kelp" ? 0.055 : 0.035;
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    const profile = Math.pow(Math.sin(t * Math.PI), family === "broad" ? 0.75 : 0.9);
    for (let col = 0; col <= across; col++) {
      const u = col / across * 2 - 1;
      positions.push(u * width * profile + Math.sin(t * 3.5) * t * 0.09,
        t, Math.sin(t * Math.PI) * (family === "broad" ? 0.26 : 0.08)
          + t * t * 0.16 + (1 - Math.abs(u)) * profile * 0.035);
      uvs.push(col / across, t);
      if (row < rows && col < across) {
        const a = row * (across + 1) + col, b = a + across + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  }
  if (family === "hanging") {
    for (const y of [0.17, 0.33, 0.50, 0.66, 0.82]) {
      for (const side of [-1, 1]) {
        const first = positions.length / 3;
        positions.push(0.02, y, 0.07, side * 0.10, y + 0.035, 0.08,
          side * 0.18, y + 0.13, 0.05, side * 0.045, y + 0.10, 0.10);
        uvs.push(0.5, 0, 0, 0.45, 0.5, 1, 1, 0.45);
        indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createAquaticVegetation(
  quality: QualitySettings, geometries: THREE.BufferGeometry[], materials: THREE.Material[],
  time: { value: number },
) {
  const group = new THREE.Group();
  group.name = "sanctuary aquatic ecosystem";
  const controls = SANCTUARY_ECOLOGY;
  const density = controls.density[quality.mode];
  const random = ecologyRandom(74219);
  const families: Record<Family, LeafInstance[]> = { kelp: [], broad: [], tuft: [], hanging: [] };
  const palette = ["#83A59E", "#648F8D", "#A3B6A6", "#889EAC", "#9D9EBA"].map((hex) => new THREE.Color(hex));
  const dummy = new THREE.Object3D();
  const addLeaf = (family: Family, root: THREE.Vector3, length: number, yaw: number, lean: number) => {
    dummy.position.copy(root);
    dummy.rotation.set(lean, yaw, family === "hanging" ? Math.PI : (random() - 0.5) * 0.18);
    dummy.scale.setScalar(length);
    dummy.updateMatrix();
    const amplitude = family === "kelp" ? controls.motion.longAmplitude : family === "broad"
      ? controls.motion.broadAmplitude : family === "tuft" ? controls.motion.tuftAmplitude : controls.motion.hangingAmplitude;
    families[family].push({ matrix: dummy.matrix.clone(), color: palette[Math.floor(random() * palette.length)].clone(),
      phase: random() * Math.PI * 2, frequency: controls.motion.speed * (0.65 + random() * 0.65),
      amplitude: amplitude * (0.75 + random() * 0.5) });
  };

  for (const [index, outcrop] of MINERAL_OUTCROPS.entries()) {
    const foreground = index === 4 || index === 5;
    const distanceScale = foreground ? controls.plants.foreground : index === 2 || index === 3
      ? controls.plants.distant : controls.plants.midground;
    const richness = distanceScale * density * (index % 2 ? 0.88 : 1.1);
    for (const family of ["kelp", "broad", "tuft"] as const) {
      const count = Math.round((family === "kelp" ? controls.plants.longLeaves
        : family === "broad" ? controls.plants.broadLeaves : controls.plants.tufts) * richness);
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2;
        const radius = 0.35 + random() * 0.45;
        // The inner/front flanks remain readable beside the dominant crystals.
        const x = Math.cos(angle) * outcrop.scale[0] * radius;
        const z = Math.sin(angle) * outcrop.scale[2] * radius;
        const root = outcropSurface(outcrop, x, z);
        const length = (family === "kelp" ? 0.85 + random() * 1.1 : family === "broad"
          ? 0.75 + random() * 0.75 : 0.12 + random() * 0.28)
          * (foreground ? 1 : index > 5 ? 0.55 : index > 1 ? 0.68 : 0.95);
        addLeaf(family, root, length, angle + outcrop.turn,
          family === "broad" ? 0.45 + random() * 0.85 : 0.1 + random() * 0.4);
      }
    }
  }

  const stairs = SANCTUARY_ARCHITECTURE.steps;
  for (const side of [-1, 1]) {
    for (const step of [1, 5, 9, 12]) {
      const width = stairs.halfWidth - step * stairs.taper;
      for (let i = 0; i < Math.round(15 * density * controls.plants.stairEdges); i++) {
        const root = new THREE.Vector3(side * (width - 0.09 - random() * 0.13),
          stairs.baseHeight + step * stairs.rise - 0.018,
          stairs.front - step * stairs.run - 0.08 - random() * 0.3);
        addLeaf(i % 4 ? "tuft" : "broad", root, 0.12 + random() * 0.24,
          side * Math.PI / 2 + random() * 0.5, 0.3 + random() * 0.5);
      }
    }
  }

  const project = createFacadeProjector();
  for (const [u, v, z, length] of [[0.07, 0.17, 1.2, 1.25], [0.18, 0.155, -1.2, 1.0],
    [0.92, 0.16, 1.2, 1.45]]) {
    const anchor = project(u, v, z);
    for (let i = 0; i < Math.round(controls.plants.hangingLeaves * density); i++) {
      const root = anchor.clone().add(new THREE.Vector3((random() - 0.5) * 0.7, random() * 0.1, random() * 0.3));
      addLeaf("hanging", root, length * (0.4 + random() * 0.7), random() * Math.PI * 2, random() * 0.15);
    }
  }

  const material = new THREE.MeshPhysicalMaterial({
    name: "sage teal aquatic foliage", color: "#E0EAE7", roughness: 0.58,
    side: THREE.DoubleSide, sheen: 0.2, sheenRoughness: 0.7, sheenColor: new THREE.Color("#CADCE0"),
    emissive: "#93B5AB", emissiveIntensity: 0.18, envMapIntensity: 0.5,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uEcologyTime = time;
    shader.vertexShader = `uniform float uEcologyTime;
      attribute vec3 aGrowthMotion;
      varying vec2 vBotanicalUv;
      varying vec3 vBotanicalWorld;
      ${shader.vertexShader}`.replace("#include <begin_vertex>", `#include <begin_vertex>
        vBotanicalUv = uv;
        float rooted = pow(clamp(position.y, 0.0, 1.0), 2.0);
        float current = uEcologyTime * aGrowthMotion.y + aGrowthMotion.x;
        transformed.x += sin(current + position.y * 1.7) * rooted * aGrowthMotion.z;
        transformed.z += cos(current * 0.73 + position.y) * rooted * aGrowthMotion.z * 0.65;`)
      .replace("#include <project_vertex>", `#include <project_vertex>
        vBotanicalWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = `varying vec2 vBotanicalUv; varying vec3 vBotanicalWorld;
      uniform float uEcologyTime;\n${shader.fragmentShader}`
      .replace("#include <color_fragment>", `#include <color_fragment>
        float leafVein = exp(-abs(vBotanicalUv.x - 0.5) * 80.0);
        float leafRib = pow(max(0.0, cos(vBotanicalUv.y * 38.0
          - abs(vBotanicalUv.x - 0.5) * 13.0)), 18.0);
        diffuseColor.rgb *= 0.82 + vBotanicalUv.y * 0.18;
        diffuseColor.rgb += vec3(0.045, 0.06, 0.05) * (leafVein + leafRib * 0.18);
        float botanicalCaustic = pow(max(0.0, 1.0 - abs(sin(vBotanicalWorld.x * 2.0
          + sin(vBotanicalWorld.z + uEcologyTime * 0.12))
          + cos(vBotanicalWorld.z * 1.4 - uEcologyTime * 0.10)) * 0.65), 9.0);
        diffuseColor.rgb += vec3(0.025, 0.045, 0.05) * botanicalCaustic
          * (1.0 - smoothstep(0.25, 1.25, vBotanicalWorld.y));`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * (gl_FrontFacing ? 0.025 : 0.10);`);
  };
  material.customProgramCacheKey = () => "rooted-aquatic-vegetation-v1";
  materials.push(material);
  for (const family of Object.keys(families) as Family[]) {
    const instances = families[family];
    const geometry = leafGeometry(family);
    geometry.setAttribute("aGrowthMotion", new THREE.InstancedBufferAttribute(
      new Float32Array(instances.flatMap((leaf) => [leaf.phase, leaf.frequency, leaf.amplitude])), 3));
    geometries.push(geometry);
    const mesh = new THREE.InstancedMesh(geometry, material, instances.length);
    mesh.name = `${family} rooted plant colonies`;
    instances.forEach((leaf, i) => { mesh.setMatrixAt(i, leaf.matrix); mesh.setColorAt(i, leaf.color); });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    if (mesh.boundingSphere) mesh.boundingSphere.radius += 0.45;
    // Fine foliage receives light/shadow but avoids an extra animated shadow pass.
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}
