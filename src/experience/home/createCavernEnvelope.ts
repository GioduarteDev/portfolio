import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import type { QualitySettings } from "../core/quality";
import { SANCTUARY_ARCHITECTURE, type FacadeLandmark } from "./sanctuaryComposition";
import { createFacadeProjector, createSculptedPanel } from "./sanctuaryGeometry";

/** Natural host rock: a continuous overhead mass plus asymmetric lateral
 * cavities. Silhouettes extend beyond the frame instead of ending at its edge. */
export function createCavernEnvelope(
  quality: QualitySettings, geometries: THREE.BufferGeometry[], materials: THREE.Material[],
) {
  const group = new THREE.Group();
  group.name = "natural cavern enclosing the sanctuary";
  const controls = SANCTUARY_ARCHITECTURE.cavern;
  const project = createFacadeProjector();
  const rock = new THREE.MeshStandardMaterial({
    name: "ancient lilac limestone cavities", color: "#B8B0BC", roughness: 0.89,
    metalness: 0, vertexColors: true, envMapIntensity: 0.3,
    emissive: "#9CA6B8", emissiveIntensity: controls.lightIntensity,
  });
  materials.push(rock);
  rock.onBeforeCompile = (shader) => {
    shader.vertexShader = `varying vec3 vCavernStone;\n${shader.vertexShader}`
      .replace("#include <project_vertex>", `#include <project_vertex>
        vCavernStone = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = `varying vec3 vCavernStone;\n${shader.fragmentShader}`
      .replace("#include <color_fragment>", `#include <color_fragment>
        float cavernStratum = sin(vCavernStone.y * 7.5 + sin(vCavernStone.x * 1.6)
          + vCavernStone.z * 1.1);
        float cavernGrain = sin(vCavernStone.x * 31.0 + vCavernStone.z * 23.0)
          * sin(vCavernStone.y * 37.0 - vCavernStone.z * 17.0);
        diffuseColor.rgb *= 0.88 + cavernStratum * 0.10 + cavernGrain * 0.025;`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        totalEmissiveRadiance *= 0.72 + cavernStratum * 0.18;`);
  };
  rock.customProgramCacheKey = () => "ancient-cavern-strata-v1";
  const curve = (points: readonly FacadeLandmark[]) => new THREE.CatmullRomCurve3(
    points.map(([u, v, z]) => project(u, v, z)), false, "centripetal");
  const addMass = (name: string, inner: readonly FacadeLandmark[], outer: readonly FacadeLandmark[],
    thickness: number, phase: number) => {
    const geometry = createSculptedPanel(curve(inner), curve(outer), thickness,
      quality.mode === "low" ? 40 : 72, 1.2);
    const positions = geometry.getAttribute("position");
    const colors: number[] = [];
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      // Continuous spatial fields keep shared edges closed, with water-eroded
      // ledges and broad irregular hollows rather than random vertex spikes.
      const fold = Math.sin(x * 1.15 + z * 0.65 + phase) * Math.cos(y * 1.6 - z * 0.3);
      const strata = Math.sin(y * 5.5 + x * 0.3 + Math.sin(z * 0.8));
      positions.setXYZ(i, x + fold * controls.erosion,
        y + strata * controls.erosion * 0.35, z + fold * controls.erosion * 1.8);
      const cavity = 0.75 + 0.14 * Math.sin(x * 0.55 + z * 0.7 + phase)
        + strata * 0.075;
      colors.push(cavity * 0.91, cavity * 0.95, cavity * 1.04);
    }
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, rock);
    mesh.name = name;
    mesh.castShadow = quality.shadows;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  const drop = controls.roofDrop;
  addMass("overhanging monolithic cavern ceiling", [
    [-0.22, 0.39, 2.8], [0.03, 0.23, 1.5], [0.19, 0.105, 0.2],
    [0.38, 0.09 + drop, -1.2], [0.57, 0.125 + drop, -1.8],
    [0.78, 0.075, -0.6], [0.99, 0.20, 1.2], [1.22, 0.40, 2.8],
  ], [
    [-0.30, -0.4, 2.8], [0.02, -0.42, 1.5], [0.19, -0.43, 0.2],
    [0.38, -0.44, -1.2], [0.57, -0.42, -1.8],
    [0.78, -0.43, -0.6], [1.02, -0.42, 1.2], [1.30, -0.4, 2.8],
  ], controls.depth, 0.8);

  for (const side of [-1, 1]) {
    const mirror = (points: readonly FacadeLandmark[]): FacadeLandmark[] => points.map(([u, v, z]) =>
      [side < 0 ? u : 1 - u, v + (side > 0 ? 0.015 * Math.sin(v * 6) : 0),
        z + (side > 0 ? -0.55 : 0)]);
    addMass(`${side < 0 ? "left" : "right"} foreground cavern cliff`, mirror([
      [0.025, 1.12, 2.4], [-0.01, 0.84, 1.8], [-0.035, 0.58, 1.0],
      [0.012, 0.39, 0.5], [0.055, 0.22, -0.3], [0.13, 0.09, -1.4],
    ]), mirror([
      [-0.40, 1.12, 2.4], [-0.4, 0.84, 1.8], [-0.42, 0.58, 1.0],
      [-0.42, 0.39, 0.5], [-0.4, 0.1, -0.3], [-0.25, -0.22, -1.4],
    ]), controls.depth * 0.85, side * 1.4);
    addMass(`${side < 0 ? "left" : "right"} recessed mineral grotto`, mirror([
      [0.17, 0.84, -5.5], [0.11, 0.64, -6], [0.07, 0.4, -7],
      [0.12, 0.2, -8], [0.24, 0.10, -9],
    ]), mirror([
      [-0.12, 0.86, -5.5], [-0.14, 0.64, -6], [-0.15, 0.38, -7],
      [-0.08, 0.10, -8], [0.1, -0.12, -9],
    ]), controls.depth * 0.6, side * 2.1);
  }
  // Broken geological shelves catch light on separate planes, giving the roof
  // physical relief and deep joints instead of a single dark silhouette.
  const blockSource = new THREE.IcosahedronGeometry(1, 2);
  blockSource.deleteAttribute("normal");
  blockSource.deleteAttribute("uv");
  const blockGeometry = mergeVertices(blockSource);
  blockSource.dispose();
  const blockPositions = blockGeometry.getAttribute("position");
  const blockColors: number[] = [];
  for (let i = 0; i < blockPositions.count; i++) {
    const x = blockPositions.getX(i), y = blockPositions.getY(i), z = blockPositions.getZ(i);
    const erosion = 1 + 0.16 * Math.sin(x * 4 + z * 3) * Math.cos(y * 3 - x);
    blockPositions.setXYZ(i, x * erosion, y * (0.9 + Math.sin(z * 4 + x) * 0.12), z * erosion);
    const tint = 0.78 + Math.sin(y * 7 + z) * 0.09;
    blockColors.push(tint * 0.96, tint * 0.98, tint * 1.04);
  }
  blockGeometry.setAttribute("color", new THREE.Float32BufferAttribute(blockColors, 3));
  blockGeometry.computeVertexNormals();
  blockGeometry.computeBoundingSphere();
  geometries.push(blockGeometry);
  const shelves = [
    { name: "left hanging geological shelf", uv: [0.06, 0.115, 1.2], scale: [1.65, 0.6, 1.2], tilt: -0.15 },
    { name: "crown broken limestone slab", uv: [0.48, -0.045, 2.2], scale: [2.4, 0.65, 1.1], tilt: 0.06 },
    { name: "right hanging geological shelf", uv: [0.96, 0.09, 1.4], scale: [1.45, 0.72, 1.25], tilt: 0.21 },
    { name: "left cavern foot", uv: [-0.055, 0.83, 2], scale: [1.15, 1.3, 1.6], tilt: -0.2 },
    { name: "right cavern foot", uv: [1.06, 0.81, 1.7], scale: [1.2, 1.1, 1.5], tilt: 0.15 },
  ];
  for (const shelf of shelves) {
    const mesh = new THREE.Mesh(blockGeometry, rock);
    mesh.name = shelf.name;
    mesh.position.copy(project(shelf.uv[0], shelf.uv[1], shelf.uv[2]));
    mesh.scale.set(shelf.scale[0], shelf.scale[1], shelf.scale[2]);
    mesh.rotation.set(-0.12, shelf.tilt, shelf.tilt);
    mesh.castShadow = quality.shadows;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}
