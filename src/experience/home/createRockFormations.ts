import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import type { QualitySettings } from "../core/quality";
import { addSubtleCaustics } from "./createCaustics";

import { MINERAL_OUTCROPS, rockErosion, rockShelf, SANCTUARY_ECOLOGY } from "./sanctuaryEcology";

export function createRockFormations(
  quality: QualitySettings,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  time: { value: number },
) {
  const group = new THREE.Group();
  group.name = "water-carved cavern foundations";
  const stone = new THREE.MeshPhysicalMaterial({
    name: "water polished blue moonstone", color: "#DCE2E5", roughness: 0.64,
    clearcoat: 0.24, clearcoatRoughness: 0.16, iridescence: 0.08,
    sheen: 0.16, sheenColor: new THREE.Color("#E2DCEF"),
    envMapIntensity: 0.55, vertexColors: true,
    emissive: "#D4DEEB", emissiveIntensity: 0.035,
  });
  addSubtleCaustics(stone, time, quality.mode === "low" ? 0 : 0.085);
  const previousCompile = stone.onBeforeCompile;
  const previousKey = stone.customProgramCacheKey();
  stone.onBeforeCompile = (shader, renderer) => {
    previousCompile.call(stone, shader, renderer);
    shader.vertexShader = `varying vec3 vWetStone;\n${shader.vertexShader}`
      .replace("#include <project_vertex>", `#include <project_vertex>
        vWetStone = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = `varying vec3 vWetStone;\n${shader.fragmentShader}`
      .replace("#include <color_fragment>", `#include <color_fragment>
        float wetEdge = 1.0 - smoothstep(${SANCTUARY_ECOLOGY.wetStone.waterline.toFixed(2)},
          ${SANCTUARY_ECOLOGY.wetStone.dryHeight.toFixed(2)}, vWetStone.y);
        float mineralFault = pow(1.0 - abs(sin(vWetStone.x * 2.7 + vWetStone.z * 1.6
          + sin(vWetStone.y * 5.0))), 22.0);
        diffuseColor.rgb *= mix(vec3(1.0), vec3(0.58, 0.70, 0.77), wetEdge);
        diffuseColor.rgb *= 1.0 - mineralFault * 0.14;`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, ${SANCTUARY_ECOLOGY.wetStone.roughness.toFixed(2)}, wetEdge);`)
      .replace("#include <lights_physical_fragment>", `#include <lights_physical_fragment>
        material.clearcoat *= wetEdge;`);
  };
  stone.customProgramCacheKey = () => `${previousKey}-wet-mineral-ecology`;
  materials.push(stone);
  const source = new THREE.IcosahedronGeometry(1, quality.mode === "low" ? 2 : 3);
  // Weld duplicated triangle vertices before deformation for continuous smooth normals.
  source.deleteAttribute("normal");
  source.deleteAttribute("uv");
  const geometry = mergeVertices(source);
  source.dispose();
  const positions = geometry.getAttribute("position");
  const colors: number[] = [];
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const erosion = rockErosion(x, y, z);
    const shelf = rockShelf(x, y, z);
    positions.setXYZ(i, x * erosion, shelf * erosion, z * erosion);
    const band = 0.91 + 0.065 * Math.sin(y * 17 + x * 1.5 + z * 2);
    colors.push(band * 0.96, band * 0.985, band);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometries.push(geometry);

  for (const spec of MINERAL_OUTCROPS) {
    const formation = new THREE.Group();
    formation.name = spec.name;
    formation.position.set(spec.position[0], spec.position[1], spec.position[2]);
    formation.rotation.y = spec.turn;
    group.add(formation);
    const rock = new THREE.Mesh(geometry, stone);
    rock.name = `${spec.name} bedrock`;
    rock.scale.set(spec.scale[0], spec.scale[1], spec.scale[2]);
    rock.castShadow = quality.shadows;
    rock.receiveShadow = true;
    formation.add(rock);
    // Low overlapping water-worn ledges tie the boulder into the submerged basin.
    for (let i = 0; i < 2; i++) {
      const ledge = new THREE.Mesh(geometry, stone);
      ledge.name = `${spec.name} eroded ledge ${i + 1}`;
      ledge.scale.set(spec.scale[0] * 0.66, spec.scale[1] * (0.3 + i * 0.1), spec.scale[2] * 0.7);
      ledge.position.set((i ? -1 : 1) * 0.85, -0.03, 0.7 + i * 0.5);
      ledge.rotation.y = i * 0.8;
      ledge.castShadow = quality.shadows;
      ledge.receiveShadow = true;
      formation.add(ledge);
    }
  }
  return group;
}
