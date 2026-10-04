import { useEffect, useRef } from "react";

import * as THREE from "three";

import HomeScene from "./scenes/HomeScene";
import ProjectsScene from "./scenes/ProjectsScene";

import ScrollManager from "./core/ScrollManager";

function ExperienceCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    // ===================================================
    // SCENES
    // ===================================================

    const home = new HomeScene();
    const projects = new ProjectsScene();

    // ===================================================
    // CAMERA
    // ===================================================

    const camera = new THREE.PerspectiveCamera(
      38,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );

    camera.position.set(0, 2.1, 9);

    // ===================================================
    // CAMERA PATH
    // ===================================================

    const cameraPath = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, 2.1, 9),
        new THREE.Vector3(0.25, 2, 7.2),
        new THREE.Vector3(-0.2, 1.65, 5.5),
        new THREE.Vector3(0.15, 1.05, 4),
        new THREE.Vector3(0, 0.45, 2.7),
        new THREE.Vector3(0, -0.25, 1.6),
        new THREE.Vector3(0, -0.9, 0.1),
        new THREE.Vector3(0, -1.05, -5),
        new THREE.Vector3(0, -1, -12),
        new THREE.Vector3(0, -0.9, -20),
      ],
      false,
      "catmullrom",
      0.5,
    );

    // ===================================================
    // LOOK AT PATH
    // ===================================================

    const lookAtPath = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0.95, -1),
        new THREE.Vector3(0, 0.75, -2),
        new THREE.Vector3(0, 0.4, -3),
        new THREE.Vector3(0, 0, -4),
        new THREE.Vector3(0, -0.5, -5),
        new THREE.Vector3(0, -1, -7),
        new THREE.Vector3(0, -1, -11),
        new THREE.Vector3(0, -1, -18),
        new THREE.Vector3(0, -1, -27),
      ],
      false,
      "catmullrom",
      0.5,
    );

    // ===================================================
    // RENDERER
    // ===================================================

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });

    renderer.setSize(
      container.clientWidth,
      container.clientHeight,
    );

    const initialPixelRatio = Math.min(
      window.devicePixelRatio,
      2,
    );

    renderer.setPixelRatio(initialPixelRatio);

    renderer.outputColorSpace = THREE.SRGBColorSpace;

    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    renderer.toneMappingExposure = 1;

    renderer.shadowMap.enabled = true;

    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // ===================================================
    // SCROLL
    // ===================================================

    const scroll = new ScrollManager();

    // ===================================================
    // POINTER
    // ===================================================

    const pointer = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointer.targetX =
        (event.clientX / window.innerWidth - 0.5) * 2;

      pointer.targetY =
        (event.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener(
      "pointermove",
      handlePointerMove,
    );

    // ===================================================
    // HOLD
    // ===================================================

    let holding = false;
    let holdProgress = 0;

    const handlePointerDown = () => {
      holding = true;
    };

    const handlePointerUp = () => {
      holding = false;
    };

    window.addEventListener(
      "pointerdown",
      handlePointerDown,
    );

    window.addEventListener(
      "pointerup",
      handlePointerUp,
    );

    // ===================================================
    // REUSABLE VECTORS
    // ===================================================

    const desiredPosition = new THREE.Vector3();

    const desiredLookAt = new THREE.Vector3();

    const currentLookAt = new THREE.Vector3(
      0,
      1,
      0,
    );

    // ===================================================
    // CLOCK
    // ===================================================

    const clock = new THREE.Clock();

    let animationFrame = 0;

    // ===================================================
    // ANIMATION LOOP
    // ===================================================

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      // -----------------------------------------------
      // POINTER SMOOTH
      // -----------------------------------------------

      pointer.x +=
        (pointer.targetX - pointer.x) *
        0.035;

      pointer.y +=
        (pointer.targetY - pointer.y) *
        0.035;

      // -----------------------------------------------
      // SCROLL
      // -----------------------------------------------

      const progress = scroll.update();

      // -----------------------------------------------
      // CAMERA PATH
      // -----------------------------------------------

      cameraPath.getPointAt(
        progress,
        desiredPosition,
      );

      lookAtPath.getPointAt(
        progress,
        desiredLookAt,
      );

      // -----------------------------------------------
      // PARALLAX
      // -----------------------------------------------

      const parallaxStrength =
        1 - progress * 0.72;

      desiredPosition.x +=
        pointer.x *
        0.55 *
        parallaxStrength;

      desiredPosition.y -=
        pointer.y *
        0.28 *
        parallaxStrength;

      // -----------------------------------------------
      // HOLD
      // -----------------------------------------------

      holdProgress +=
        ((holding ? 1 : 0) -
          holdProgress) *
        0.055;

      desiredPosition.z -=
        holdProgress * 0.45;

      // -----------------------------------------------
      // CAMERA SMOOTH
      // -----------------------------------------------

      camera.position.lerp(
        desiredPosition,
        0.075,
      );

      currentLookAt.lerp(
        desiredLookAt,
        0.07,
      );

      camera.lookAt(currentLookAt);

      const targetFov =
        38 - holdProgress * 3;

      camera.fov +=
        (targetFov -
          camera.fov) *
        0.05;

      camera.updateProjectionMatrix();

      // =================================================
      // TRANSITION HOME → PROJECTS
      // =================================================

      const transitionStart = 0.36;
      const transitionEnd = 0.58;

      const transitionProgress =
        THREE.MathUtils.clamp(
          (progress - transitionStart) /
            (transitionEnd -
              transitionStart),
          0,
          1,
        );

      const projectProgress =
        THREE.MathUtils.clamp(
          (progress - transitionEnd) /
            (1 - transitionEnd),
          0,
          1,
        );

      // -----------------------------------------------
      // UPDATE SCENES
      // -----------------------------------------------

      home.update(
        elapsed,
        pointer.x,
        pointer.y,
        holding,
      );

      projects.update(
        elapsed,
        projectProgress,
        scroll.velocity,
      );

      // -----------------------------------------------
      // FINAL RENDER
      // -----------------------------------------------

      renderer.render(
        transitionProgress < 0.5
          ? home.scene
          : projects.scene,
        camera,
      );

      animationFrame =
        requestAnimationFrame(
          animate,
        );
    };

    animate();

    // ===================================================
    // RESIZE
    // ===================================================

    const handleResize = () => {
      const width =
        container.clientWidth;

      const height =
        container.clientHeight;

      const pixelRatio =
        Math.min(
          window.devicePixelRatio,
          2,
        );

      camera.aspect =
        width / height;

      camera.updateProjectionMatrix();

      renderer.setSize(
        width,
        height,
      );

      renderer.setPixelRatio(
        pixelRatio,
      );

    };

    window.addEventListener(
      "resize",
      handleResize,
    );

    // ===================================================
    // CLEANUP
    // ===================================================

    return () => {
      cancelAnimationFrame(
        animationFrame,
      );

      window.removeEventListener(
        "resize",
        handleResize,
      );

      window.removeEventListener(
        "pointermove",
        handlePointerMove,
      );

      window.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );

      window.removeEventListener(
        "pointerup",
        handlePointerUp,
      );

      scroll.dispose();

      home.dispose();
      projects.dispose();
      renderer.dispose();

      if (
        renderer.domElement
          .parentElement ===
        container
      ) {
        container.removeChild(
          renderer.domElement,
        );
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="experience-canvas"
      aria-hidden="true"
    />
  );
}

export default ExperienceCanvas;