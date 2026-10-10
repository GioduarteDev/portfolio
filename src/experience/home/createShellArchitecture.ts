import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import type { QualitySettings } from "../core/quality";
import { createSanctuaryMaterials, seededRandom } from "./sanctuaryMaterials";
import { createCrystalCluster } from "./createCrystalCluster";
import { addSubtleCaustics } from "./createCaustics";

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
  const palette = createSanctuaryMaterials();
  const stone = palette.pearl;
  const ribMaterial = palette.pearl.clone();
  ribMaterial.name = "pearl raised ribs";
  ribMaterial.color.set("#fff1e8");
  ribMaterial.roughness = 0.38;
  if (quality.mode === "low") {
    for (const material of Object.values(palette)) material.transmission = 0;
  }
  materials.push(...Object.values(palette), ribMaterial);
  addSubtleCaustics(stone, time, quality.mode === "low" ? 0 : 0.075);
  addSubtleCaustics(palette.moonstone, time, quality.mode === "low" ? 0 : 0.05);
  const detail = quality.mode === "high" ? 48 : quality.mode === "medium" ? 32 : 20;
  const addMesh = (group: THREE.Group, geometry: THREE.BufferGeometry,
    material: THREE.Material, name: string) => {
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = quality.shadows;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  const createShellWall = (side: -1 | 1) => {
    const group = new THREE.Group();
    group.name = side < 0 ? "leftStructure" : "rightStructure";
    architecture.add(group);
    const profile = new THREE.Shape();
    const crest = side < 0 ? 1.8 : 3.3;
    const height = side < 0 ? 1 : 0.92;
    profile.moveTo(7.8, -0.35);
    profile.bezierCurveTo(7.3, 1.1, 8.2, 3.4, 6.4, 5.2);
    profile.bezierCurveTo(5.3, 6.4, 3.6, 7.1, crest, 8.1);
    profile.bezierCurveTo(3.8, 8.8, 9.8, 9.2, 12.5, 8.6);
    profile.lineTo(13.8, -0.35);
    profile.closePath();
    const geometry = new THREE.ExtrudeGeometry(profile, {
      depth: 28, steps: Math.round(detail / 3), curveSegments: detail,
      bevelEnabled: true, bevelThickness: 0.22, bevelSize: 0.22, bevelSegments: 3,
    });
    const positions = geometry.getAttribute("position");
    for (let i = 0; i < positions.count; i++) {
      const z = positions.getZ(i);
      const sweep = Math.sin(z / 28 * Math.PI) * (side < 0 ? 1.4 : 0.8);
      positions.setXYZ(i, positions.getX(i) + sweep,
        positions.getY(i) * height, z);
    }
    geometry.deleteAttribute("normal");
    const smoothWall = mergeVertices(geometry, 0.0001);
    smoothWall.computeVertexNormals();
    geometry.dispose();
    const wall = addMesh(group, smoothWall, stone, "shellWall");
    wall.scale.x = side;
    wall.scale.z = -1;
    wall.position.z = 3;
    const shellRibs = new THREE.Group();
    shellRibs.name = "shellRibs";
    group.add(shellRibs);
    const random = seededRandom(side < 0 ? 1481 : 9827);
    const count = quality.mode === "low" ? (side < 0 ? 5 : 4) : (side < 0 ? 8 : 6);
    // Follow the actual wall profile so each rib grows from its surface.
    const innerProfile = new THREE.CurvePath<THREE.Vector3>();
    innerProfile.add(new THREE.CubicBezierCurve3(
      new THREE.Vector3(7.8, -0.35, 0), new THREE.Vector3(7.3, 1.1, 0),
      new THREE.Vector3(8.2, 3.4, 0), new THREE.Vector3(6.4, 5.2, 0),
    ));
    innerProfile.add(new THREE.CubicBezierCurve3(
      new THREE.Vector3(6.4, 5.2, 0), new THREE.Vector3(5.3, 6.4, 0),
      new THREE.Vector3(3.6, 7.1, 0), new THREE.Vector3(crest, 8.1, 0),
    ));
    for (let i = 0; i < count; i++) {
      const fraction = i / (count - 1);
      const z = 1.8 - Math.pow(fraction, side < 0 ? 1.18 : 0.85) * 26
        + (random() - 0.5) * 0.6 - (side > 0 ? 0.5 : 0);
      const thickness = 0.13 + random() * 0.10;
      const sweep = Math.sin((3 - z) / 28 * Math.PI) * (side < 0 ? 1.4 : 0.8);
      const lean = (random() - 0.5) * 0.7;
      const points = innerProfile.getPoints(detail).map((point, index) => {
        const t = index / detail;
        return new THREE.Vector3(side * (point.x + sweep - thickness * 0.12),
          point.y * height, z + Math.sin(t * Math.PI) * lean);
      });
      const rib = addMesh(shellRibs, new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points), detail, thickness, 10, false,
      ), ribMaterial, `rib-${i}`);
      rib.scale.y = 0.985 + random() * 0.025;
    }
    // A quiet inset in the thick lateral mass adds material depth.
    const insetZ = side < 0 ? -8.5 : -12;
    const insetSweep = Math.sin((3 - insetZ) / 28 * Math.PI) * (side < 0 ? 1.4 : 0.8);
    const insetPoints = [0.12, 0.26, 0.41].map((t) => {
      const point = innerProfile.getPointAt(t);
      return new THREE.Vector3(side * (point.x + insetSweep - 0.03), point.y * height, insetZ);
    });
    const inset = addMesh(group, new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(insetPoints), detail, 0.08, 8, false,
    ), palette.moonstone, "moonstoneRecess");
    inset.castShadow = false;
  };

  const createCeremonialSteps = (side: -1 | 1) => {
    const steps = new THREE.Group();
    steps.name = side < 0 ? "leftSteps" : "rightSteps";
    sanctuary.add(steps);
    for (let level = 0; level < 6; level++) {
      const edge = (side < 0 ? 4.55 : 5.15) + level * 0.47;
      const front = 4.5 - level * 0.95 + (side > 0 ? -3.4 : 0);
      const shape = new THREE.Shape();
      shape.moveTo(edge + 1.5, front);
      shape.bezierCurveTo(edge - 0.6, front - 0.3, edge - 0.8, front - 3.4, edge, front - 5.8);
      shape.bezierCurveTo(edge + 0.7, front - 8, edge + 0.2, -18, edge + 1.3, -25);
      shape.lineTo(14, -25);
      shape.lineTo(14, front + 1.6);
      shape.quadraticCurveTo(edge + 3, front + 2, edge + 1.5, front);
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.19, bevelEnabled: true, bevelThickness: 0.045,
        bevelSize: 0.06, bevelSegments: 2, curveSegments: detail,
      });
      geometry.rotateX(Math.PI / 2);
      const step = addMesh(steps, geometry, level === 1 ? palette.moonstone : stone, `step-${level}`);
      step.scale.x = side;
      step.position.y = 0.22 + level * 0.19;
    }
  };

  const createFanSurface = () => {
    const fan = new THREE.Group();
    fan.name = "integratedFanWall";
    architecture.add(fan);
    const radialSegments = Math.round(detail / 2);
    const angularSegments = detail;
    const positions: number[] = [];
    const indices: number[] = [];
    const fanPoint = (u: number, v: number) => {
      const angle = 0.3 + u * 2.15;
      const radius = v * (3.25 + 0.25 * Math.sin(u * Math.PI));
      const fold = Math.sin(u * Math.PI * 18) * 0.075 * v;
      return new THREE.Vector3(7.7 + Math.cos(angle) * radius,
        0.95 + Math.sin(angle) * radius,
        -11 + v * v * 0.85 + fold + Math.cos(u * Math.PI) * v * 0.45);
    };
    for (let row = 0; row <= radialSegments; row++) {
      for (let col = 0; col <= angularSegments; col++) {
        positions.push(...fanPoint(col / angularSegments, row / radialSegments).toArray());
      }
    }
    for (let row = 0; row < radialSegments; row++) {
      for (let col = 0; col < angularSegments; col++) {
        const a = row * (angularSegments + 1) + col;
        const b = a + angularSegments + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const fanMaterial = stone.clone();
    fanMaterial.name = "pearl fan relief";
    fanMaterial.side = THREE.DoubleSide;
    materials.push(fanMaterial);
    addMesh(fan, geometry, fanMaterial, "fanSurface");
    const folds = quality.mode === "low" ? 7 : 11;
    for (let i = 0; i < folds; i++) {
      const points = Array.from({ length: 18 }, (_, row) => fanPoint(i / (folds - 1), row / 17));
      addMesh(fan, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),
        24, 0.045, 6, false), ribMaterial, `fanFold-${i}`);
    }
  };

  createShellWall(-1);
  createShellWall(1);
  createCeremonialSteps(-1);
  createCeremonialSteps(1);
  createFanSurface();
  for (const [material, seed, scale, x, y, z] of [
    [palette.sapphire, 1751, 1.1, -5.8, 0.98, -5.8],
    [palette.amethyst, 8271, 0.72, 6.0, 0.8, -9.6],
    [palette.opal, 3019, 0.48, -4.5, 0.42, 0.2],
  ] as const) {
    const cluster = createCrystalCluster(quality, material, seed, scale, geometries);
    cluster.position.set(x, y, z);
    sanctuary.add(cluster);
    const light = new THREE.PointLight(material.color, 0.24, 4, 2);
    light.position.set(x, y + 1.6, z + 0.5);
    sanctuary.add(light);
  }
  const basinMaterial = stone.clone();
  basinMaterial.name = "shallow mineral basin";
  basinMaterial.color.set("#dce7e3");
  basinMaterial.roughness = 0.72;
  basinMaterial.clearcoat = 0.025;
  basinMaterial.iridescence = 0.025;
  basinMaterial.envMapIntensity = 0.4;
  materials.push(basinMaterial);
  addSubtleCaustics(basinMaterial, time, quality.mode === "low" ? 0 : 0.12);
  const floor = addMesh(sanctuary, new THREE.PlaneGeometry(64, 76), basinMaterial, "basinFloor");
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.28, -10);
  floor.castShadow = false;
  return sanctuary;
}
