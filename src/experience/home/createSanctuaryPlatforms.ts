import * as THREE from "three";
import type { QualitySettings } from "../core/quality";
import { SANCTUARY_ARCHITECTURE } from "./sanctuaryComposition";

/** Receding stylobates join the stair edges to the existing tidal bedrock.
 * Their inner line follows the flight; broad outer ledges disappear into rock. */
export function createSanctuaryPlatforms(
  quality: QualitySettings, geometries: THREE.BufferGeometry[], stone: THREE.Material,
  light: THREE.Material,
) {
  const group = new THREE.Group();
  group.name = "ceremonial lateral stylobates";
  const stairs = SANCTUARY_ARCHITECTURE.steps;
  for (const side of [-1, 1]) {
    for (let level = 0; level < 3; level++) {
      const step = level * 4;
      const front = stairs.front - step * stairs.run;
      const top = stairs.baseHeight + step * stairs.rise - 0.075;
      const inner = stairs.halfWidth - step * stairs.taper - 0.08;
      const outer = 5.3 + (side < 0 ? 0.2 : -0.05) - level * 0.28;
      const shape = new THREE.Shape();
      shape.moveTo(inner, -front - 0.12);
      shape.lineTo(outer - 0.45, -front - 0.2);
      shape.quadraticCurveTo(outer + 0.2, -front + 0.35, outer, -front + 1.3);
      shape.lineTo(outer - 0.38, -front + 2.25);
      shape.lineTo(inner - 4 * stairs.taper, -front + 2.25);
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: top + 0.25, bevelEnabled: true, bevelThickness: 0.025,
        bevelSize: 0.055, bevelSegments: 2, curveSegments: quality.mode === "low" ? 12 : 24,
      });
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(0, -0.25, 0);
      geometries.push(geometry);
      const platform = new THREE.Mesh(geometry, stone);
      // Three.js adjusts front-face winding for the mirrored object transform.
      platform.scale.x = side;
      platform.name = `${side} lateral foundation terrace ${level + 1}`;
      platform.castShadow = quality.shadows;
      platform.receiveShadow = true;
      group.add(platform);
      if (level === 1) {
        const line = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
          new THREE.Vector3(side * (inner + 0.1), top - 0.025, front + 0.08),
          new THREE.Vector3(side * (inner + 0.65), top - 0.025, front + 0.08),
          new THREE.Vector3(side * (inner + 0.95), top - 0.025, front - 0.02),
        ]), 20, 0.007, 5, false);
        geometries.push(line);
        const inset = new THREE.Mesh(line, light);
        inset.name = `${side} terrace recessed light`;
        group.add(inset);
      }
    }
  }
  return group;
}
