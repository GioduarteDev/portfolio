import * as THREE from "three";
import { createDiveState, sampleDiveState, smoothRange } from "./diveTimeline";

/** A local camera trajectory, leaving the approved Home path and scroll intact. */
export class DiveCamera {
  readonly state = createDiveState();
  readonly airCamera: THREE.PerspectiveCamera;
  private readonly origin: THREE.Vector3;
  private readonly originLookAt: THREE.Vector3;
  private readonly airLookAt = new THREE.Vector3();
  private readonly handoff = new THREE.Vector3();
  private progress = 0;
  private readonly knots = [0, 0.18, 0.30, 0.38, 0.46, 0.78, 1];
  private readonly ys: number[];
  private readonly zs: number[];

  constructor(position: THREE.Vector3, lookAt: THREE.Vector3, camera: THREE.PerspectiveCamera) {
    this.origin = position.clone();
    this.originLookAt = lookAt.clone();
    this.airCamera = camera.clone();
    this.ys = [position.y, 0.43, 0.275, 0.16, 0.025, -0.95, -1.50];
    this.zs = [0, 0.40, 0.85, 1.16, 1.60, 3.15, 4.40].map(distance => position.z - distance);
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
    const surface = this.progress > 0.18 && this.progress < 0.48;
    const maximumStep = Math.min(surface ? 0.022 : 0.035, stepTime * (surface ? 0.48 : 0.72));
    this.progress = snapshot ? target : this.progress +
      THREE.MathUtils.clamp(desired - this.progress, -maximumStep, maximumStep);
    if (Math.abs(this.progress - target) < 0.0002) this.progress = target;
    return sampleDiveState(this.progress, this.state);
  }

  sample(position: THREE.Vector3, lookAt: THREE.Vector3, time: number, reducedMotion: boolean,
    preserveHomeMotion = false) {
    const p = this.state.progress;
    this.handoff.copy(position);
    let segment = 0;
    while (segment < this.knots.length - 2 && p > this.knots[segment + 1]) segment++;
    const t = (p - this.knots[segment]) / (this.knots[segment + 1] - this.knots[segment]);
    position.set(this.origin.x * (1 - smoothRange(0, 0.30, p)),
      this.interpolate(this.ys, segment, t), this.interpolate(this.zs, segment, t));
    const buoyancy = reducedMotion ? 0 : this.state.immersion * 0.018;
    position.y += Math.sin(time * 0.62) * buoyancy;
    position.x += Math.sin(time * 0.37) * buoyancy * 0.65;
    if (preserveHomeMotion) position.lerpVectors(this.handoff, position, smoothRange(0, 0.10, p));
    lookAt.copy(this.originLookAt);
    lookAt.y = THREE.MathUtils.lerp(lookAt.y, position.y - 0.11 * this.state.descent,
      smoothRange(0, 0.46, p));
    lookAt.z = THREE.MathUtils.lerp(lookAt.z, -25, smoothRange(0.18, 1, p));
  }

  /** Monotone Hermite interpolation preserves velocity through the knots,
   * without vertical overshoot or the stop/start of per-segment smoothsteps. */
  private interpolate(values: number[], segment: number, t: number) {
    const slope = (i: number) => (values[i + 1] - values[i]) / (this.knots[i + 1] - this.knots[i]);
    const tangent = (i: number) => {
      if (i === 0 || i === values.length - 1) return 0;
      const a = slope(i - 1), b = slope(i);
      return a * b <= 0 ? 0 : 2 * a * b / (a + b);
    };
    const span = this.knots[segment + 1] - this.knots[segment];
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * values[segment] + (t3 - 2 * t2 + t) * tangent(segment) * span
      + (-2 * t3 + 3 * t2) * values[segment + 1] + (t3 - t2) * tangent(segment + 1) * span;
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
