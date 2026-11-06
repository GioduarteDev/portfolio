import type * as THREE from "three";

export type DebugHudSample = {
  scene: string;
  homeProgress: number;
  transitionProgress: number;
  projectsOffset: number;
  projectsMaxOffset: number;
  camera: THREE.PerspectiveCamera;
  soundEnabled: boolean;
};

const REFRESH_MS = 250;

/**
 * Discreet DOM readout for ?debug=1. Driven by the main render loop
 * (no RAF of its own); writes to the DOM at most every REFRESH_MS.
 */
class DebugHud {
  private readonly element: HTMLPreElement;

  private lastRefresh = 0;

  private frames = 0;

  private fps = 0;

  constructor(parent: HTMLElement) {
    this.element = document.createElement("pre");
    this.element.className = "debug-hud";
    this.element.setAttribute("aria-hidden", "true");
    parent.appendChild(this.element);
  }

  tick(now: number, sample: DebugHudSample): void {
    this.frames += 1;
    const elapsed = now - this.lastRefresh;
    if (elapsed < REFRESH_MS) return;

    this.fps = this.lastRefresh === 0 ? 0 : (this.frames * 1000) / elapsed;
    this.frames = 0;
    this.lastRefresh = now;

    const p = sample.camera.position;
    this.element.textContent = [
      `scene        ${sample.scene}`,
      `homeProgress ${sample.homeProgress.toFixed(3)}`,
      `transition   ${sample.transitionProgress.toFixed(3)}`,
      `projects     ${sample.projectsOffset.toFixed(2)} / ${sample.projectsMaxOffset.toFixed(2)}`,
      `fps          ${this.fps.toFixed(0)}`,
      `cam pos      ${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}`,
      `cam fov      ${sample.camera.fov.toFixed(1)}`,
      `sound        ${sample.soundEnabled ? "on" : "off"}`,
    ].join("\n");
  }

  dispose(): void {
    this.element.remove();
  }
}

export default DebugHud;
