import * as THREE from "three";
import type { QualitySettings } from "../core/quality";

/** HomeScene owns and disposes every resource registered here. */
export function createShellArchitecture(
  quality: QualitySettings,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
): THREE.Group {
  const sanctuary = new THREE.Group();
  sanctuary.name = "sanctuary";
  const architecture = new THREE.Group();
  architecture.name = "architecture";
  sanctuary.add(architecture);
  const stone = new THREE.MeshPhysicalMaterial({
    color: "#e6cfc4", roughness: 0.52, metalness: 0,
    clearcoat: 0.12, clearcoatRoughness: 0.5,
  });
  const ribMaterial = new THREE.MeshPhysicalMaterial({
    color: "#f0ded0", roughness: 0.46, metalness: 0,
  });
  materials.push(stone, ribMaterial);
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
    profile.moveTo(7.8, -0.35);
    profile.bezierCurveTo(7.3, 1.1, 8.2, 3.4, 6.4, 5.2);
    profile.bezierCurveTo(5.3, 6.4, 2.4, 6.6, 0.7, 7.7);
    profile.bezierCurveTo(3.8, 8.8, 9.8, 9.2, 12.5, 8.6);
    profile.lineTo(13.8, -0.35);
    profile.closePath();
    const geometry = new THREE.ExtrudeGeometry(profile, {
      depth: 28, steps: detail, curveSegments: detail,
      bevelEnabled: true, bevelThickness: 0.22, bevelSize: 0.22, bevelSegments: 3,
    });
    const positions = geometry.getAttribute("position");
    for (let i = 0; i < positions.count; i++) {
      const z = positions.getZ(i);
      const sweep = Math.sin(z / 28 * Math.PI) * (side < 0 ? 1.4 : 0.8);
      positions.setXYZ(i, positions.getX(i) + sweep,
        positions.getY(i) * (side < 0 ? 1 : 0.88), z);
    }
    geometry.computeVertexNormals();
    const wall = addMesh(group, geometry, stone, "shellWall");
    wall.scale.x = side;
    wall.scale.z = -1;
    wall.position.z = 3;
    const shellRibs = new THREE.Group();
    shellRibs.name = "shellRibs";
    group.add(shellRibs);
    const count = quality.mode === "low" ? 8 : 13;
    for (let i = 0; i < count; i++) {
      const z = 2.5 - i * 27 / (count - 1);
      const sweep = Math.sin((3 - z) / 28 * Math.PI) * (side < 0 ? 1.4 : 0.8);
      const height = side < 0 ? 1 : 0.88;
      const points = [[7.7, 0], [7.55, 1.7], [7.3, 3.5], [6.25, 5.05],
        [4.6, 6.05], [2.5, 6.7], [0.8, 7.65]].map(([x, y]) =>
          new THREE.Vector3(side * (x + sweep - 0.08), y * height, z));
      addMesh(shellRibs, new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points), detail, 0.10 + i * 0.003, 8, false,
      ), ribMaterial, `rib-${i}`);
    }
  };

  const createCeremonialSteps = (side: -1 | 1) => {
    const steps = new THREE.Group();
    steps.name = side < 0 ? "leftSteps" : "rightSteps";
    sanctuary.add(steps);
    for (let level = 0; level < 6; level++) {
      const edge = 4.9 + level * 0.45;
      const front = 3.5 - level * 0.85 + (side > 0 ? -2 : 0);
      const shape = new THREE.Shape();
      shape.moveTo(edge + 1.5, front);
      shape.bezierCurveTo(edge - 0.6, front - 0.3, edge - 0.8, front - 3.4, edge, front - 5.8);
      shape.bezierCurveTo(edge + 0.7, front - 8, edge + 0.2, -18, edge + 1.3, -25);
      shape.lineTo(14, -25);
      shape.lineTo(14, front + 1.6);
      shape.quadraticCurveTo(edge + 3, front + 2, edge + 1.5, front);
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.2, bevelEnabled: true, bevelThickness: 0.04,
        bevelSize: 0.06, bevelSegments: 2, curveSegments: detail,
      });
      geometry.rotateX(Math.PI / 2);
      const step = addMesh(steps, geometry, stone, `step-${level}`);
      step.scale.x = side;
      step.position.y = 0.22 + level * 0.2;
    }
  };

  createShellWall(-1);
  createShellWall(1);
  createCeremonialSteps(-1);
  createCeremonialSteps(1);
  const floor = addMesh(sanctuary, new THREE.PlaneGeometry(64, 76), stone, "basinFloor");
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.28, -10);
  floor.castShadow = false;
  return sanctuary;
}
