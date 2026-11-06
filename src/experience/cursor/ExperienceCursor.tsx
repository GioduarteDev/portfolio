import { useEffect, useRef } from "react";

type CursorState =
  | "default"
  | "link"
  | "draggable"
  | "hold"
  | "project"
  | "menu";

type CursorPosition = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  visible: boolean;
  pointerDown: boolean;
  overCanvas: boolean;
  hoverState: CursorState;
  pointerType: string;
};

function ExperienceCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const experienceRoot = cursor?.closest<HTMLElement>(
      ".home-placeholder",
    );
    const finePointer = window.matchMedia("(pointer: fine)");

    if (!cursor || !experienceRoot || !finePointer.matches) {
      return;
    }

    experienceRoot.dataset.customCursorEnabled = "true";

    const position: CursorPosition = {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.5,
      targetX: window.innerWidth * 0.5,
      targetY: window.innerHeight * 0.5,
      visible: false,
      pointerDown: false,
      overCanvas: false,
      hoverState: "default",
      pointerType: "mouse",
    };

    let animationFrame = 0;
    let lastFrameTime = performance.now();
    let wet = 0;
    let trailX = position.x, trailY = position.y;
    const trail = cursor.querySelector<HTMLElement>(".experience-cursor__trail");
    const droplets = cursor.querySelector<HTMLElement>(".experience-cursor__droplets");

    const getHoverState = (target: EventTarget | null): CursorState => {
      if (!(target instanceof Element)) {
        return "default";
      }

      const menuTarget = target.closest('[data-cursor="menu"]');
      if (menuTarget) {
        return "menu";
      }

      const cursorTarget = target.closest<HTMLElement>("[data-cursor]");
      if (cursorTarget?.dataset.cursor === "project") {
        return "project";
      }
      if (cursorTarget?.dataset.cursor === "draggable") {
        return "draggable";
      }

      if (target.closest("a, button, [role='button']")) {
        return "link";
      }

      return "default";
    };

    const handlePointerMove = (event: PointerEvent) => {
      position.pointerType = event.pointerType;
      if (event.pointerType === "touch") {
        position.visible = false;
        return;
      }

      position.targetX = event.clientX;
      position.targetY = event.clientY;
      position.visible = true;
      position.overCanvas = Boolean(
        event.target instanceof Element &&
          event.target.closest(".experience-canvas"),
      );
      position.hoverState = getHoverState(event.target);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        return;
      }

      position.pointerDown = true;
    };

    const handlePointerUp = () => {
      position.pointerDown = false;
    };

    const handlePointerLeave = () => {
      position.visible = false;
      position.pointerDown = false;
      position.overCanvas = false;
      position.hoverState = "default";
    };

    const handlePointerOut = (event: PointerEvent) => {
      if (event.relatedTarget === null) {
        handlePointerLeave();
      }
    };

    const handlePointerCapabilityChange = (
      event: MediaQueryListEvent,
    ) => {
      if (event.matches) {
        experienceRoot.dataset.customCursorEnabled = "true";
        return;
      }

      delete experienceRoot.dataset.customCursorEnabled;
      position.visible = false;
      position.pointerDown = false;
      position.overCanvas = false;
    };

    const animate = (frameTime: number) => {
      const delta = Math.min(0.05, Math.max(0.001, (frameTime - lastFrameTime) / 1000));
      lastFrameTime = frameTime;
      const wetTarget = position.overCanvas ? Number(experienceRoot.dataset.diveWet ?? 0) : 0;
      wet += (wetTarget - wet) * (1 - Math.exp(-22 * delta));
      const reduced = experienceRoot.dataset.diveReducedMotion === "true";
      const damping = wet > 0.001 ? 1 - Math.exp(-(20 - wet * 5) * delta)
        : 1 - Math.exp(-20 / 60);
      position.x += (position.targetX - position.x) * damping;
      position.y += (position.targetY - position.y) * damping;
      trailX += (position.x - trailX) * (1 - Math.exp(-12 * delta));
      trailY += (position.y - trailY) * (1 - Math.exp(-12 * delta));

      const sceneCursorTarget =
        experienceRoot.dataset.cursorTarget;
      const sceneState =
        position.pointerDown &&
        position.overCanvas &&
        experienceRoot.dataset.scene === "home"
          ? "hold"
          : position.overCanvas && sceneCursorTarget === "project"
            ? "project"
            : position.overCanvas
              ? "draggable"
              : position.hoverState;

      cursor.style.transform =
        `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%)`;
      cursor.style.opacity = position.visible ? "1" : "0";
      cursor.dataset.state = sceneState;
      cursor.classList.toggle("is-visible", position.visible);
      cursor.style.setProperty("--cursor-wet", wet.toFixed(4));
      cursor.dataset.wet = wet > 0.02 ? "true" : "false";
      experienceRoot.dataset.cursorX = position.x.toFixed(2);
      experienceRoot.dataset.cursorY = position.y.toFixed(2);
      if (trail) {
        const dx = Math.max(-9, Math.min(9, trailX - position.x));
        const dy = Math.max(-9, Math.min(9, trailY - position.y));
        trail.style.transform = `translate(${reduced ? 0 : dx}px, ${reduced ? 0 : dy}px)`;
      }
      if (droplets) {
        const pulse = reduced ? 0 : Math.pow(Math.max(0, Math.sin(frameTime * 0.0016)), 14);
        droplets.style.opacity = (pulse * wet * 0.4).toFixed(3);
      }

      animationFrame = window.requestAnimationFrame(animate);
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("pointerdown", handlePointerDown, {
      passive: true,
    });
    window.addEventListener("pointerup", handlePointerUp, {
      passive: true,
    });
    window.addEventListener("pointercancel", handlePointerUp, {
      passive: true,
    });
    window.addEventListener("blur", handlePointerLeave);
    document.addEventListener("pointerout", handlePointerOut);
    finePointer.addEventListener(
      "change",
      handlePointerCapabilityChange,
    );

    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("blur", handlePointerLeave);
      document.removeEventListener("pointerout", handlePointerOut);
      finePointer.removeEventListener(
        "change",
        handlePointerCapabilityChange,
      );
      delete experienceRoot.dataset.customCursorEnabled;
      delete experienceRoot.dataset.cursorX;
      delete experienceRoot.dataset.cursorY;
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className="experience-cursor"
      data-state="default"
      aria-hidden="true"
    >
      <span className="experience-cursor__dot" />
      <span className="experience-cursor__label" />
      <span className="experience-cursor__wet" />
      <span className="experience-cursor__trail" />
      <span className="experience-cursor__droplets" />
    </div>
  );
}

export default ExperienceCursor;
