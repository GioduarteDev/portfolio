import * as THREE from "three";
import { createDiveState, sampleDiveState, smoothRange } from "./diveTimeline";

/** A local camera trajectory, leaving the approved Home path and scroll intact. */
export class DiveCamera {
  readonly state = createDiveState();
  readonly airCamera: THREE.PerspectiveCamera;
  private readonly origin: THREE.Vector3;
  private readonly originLookAt: THREE.Vector3;
  private readonly airLookAt = new THREE.Vector3();
  private progress = 0;
  private readonly knots = [0, 0.18, 0.30, 0.46, 0.78, 1];
  private readonly ys: number[];
  private readonly zs: number[];

  constructor(position: THREE.Vector3, lookAt: THREE.Vector3, camera: THREE.PerspectiveCamera) {
    this.origin = position.clone();
    this.originLookAt = lookAt.clone();
    this.airCamera = camera.clone();
    this.ys = [position.y, 0.43, 0.275, 0.04, -0.72, -1.05];
    this.zs = [position.z, position.z - 0.22, position.z - 0.40,
      position.z - 0.64, position.z - 1.45, position.z - 1.80];
  }

  update(target: number, delta: number, snapshot: boolean) {
    // Scroll's (.58 - .36) / .22 can be 0.9999999999999999. Normalize only
    // numerical endpoints, so exact navigation releases the destination input.
    if (target > 1 - 1e-6) target = 1;
    if (target < 1e-6) target = 0;
    const rate = this.progress < 0.46 ? 14 : 9;
    const stepTime = Math.min(Math.max(delta, 0), 0.1);
    const desired = THREE.MathUtils.damp(this.progress, target, rate, stepTime);
    // Fast wheel bursts or shader-compilation stalls must not skip contact and
    // crossing. This bounds the local journey, without consuming/changing input.
    const maximumStep = Math.min(0.035, stepTime * 0.72);
    this.progress = snapshot ? target : this.progress +
      THREE.MathUtils.clamp(desired - this.progress, -maximumStep, maximumStep);
    if (Math.abs(this.progress - target) < 0.0002) this.progress = target;
    return sampleDiveState(this.progress, this.state);
  }

  sample(position: THREE.Vector3, lookAt: THREE.Vector3, time: number, reducedMotion: boolean) {
    const p = this.state.progress;
    let segment = 0;
    while (segment < this.knots.length - 2 && p > this.knots[segment + 1]) segment++;
    const t = smoothRange(this.knots[segment], this.knots[segment + 1], p);
    position.set(this.origin.x * (1 - smoothRange(0, 0.30, p)),
      THREE.MathUtils.lerp(this.ys[segment], this.ys[segment + 1], t),
      THREE.MathUtils.lerp(this.zs[segment], this.zs[segment + 1], t));
    const buoyancy = reducedMotion ? 0 : this.state.immersion * 0.009;
    position.y += Math.sin(time * 0.62) * buoyancy;
    position.x += Math.sin(time * 0.37) * buoyancy * 0.65;
    lookAt.copy(this.originLookAt);
    lookAt.y = THREE.MathUtils.lerp(lookAt.y, position.y + 0.035, smoothRange(0, 0.46, p));
    lookAt.z = THREE.MathUtils.lerp(lookAt.z, -25, smoothRange(0.18, 1, p));
  }

  /** Above-water rays for the remaining air region. The physical view camera
   * continues below the surface, but never feeds an upside-down water capture. */
  updateAirCamera(camera: THREE.PerspectiveCamera, lookAt: THREE.Vector3) {
    this.airCamera.copy(camera);
    this.airCamera.position.y = Math.max(0.205, camera.position.y);
    this.airLookAt.copy(lookAt);
    this.airLookAt.y = Math.max(0.12, this.airLookAt.y);
    this.airCamera.lookAt(this.airLookAt);
    this.airCamera.updateMatrixWorld(true);
  }

  waterline(camera: THREE.PerspectiveCamera) {
    return THREE.MathUtils.clamp(0.5 + (0.16 - camera.position.y) / 0.20, -0.12, 1.12);
  }
}
