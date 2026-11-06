import * as THREE from "three";
import type { QualitySettings } from "../core/quality";
import { addSubtleCaustics } from "./createCaustics";
import { createMineralClusters } from "./createMineralClusters";
import { createCeremonialSteps } from "./createCeremonialSteps";
import { createRockFormations } from "./createRockFormations";
import { createCavernEnvelope } from "./createCavernEnvelope";
import { createSanctuaryPlatforms } from "./createSanctuaryPlatforms";
import { createAquaticVegetation } from "./createAquaticVegetation";
import { createEcologyDetails } from "./createEcologyDetails";
import { createShellThread } from "../dive/createShellThread";
import { createFacadeProjector, createSculptedPanel } from "./sanctuaryGeometry";
import { SANCTUARY_ARCHITECTURE, SANCTUARY_PANELS, SANCTUARY_STAGING, type FacadeLandmark } from "./sanctuaryComposition";

/** HomeScene owns and disposes every resource registered here. */
export function createShellArchitecture(
  quality: QualitySettings,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  time: { value: number },
): THREE.Group {
  const sanctuary = new THREE.Group();
  sanctuary.name = "sanctuary";
  const architecture = new THREE.Group();
  architecture.name = "architecture";
  sanctuary.add(architecture);
  architecture.scale.setScalar(SANCTUARY_ARCHITECTURE.scale);
  architecture.position.set(...SANCTUARY_ARCHITECTURE.position);
  architecture.add(createCavernEnvelope(quality, geometries, materials));
  const segments = quality.mode === "high" ? 80 : quality.mode === "medium" ? 56 : 32;
  const project = createFacadeProjector();
  const pearl = new THREE.MeshPhysicalMaterial({
    name: "carved ivory pearl", color: "#F5EFEB", roughness: 0.46,
    metalness: 0, clearcoat: 0.035, clearcoatRoughness: 0.36,
    ior: 1.45, iridescence: 0.06, iridescenceIOR: 1.25, iridescenceThicknessRange: [180, 360],
    sheen: 0.1, sheenRoughness: 0.55, sheenColor: new THREE.Color("#E9E2F0"),
    envMapIntensity: 0.5, vertexColors: true,
    emissive: "#FFEBDD", emissiveIntensity: 0.08,
  });
  const seamMaterial = new THREE.MeshStandardMaterial({
    name: "recessed dawn light", color: "#FFF0DC", emissive: "#FFE4C4",
    emissiveIntensity: SANCTUARY_ARCHITECTURE.lightIntensity, roughness: 0.5, toneMapped: true,
  });
  const stairStone = pearl.clone();
  stairStone.name = "honed ceremonial stair stone";
  stairStone.vertexColors = false;
  stairStone.roughness = 0.47;
  stairStone.clearcoat = 0.02;
  stairStone.iridescence = 0.02;
  stairStone.emissiveIntensity = 0.05;
  const recess = pearl.clone();
  recess.name = "cool stone chamber reveals";
  recess.color.set("#B8B8CF");
  recess.roughness = 0.62;
  recess.emissiveIntensity = 0.025;
  materials.push(pearl, stairStone, seamMaterial, recess);
  addSubtleCaustics(pearl, time, quality.mode === "low" ? 0 : 0.025);
  addSubtleCaustics(stairStone, time, quality.mode === "low" ? 0 : 0.06);
  for (const material of [pearl, stairStone, seamMaterial, recess]) {
    const previousCompile = material.onBeforeCompile;
    const previousKey = material.customProgramCacheKey();
    material.onBeforeCompile = (shader, renderer) => {
      previousCompile.call(material, shader, renderer);
      shader.vertexShader = `varying vec3 vSanctuaryPosition;\n${shader.vertexShader}`
        .replace("#include <project_vertex>", `#include <project_vertex>
          vSanctuaryPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
      shader.fragmentShader = `varying vec3 vSanctuaryPosition;\n${shader.fragmentShader}`
        .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
          ${material === stairStone ? "" : "if (vSanctuaryPosition.y < 0.16) discard;"}`);
      if (material instanceof THREE.MeshPhysicalMaterial && quality.mode !== "low") {
        const strength = 0.04;
        shader.fragmentShader = `
          float sanctuaryMineralHash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
          }
          float sanctuaryMineralNoise(vec2 p) {
            vec2 cell = floor(p), f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(sanctuaryMineralHash(cell),
              sanctuaryMineralHash(cell + vec2(1.0, 0.0)), u.x),
              mix(sanctuaryMineralHash(cell + vec2(0.0, 1.0)),
              sanctuaryMineralHash(cell + vec2(1.0)), u.x), u.y);
          }
          ${shader.fragmentShader}`;
        shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>",
          `#include <color_fragment>
          // Broad, ton-sur-ton veins that flow mostly vertically with the shells.
          vec2 mineralP = vec2(vSanctuaryPosition.x * 0.16 + vSanctuaryPosition.z * 0.1,
            vSanctuaryPosition.y * 0.34);
          float mineralWarp = sanctuaryMineralNoise(mineralP * 1.4) * 2.2
            + sanctuaryMineralNoise(mineralP * 3.1) * 0.5;
          float mineralField = mineralP.x * 1.8 + mineralP.y * 0.35 + mineralWarp;
          float mineralVein = 1.0 - smoothstep(0.02, 0.16, abs(sin(mineralField * 2.4)));
          mineralVein *= smoothstep(0.35, 0.8, sanctuaryMineralNoise(mineralP * 1.1 + 7.0));
          float warmZone = sanctuaryMineralNoise(mineralP * 0.55 + 3.0);
          vec3 veinTint = vec3(0.885, 0.87, 0.915);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * veinTint, mineralVein * ${(strength * 5.0).toFixed(3)});
          diffuseColor.rgb *= mix(vec3(0.985, 0.975, 1.0), vec3(1.0, 0.985, 0.97), warmZone);`);
        shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>",
          `#include <roughnessmap_fragment>
          roughnessFactor += (sanctuaryMineralNoise(mineralP * 0.8) - 0.5) * 0.1
            + (sanctuaryMineralNoise(vSanctuaryPosition.xy * 2.3 + vSanctuaryPosition.z) - 0.5) * 0.05;
          roughnessFactor = clamp(roughnessFactor, 0.2, 0.85);`);
        shader.fragmentShader = shader.fragmentShader.replace("#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
          float pearlFresnel = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);
          totalEmissiveRadiance += vec3(0.93, 0.92, 1.0) * pearlFresnel * 0.03;`);
      }
    };
    material.customProgramCacheKey = () =>
      `${previousKey}-sanctuary-waterline-${quality.mode}-${material.name}`;
  }

  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, name: string,
    group: THREE.Group = architecture) => {
    if (material instanceof THREE.MeshPhysicalMaterial && material.vertexColors) {
      const positions = geometry.getAttribute("position");
      const normals = geometry.getAttribute("normal");
      const colors: number[] = [];
      const cool = new THREE.Color("#AEBBD7"), warm = new THREE.Color("#FFF0E0");
      const tint = new THREE.Color();
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
        const facing = Math.max(0, normals.getZ(i));
        const light = THREE.MathUtils.clamp(0.32 + facing * 0.53 - z * 0.004
          + Math.sin(y * 0.8 + x * 0.2) * 0.06, 0.18, 0.96);
        tint.copy(cool).lerp(warm, light);
        const stratum = 0.975 + Math.sin(y * 2.6 + Math.sin(x * 0.5) + z * 0.3) * 0.025;
        tint.multiplyScalar(stratum * (normals.getZ(i) < -0.2 ? 0.68 : 1));
        colors.push(tint.r, tint.g, tint.b);
      }
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    }
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = quality.shadows;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const addLightLine = (points: THREE.Vector3[], name: string, radius: number = SANCTUARY_ARCHITECTURE.lightRadius) => {
    const mesh = add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),
      Math.min(segments, points.length * 2), radius, 6, false), seamMaterial, name);
    mesh.castShadow = false;
  };

  // Complete vaults have a single continuous crown; selective side lamellae
  // stop beneath it. Distinct recess materials make the overlaps legible at rest.
  for (const panel of SANCTUARY_PANELS) {
    for (const side of panel.span === "side" ? [-1, 1] : [0]) {
      const landmarks = (points: readonly FacadeLandmark[]) => {
        const left = points.map(([u, v, z]) => project(u, v, z + SANCTUARY_ARCHITECTURE.depthOffset));
        if (side === 0) {
          const right = points.slice(0, -1).reverse().map(([u, v, z]) =>
            project(1 - u, v, z + SANCTUARY_ARCHITECTURE.depthOffset));
          return [...left, ...right];
        }
        return side < 0 ? left : points.map(([u, v, z]) => project(1 - u,
          v + Math.sin(v * 5) * 0.008, z - 0.18 + SANCTUARY_ARCHITECTURE.depthOffset));
      };
      const inner = new THREE.CatmullRomCurve3(landmarks(panel.inner), false, "centripetal");
      const outer = new THREE.CatmullRomCurve3(landmarks(panel.outer), false, "centripetal");
      const thickness = panel.thickness * SANCTUARY_ARCHITECTURE.thickness;
      add(createSculptedPanel(inner, outer, thickness, side === 0 ? segments * 2 : segments,
        SANCTUARY_ARCHITECTURE.curvature, panel.name === "selective mineral lamella"), panel.finish === "recess" ? recess : pearl,
        `${panel.name}${side ? ` ${side < 0 ? "left" : "right"}` : ""}`);
      if (panel.name === "primary load bearing vault") {
        for (const t of [0.13, 0.16, 0.20, 0.80, 0.84, 0.87]) {
          const blend = 0.12;
          const points = [0, 0.003, 0.006].map((offset, index) => {
            const p = inner.getPoint(t + offset).lerp(outer.getPoint(t + offset), blend + (index === 1 ? 0.006 : 0));
            p.z += Math.pow(Math.sin(blend * Math.PI), SANCTUARY_ARCHITECTURE.curvature)
              * thickness * 0.32 + 0.015;
            return p;
          });
          addLightLine(points, `embedded mineral fissure ${t}`, 0.006);
        }
      }
      if (panel.seam !== undefined) {
        const blend = panel.seam;
        const points = Array.from({ length: 96 }, (_, i) => {
          const t = THREE.MathUtils.lerp(side ? 0.12 : 0.04, side ? 0.88 : 0.96, i / 95);
          const p = inner.getPoint(t).lerp(outer.getPoint(t), blend);
          p.z += Math.pow(Math.sin(blend * Math.PI), SANCTUARY_ARCHITECTURE.curvature)
            * thickness * 0.32 * (panel.name === "selective mineral lamella"
              ? Math.pow(Math.sin(t * Math.PI), 0.35) : 1) + 0.012;
          return p;
        });
        addLightLine(points, `inlaid light ${panel.name} ${side}`);
      }
    }
  }
  // Solid ceremonial axis and mineral foundations share the existing scene clock
  // and HomeScene's resource ownership / reflection captures.
  sanctuary.add(createCeremonialSteps(quality, geometries, stairStone, seamMaterial));
  sanctuary.add(createSanctuaryPlatforms(quality, geometries, stairStone, seamMaterial));
  sanctuary.add(createRockFormations(quality, geometries, materials, time));
  sanctuary.add(createMineralClusters(quality, geometries, materials));
  sanctuary.add(createAquaticVegetation(quality, geometries, materials, time));
  sanctuary.add(createEcologyDetails(quality, geometries, materials));
  sanctuary.add(createShellThread([
    new THREE.Vector3(-3.55, 0.19, -2.6), new THREE.Vector3(-3.25, 0.19, -1.2),
    new THREE.Vector3(-2.65, 0.19, -0.1), new THREE.Vector3(-2.15, 0.19, 0.3),
    new THREE.Vector3(-1.92, 0.19, 0.02), new THREE.Vector3(-2.12, 0.19, -0.18),
  ], geometries, materials, time, 0.006));
  const staging = new THREE.Group();
  staging.name = "next-stage anchors";
  for (const [name, position] of Object.entries(SANCTUARY_STAGING)) {
    const anchor = new THREE.Object3D();
    anchor.name = `stage:${name}`;
    anchor.position.set(position[0], position[1], position[2]);
    staging.add(anchor);
  }
  sanctuary.add(staging);

  // Preserve the floor of the existing translucent water.
  const basin = new THREE.MeshPhysicalMaterial({
    name: "shallow mineral basin", color: "#dce7e3", roughness: 0.72,
    clearcoat: 0.025, iridescence: 0.025, envMapIntensity: 0.4,
  });
  materials.push(basin);
  addSubtleCaustics(basin, time, quality.mode === "low" ? 0 : 0.12);
  const floor = add(new THREE.PlaneGeometry(64, 76), basin, "basinFloor", sanctuary);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.28, -10);
  floor.castShadow = false;
  return sanctuary;
}
