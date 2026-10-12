import * as THREE from "three";
import { HOME_CAMERA_FOV, HOME_CAMERA_START } from "../config/visual";

/** Reference landmarks in the initial 16:9 frame, projected into actual world
 * geometry. This does not change or replace the experience camera. */
export function createFacadeProjector() {
  const framing = new THREE.PerspectiveCamera(HOME_CAMERA_FOV, 16 / 9, 0.1, 100);
  framing.position.set(...HOME_CAMERA_START);
  framing.lookAt(0, 1.2, -14);
  framing.updateMatrixWorld(true);
  return (u: number, v: number, z: number) => {
    const ray = new THREE.Vector3(u * 2 - 1, 1 - v * 2, 0.5)
      .unproject(framing).sub(framing.position);
    return framing.position.clone().addScaledVector(ray, (z - framing.position.z) / ray.z);
  };
}

/** A solid sculpted sheet between independently drawn silhouette boundaries.
 * Broad convex faces, rounded shoulders and a closed back avoid tubular ribs. */
export function createSculptedPanel(
  inner: THREE.Curve<THREE.Vector3>, outer: THREE.Curve<THREE.Vector3>,
  thickness: number, segments: number,
): THREE.BufferGeometry {
  const across = 12;
  const positions: number[] = [];
  const indices: number[] = [];
  const layerSize = (segments + 1) * (across + 1);
  for (let layer = 0; layer < 2; layer++) {
    for (let row = 0; row <= segments; row++) {
      const t = row / segments;
      const a = inner.getPoint(t), b = outer.getPoint(t);
      for (let col = 0; col <= across; col++) {
        const v = col / across;
        const p = a.clone().lerp(b, v);
        const shoulder = Math.pow(Math.sin(v * Math.PI), 0.65);
        p.z += layer === 0 ? shoulder * thickness * 0.32
          : -thickness * (0.45 + shoulder * 0.55);
        positions.push(...p.toArray());
      }
    }
  }
  // Compute face winding from the actual boundary orientation (left/right).
  const direction = inner.getTangent(0.5);
  const acrossDirection = outer.getPoint(0.5).sub(inner.getPoint(0.5));
  const frontPositive = direction.clone().cross(acrossDirection).z > 0;
  const tri = (a: number, b: number, c: number, reverse = false) => {
    if (frontPositive !== reverse) indices.push(a, b, c);
    else indices.push(a, c, b);
  };
  for (let row = 0; row < segments; row++) {
    for (let col = 0; col < across; col++) {
      const a = row * (across + 1) + col, b = a + across + 1;
      tri(a, b, a + 1); tri(a + 1, b, b + 1);
      tri(a + layerSize, b + layerSize, a + 1 + layerSize, true);
      tri(a + 1 + layerSize, b + layerSize, b + 1 + layerSize, true);
    }
    const a = row * (across + 1), b = a + across + 1;
    tri(a, a + layerSize, b); tri(b, a + layerSize, b + layerSize);
    tri(a + across, b + across, a + across + layerSize);
    tri(b + across, b + across + layerSize, a + across + layerSize);
  }
  for (const row of [0, segments]) {
    for (let col = 0; col < across; col++) {
      const a = row * (across + 1) + col;
      tri(a, a + 1, a + layerSize, row === 0);
      tri(a + 1, a + 1 + layerSize, a + layerSize, row === 0);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
