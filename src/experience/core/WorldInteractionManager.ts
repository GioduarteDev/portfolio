import * as THREE from "three";
import WorldScene, {
  WORLD_SCENE_CONFIG,
  type WorldSelection,
} from "../scenes/WorldScene";

type WorldInteractionCallbacks = {
  onHover: (selection: WorldSelection | null) => void;
  onSelect: (selection: WorldSelection | null) => void;
};

class WorldInteractionManager {
  private readonly canvas: HTMLCanvasElement;

  private readonly scene: WorldScene;

  private readonly camera: THREE.PerspectiveCamera;

  private readonly callbacks: WorldInteractionCallbacks;

  private readonly target = new THREE.Vector2();

  private readonly current = new THREE.Vector2();

  private active = false;

  private pointerId: number | null = null;

  private pointerStart = new THREE.Vector2();

  private lastPointer = new THREE.Vector2();

  private dragged = false;

  private previousTouchAction = "";

  constructor(
    canvas: HTMLCanvasElement,
    scene: WorldScene,
    camera: THREE.PerspectiveCamera,
    callbacks: WorldInteractionCallbacks,
  ) {
    this.canvas = canvas;
    this.scene = scene;
    this.camera = camera;
    this.callbacks = callbacks;

    canvas.addEventListener("pointerdown", this.handlePointerDown);
    canvas.addEventListener("pointermove", this.handlePointerMove);
    canvas.addEventListener("pointerup", this.handlePointerUp);
    canvas.addEventListener("pointercancel", this.handlePointerCancel);
    canvas.addEventListener("lostpointercapture", this.handlePointerCancel);
  }

  setActive(active: boolean) {
    if (this.active === active) return;
    this.active = active;
    this.callbacks.onHover(null);

    if (active) {
      this.previousTouchAction = this.canvas.style.touchAction;
      this.canvas.style.touchAction = "none";
    } else {
      this.canvas.style.touchAction = this.previousTouchAction;
      this.releasePointer();
    }
  }

  update(deltaSeconds: number, elapsed: number) {
    const damping =
      1 - Math.exp(-WORLD_SCENE_CONFIG.dampingRate * Math.max(0, deltaSeconds));
    this.current.lerp(this.target, damping);

    this.camera.position.set(
      this.current.x,
      this.current.y,
      WORLD_SCENE_CONFIG.cameraZ,
    );
    this.camera.lookAt(this.current.x, this.current.y, 0);
    this.scene.update(
      elapsed,
      this.current.x,
      this.current.y,
    );
  }

  private getSelection(event: PointerEvent) {
    const bounds = this.canvas.getBoundingClientRect();
    return this.scene.getSelectionAt(
      event.clientX,
      event.clientY,
      this.camera,
      bounds,
    );
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (!this.active || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }

    this.pointerId = event.pointerId;
    this.dragged = false;
    this.pointerStart.set(event.clientX, event.clientY);
    this.lastPointer.copy(this.pointerStart);
    this.canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.active) return;
    const bounds = this.canvas.getBoundingClientRect();
    if (this.pointerId === event.pointerId) {
      const totalDistance = Math.hypot(
        event.clientX - this.pointerStart.x,
        event.clientY - this.pointerStart.y,
      );
      if (totalDistance > 4) this.dragged = true;

      if (this.dragged) {
        const worldUnitsPerPixel =
          (2 * WORLD_SCENE_CONFIG.cameraZ *
            Math.tan(THREE.MathUtils.degToRad(
              WORLD_SCENE_CONFIG.cameraFov,
            ) / 2)) /
          Math.max(1, bounds.height);
        const deltaX = event.clientX - this.lastPointer.x;
        const deltaY = event.clientY - this.lastPointer.y;
        this.target.x -=
          deltaX * worldUnitsPerPixel * WORLD_SCENE_CONFIG.dragSensitivity;
        this.target.y +=
          deltaY * worldUnitsPerPixel * WORLD_SCENE_CONFIG.dragSensitivity;
        this.callbacks.onHover(null);
      }

      this.lastPointer.set(event.clientX, event.clientY);
      event.preventDefault();
      return;
    }

    const selection = this.getSelection(event);
    this.callbacks.onHover(selection);
    this.canvas.dataset.cursorTarget = selection ? "project" : "draggable";
  };

  private handlePointerUp = (event: PointerEvent) => {
    if (!this.active || this.pointerId !== event.pointerId) return;
    if (!this.dragged) {
      const selection = this.getSelection(event);
      if (selection) this.callbacks.onSelect(selection);
    }
    this.releasePointer();
  };

  private handlePointerCancel = (event: PointerEvent) => {
    if (this.pointerId === event.pointerId) this.releasePointer();
  };

  private releasePointer() {
    const pointerId = this.pointerId;
    this.pointerId = null;
    this.dragged = false;
    if (
      pointerId !== null &&
      this.canvas.hasPointerCapture(pointerId)
    ) {
      this.canvas.releasePointerCapture(pointerId);
    }
  }

  dispose() {
    this.setActive(false);
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas.removeEventListener("pointercancel", this.handlePointerCancel);
    this.canvas.removeEventListener(
      "lostpointercapture",
      this.handlePointerCancel,
    );
    delete this.canvas.dataset.cursorTarget;
  }
}

export default WorldInteractionManager;
