import * as THREE from "three";
import type { QualitySettings } from "../core/quality";
import { addSubtleCaustics } from "./createCaustics";
import { createMineralClusters } from "./createMineralClusters";
import { createFacadeProjector, createSculptedPanel } from "./sanctuaryGeometry";
import { SANCTUARY_PANELS, type FacadeLandmark } from "./sanctuaryComposition";

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
  const segments = quality.mode === "high" ? 80 : quality.mode === "medium" ? 56 : 32;
  const project = createFacadeProjector();
  const pearl = new THREE.MeshPhysicalMaterial({
    name: "carved ivory pearl", color: "#F5EFEB", roughness: 0.34,
    metalness: 0, clearcoat: 0.1, clearcoatRoughness: 0.36,
    ior: 1.45, iridescence: 0.06, iridescenceIOR: 1.25, iridescenceThicknessRange: [180, 360],
    sheen: 0.18, sheenRoughness: 0.55, sheenColor: new THREE.Color("#E9E2F0"),
    envMapIntensity: 0.5, vertexColors: true,
    emissive: "#FFEBDD", emissiveIntensity: 0.08,
  });
  const roughStone = pearl.clone();
  roughStone.name = "partially carved marble foundations";
  roughStone.color.set("#E4DEE3");
  roughStone.roughness = 0.62;
  roughStone.clearcoat = 0;
  roughStone.iridescence = 0.01;
  roughStone.sheen = 0.05;
  roughStone.emissiveIntensity = 0.05;
  const seamMaterial = new THREE.MeshStandardMaterial({
    name: "recessed dawn light", color: "#FFE0B5", emissive: "#FFD29E",
    emissiveIntensity: 0.65, roughness: 0.5, toneMapped: true,
  });
  const stairStone = pearl.clone();
  stairStone.name = "honed ceremonial stair stone";
  stairStone.roughness = 0.47;
  stairStone.clearcoat = 0.02;
  stairStone.iridescence = 0.02;
  stairStone.emissiveIntensity = 0.05;
  materials.push(pearl, roughStone, stairStone, seamMaterial);
  addSubtleCaustics(pearl, time, quality.mode === "low" ? 0 : 0.025);
  for (const material of [pearl, roughStone, stairStone, seamMaterial]) {
    const previousCompile = material.onBeforeCompile;
    const previousKey = material.customProgramCacheKey();
    material.onBeforeCompile = (shader, renderer) => {
      previousCompile.call(material, shader, renderer);
      shader.vertexShader = `varying vec3 vSanctuaryPosition;\n${shader.vertexShader}`
        .replace("#include <project_vertex>", `#include <project_vertex>
          vSanctuaryPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
      shader.fragmentShader = `varying vec3 vSanctuaryPosition;\n${shader.fragmentShader}`
        .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
          if (vSanctuaryPosition.y < 0.16) discard;`);
      if (material instanceof THREE.MeshPhysicalMaterial && quality.mode !== "low") {
        const strength = material === roughStone ? 0.08 : 0.04;
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
          totalEmissiveRadiance += vec3(0.93, 0.92, 1.0) * pearlFresnel * ${material === roughStone ? "0.01" : "0.03"};`);
      }
    };
    material.customProgramCacheKey = () =>
      `${previousKey}-sanctuary-waterline-${quality.mode}-${material === roughStone ? "raw" : "honed"}`;
  }

  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, name: string,
    group: THREE.Group = architecture) => {
    if (material instanceof THREE.MeshPhysicalMaterial && material.vertexColors) {
      const positions = geometry.getAttribute("position");
      const colors: number[] = [];
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
        const vein = Math.pow(0.5 + 0.5 * Math.sin(x * 2.1 + y * 0.8 +
          Math.sin(z * 1.25 + x * 0.7) * 2), 24);
        const shade = 0.98 - vein * 0.055;
        colors.push(shade, shade * 0.995, Math.min(1, shade + 0.006));
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
  const addLightLine = (points: THREE.Vector3[], name: string, radius = 0.018) => {
    const mesh = add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),
      Math.min(segments, points.length * 2), radius, 6, false), seamMaterial, name);
    mesh.castShadow = false;
  };

  // Two dominant oval boundaries and a small number of heavy folded side sheets.
  for (const side of [-1, 1] as const) {
    for (const panel of SANCTUARY_PANELS) {
      const lift = (panel.asymmetry ?? 0) * side;
      const curve = (landmarks: readonly FacadeLandmark[]) => new THREE.CatmullRomCurve3(
        landmarks.map(([u, v, z]) => project(side < 0 ? u : 1 - u, v + lift,
          z + (side > 0 ? -0.18 : 0))), false, "centripetal",
      );
      const inner = curve(panel.inner), outer = curve(panel.outer);
      add(createSculptedPanel(inner, outer, panel.thickness, segments), pearl,
        `${side < 0 ? "left" : "right"} ${panel.name}`);
      if (panel.seam !== undefined) {
        const blend = panel.seam;
        const points = Array.from({ length: 48 }, (_, i) => {
          const t = THREE.MathUtils.lerp(0.04, 0.98, i / 47);
          const p = inner.getPoint(t).lerp(outer.getPoint(t), blend);
          p.z += Math.pow(Math.sin(blend * Math.PI), 0.65) * panel.thickness * 0.32 + 0.015;
          return p;
        });
        addLightLine(points, `${side} inset ${panel.name}`);
      }
    }
    const light = new THREE.PointLight("#FFD6A3", 0.3, 5, 2);
    light.position.copy(project(side < 0 ? 0.28 : 0.72, 0.58, -3.7));
    architecture.add(light);
  }

  const steps = new THREE.Group();
  steps.name = "central ceremonial steps";
  sanctuary.add(steps);
  // Concept: top at 63% of frame, waterline at 71%, width about 52%.
  // Short treads produce a horizontal stair, rather than a receding stone ramp.
  // Four broad, low treads read as a carved ceremonial stair rather than slats.
  // Six low treads recede in z; the lowest sits at the waterline and the last is a deeper landing.
  const levels = 6;
  for (let level = 0; level < levels; level++) {
    const top = 0.2 + level * 0.1;
    const front = -2.2 - level * 0.55;
    const halfWidth = 3.6 + level * 0.08;
    const depth = level === levels - 1 ? 1.1 : 0.55;
    // Only exposed tread/riser bands: stacked deep boxes would overpaint one
    // another in the existing depthless final target, flattening the stairs.
    const mesh = add(new THREE.BoxGeometry(halfWidth * 2, 0.1, depth),
      level === levels - 1 ? pearl : stairStone, `ceremonial tread ${level + 1}`, steps);
    mesh.position.set(0, top - 0.05, front - depth / 2);
    if (level === 2) {
      for (const side of [-1, 1]) {
        addLightLine([new THREE.Vector3(side * halfWidth, top - 0.016, front + 0.006),
          new THREE.Vector3(side * (halfWidth - 0.62), top - 0.016, front + 0.006)],
        `${side} stair inset ${level}`, 0.009);
      }
    }
  }



  sanctuary.add(createMineralClusters(quality, geometries, materials));

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
  // The existing final scene target has no depth buffer and water draws at 2.
  // Paint the above-water architecture back-to-front after it. Reflection and
  // refraction targets retain their ordinary depth tests. The basin stays first.
  sanctuary.updateMatrixWorld(true);
  sanctuary.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object === floor) return;
    object.geometry.computeBoundingSphere();
    const center = object.geometry.boundingSphere!.center.clone().applyMatrix4(object.matrixWorld);
    object.renderOrder = 3 + (center.z + 30) * 0.1;
  });
  return sanctuary;
}
