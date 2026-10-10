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

    const animate = () => {
      const damping = 1 - Math.exp(-20 / 60);
      position.x += (position.targetX - position.x) * damping;
      position.y += (position.targetY - position.y) * damping;

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
    </div>
  );
}

export default ExperienceCursor;
