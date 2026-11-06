import * as THREE from "three";
import type { QualitySettings } from "../core/quality";
import { SANCTUARY_ARCHITECTURE } from "./sanctuaryComposition";

/** One continuous curved flight: the submerged first tread leads to an apse landing. */
export function createCeremonialSteps(
  quality: QualitySettings,
  geometries: THREE.BufferGeometry[],
  stone: THREE.Material,
  light: THREE.Material,
) {
  const group = new THREE.Group();
  group.name = "central ceremonial steps";
  const controls = SANCTUARY_ARCHITECTURE.steps;
  const levels = controls.count;
  const segments = quality.mode === "low" ? 24 : 48;
  const bow = (x: number, width: number) => controls.curvature * (1 - (x / width) ** 2);

  for (let level = 0; level < levels; level++) {
    const top = controls.baseHeight + level * controls.rise;
    const front = controls.front - level * controls.run;
    const width = controls.halfWidth - level * controls.taper;
    const depth = level === levels - 1 ? controls.landingDepth : controls.run;
    const footprint = new THREE.Shape();
    for (let i = 0; i <= segments; i++) {
      const x = THREE.MathUtils.lerp(-width, width, i / segments);
      const y = -(front + bow(x, width));
      if (i === 0) footprint.moveTo(x, y);
      else footprint.lineTo(x, y);
    }
    // A common curvature across levels keeps adjoining solid risers watertight.
    for (let i = segments; i >= 0; i--) {
      const x = THREE.MathUtils.lerp(-width, width, i / segments);
      footprint.lineTo(x, -(front - depth + bow(x, width)));
    }
    footprint.closePath();
    const geometry = new THREE.ExtrudeGeometry(footprint, {
      depth: top + 0.12, bevelEnabled: true,
      bevelThickness: 0.018, bevelSize: 0.028, bevelSegments: 2, steps: 1,
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, -0.12, 0);
    geometries.push(geometry);
    const tread = new THREE.Mesh(geometry, stone);
    tread.name = level === levels - 1 ? "apse ceremonial landing" : `curved ceremonial tread ${level + 1}`;
    tread.castShadow = quality.shadows;
    tread.receiveShadow = true;
    group.add(tread);

    if (level === 2 || level === 7 || level === 12) {
      for (const side of [-1, 1]) {
        const points = Array.from({ length: 14 }, (_, i) => {
          const x = side * THREE.MathUtils.lerp(width - 0.13, width - 1.15, i / 13);
          return new THREE.Vector3(x, top - 0.035, front + bow(x, width) + 0.025);
        });
        const lineGeometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, 0.009, 5, false);
        geometries.push(lineGeometry);
        const inset = new THREE.Mesh(lineGeometry, light);
        inset.name = `warm stair inset ${level + 1} ${side}`;
        group.add(inset);
      }
    }
  }
  // Stable local targets for future arrival / hover choreography.
  const arrival = new THREE.Object3D();
  arrival.name = "ceremonial arrival focus";
  arrival.position.set(0, controls.baseHeight + (levels - 1) * controls.rise,
    controls.front - (levels - 1) * controls.run - controls.landingDepth / 2);
  group.add(arrival);
  return group;
}
