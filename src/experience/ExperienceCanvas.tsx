import { useEffect, useRef } from "react";

import * as THREE from "three";

import HomeScene from "./scenes/HomeScene";
import ProjectsScene from "./scenes/ProjectsScene";

import ScrollManager from "./core/ScrollManager";
import SceneTransition from "./core/SceneTransition";

function ExperienceCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    // ===================================================
    // UI ROOT
    //
    // É o elemento pai do canvas.
    // Usamos ele para sincronizar HTML + WebGL.
    // ===================================================

    const uiRoot =
      container.parentElement as HTMLElement | null;

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

    camera.position.set(
      0,
      2.1,
      9,
    );

    // ===================================================
    // CAMERA PATH
    //
    // Define o caminho da câmera:
    //
    // Home
    // ↓
    // superfície
    // ↓
    // mergulho
    // ↓
    // Projects
    // ===================================================

    const cameraPath = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(
          0,
          2.1,
          9,
        ),

        new THREE.Vector3(
          0.25,
          2,
          7.2,
        ),

        new THREE.Vector3(
          -0.2,
          1.65,
          5.5,
        ),

        new THREE.Vector3(
          0.15,
          1.05,
          4,
        ),

        new THREE.Vector3(
          0,
          0.45,
          2.7,
        ),

        new THREE.Vector3(
          0,
          -0.25,
          1.6,
        ),

        new THREE.Vector3(
          0,
          -0.9,
          0.1,
        ),

        new THREE.Vector3(
          0,
          -1.05,
          -5,
        ),

        new THREE.Vector3(
          0,
          -1,
          -12,
        ),

        new THREE.Vector3(
          0,
          -0.9,
          -20,
        ),
      ],
      false,
      "catmullrom",
      0.5,
    );

    // ===================================================
    // LOOK AT PATH
    //
    // Define para onde a câmera olha
    // enquanto percorre o caminho.
    // ===================================================

    const lookAtPath = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(
          0,
          1,
          0,
        ),

        new THREE.Vector3(
          0,
          0.95,
          -1,
        ),

        new THREE.Vector3(
          0,
          0.75,
          -2,
        ),

        new THREE.Vector3(
          0,
          0.4,
          -3,
        ),

        new THREE.Vector3(
          0,
          0,
          -4,
        ),

        new THREE.Vector3(
          0,
          -0.5,
          -5,
        ),

        new THREE.Vector3(
          0,
          -1,
          -7,
        ),

        new THREE.Vector3(
          0,
          -1,
          -11,
        ),

        new THREE.Vector3(
          0,
          -1,
          -18,
        ),

        new THREE.Vector3(
          0,
          -1,
          -27,
        ),
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

    renderer.setPixelRatio(
      initialPixelRatio,
    );

    renderer.outputColorSpace =
      THREE.SRGBColorSpace;

    renderer.toneMapping =
      THREE.ACESFilmicToneMapping;

    renderer.toneMappingExposure =
      1;

    renderer.shadowMap.enabled =
      true;

    renderer.shadowMap.type =
      THREE.PCFSoftShadowMap;

    container.appendChild(
      renderer.domElement,
    );

    // ===================================================
    // TRANSITION SYSTEM
    //
    // Home -> RenderTarget A
    // Projects -> RenderTarget B
    //
    // SceneTransition mistura os dois.
    // ===================================================

    const transition =
      new SceneTransition(
        container.clientWidth,
        container.clientHeight,
        initialPixelRatio,
      );

    // ===================================================
    // VIRTUAL SCROLL
    // ===================================================

    const scroll =
      new ScrollManager();

    // ===================================================
    // POINTER
    // ===================================================

    const pointer = {
      x: 0,
      y: 0,

      targetX: 0,
      targetY: 0,
    };

    const handlePointerMove = (
      event: PointerEvent,
    ) => {
      pointer.targetX =
        (
          event.clientX /
            window.innerWidth -
          0.5
        ) *
        2;

      pointer.targetY =
        (
          event.clientY /
            window.innerHeight -
          0.5
        ) *
        2;
    };

    window.addEventListener(
      "pointermove",
      handlePointerMove,
    );

    // ===================================================
    // CLICK & HOLD
    // ===================================================

    let holding = false;

    let holdProgress = 0;

    const handlePointerDown =
      () => {
        holding = true;
      };

    const handlePointerUp =
      () => {
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

    const desiredPosition =
      new THREE.Vector3();

    const desiredLookAt =
      new THREE.Vector3();

    const currentLookAt =
      new THREE.Vector3(
        0,
        1,
        0,
      );

    // ===================================================
    // CLOCK
    // ===================================================

    const clock =
      new THREE.Clock();

    let animationFrame = 0;

    // ===================================================
    // ANIMATION LOOP
    // ===================================================

    const animate = () => {
      const elapsed =
        clock.getElapsedTime();

      // -----------------------------------------------
      // POINTER SMOOTH
      // -----------------------------------------------

      pointer.x +=
        (
          pointer.targetX -
          pointer.x
        ) *
        0.035;

      pointer.y +=
        (
          pointer.targetY -
          pointer.y
        ) *
        0.035;

      // -----------------------------------------------
      // VIRTUAL SCROLL
      // -----------------------------------------------

      const progress =
        scroll.update();

      // =================================================
      // DOM + WEBGL SYNC
      //
      // O mesmo scroll que move a câmera
      // controla a interface HTML.
      // =================================================

      const homeUiOpacity =
        1 -
        THREE.MathUtils.smoothstep(
          progress,
          0.27,
          0.46,
        );

      const projectsUiOpacity =
        THREE.MathUtils.smoothstep(
          progress,
          0.52,
          0.68,
        );

      const homeUiY =
        (
          1 -
          homeUiOpacity
        ) *
        -22;

      const projectsUiY =
        (
          1 -
          projectsUiOpacity
        ) *
        28;

      if (uiRoot) {
        uiRoot.style.setProperty(
          "--home-ui-opacity",
          homeUiOpacity.toFixed(4),
        );

        uiRoot.style.setProperty(
          "--projects-ui-opacity",
          projectsUiOpacity.toFixed(4),
        );

        uiRoot.style.setProperty(
          "--home-ui-y",
          `${homeUiY.toFixed(2)}px`,
        );

        uiRoot.style.setProperty(
          "--projects-ui-y",
          `${projectsUiY.toFixed(2)}px`,
        );

        if (progress < 0.46) {
          uiRoot.dataset.scene =
            "home";
        } else if (
          progress < 0.68
        ) {
          uiRoot.dataset.scene =
            "transition";
        } else {
          uiRoot.dataset.scene =
            "projects";
        }
      }

      // -----------------------------------------------
      // CAMERA POSITION
      // -----------------------------------------------

      cameraPath.getPointAt(
        progress,
        desiredPosition,
      );

      // -----------------------------------------------
      // CAMERA LOOK AT
      // -----------------------------------------------

      lookAtPath.getPointAt(
        progress,
        desiredLookAt,
      );

      // -----------------------------------------------
      // PARALLAX
      //
      // O mouse interfere cada vez menos
      // conforme a câmera mergulha.
      // -----------------------------------------------

      const parallaxStrength =
        1 -
        progress *
          0.72;

      desiredPosition.x +=
        pointer.x *
        0.55 *
        parallaxStrength;

      desiredPosition.y -=
        pointer.y *
        0.28 *
        parallaxStrength;

      // -----------------------------------------------
      // CLICK & HOLD
      // -----------------------------------------------

      holdProgress +=
        (
          (
            holding
              ? 1
              : 0
          ) -
          holdProgress
        ) *
        0.055;

      desiredPosition.z -=
        holdProgress *
        0.45;

      // -----------------------------------------------
      // CAMERA SMOOTHING
      // -----------------------------------------------

      camera.position.lerp(
        desiredPosition,
        0.075,
      );

      currentLookAt.lerp(
        desiredLookAt,
        0.07,
      );

      camera.lookAt(
        currentLookAt,
      );

      // -----------------------------------------------
      // FIELD OF VIEW
      // -----------------------------------------------

      const targetFov =
        38 -
        holdProgress *
          3;

      camera.fov +=
        (
          targetFov -
          camera.fov
        ) *
        0.05;

      camera.updateProjectionMatrix();

      // =================================================
      // HOME → PROJECTS TRANSITION
      // =================================================

      const transitionStart =
        0.36;

      const transitionEnd =
        0.58;

      const transitionProgress =
        THREE.MathUtils.clamp(
          (
            progress -
            transitionStart
          ) /
            (
              transitionEnd -
              transitionStart
            ),
          0,
          1,
        );

      // =================================================
      // PROJECTS PROGRESS
      // =================================================

      const projectProgress =
        THREE.MathUtils.clamp(
          (
            progress -
            transitionEnd
          ) /
            (
              1 -
              transitionEnd
            ),
          0,
          1,
        );

      // -----------------------------------------------
      // UPDATE HOME
      // -----------------------------------------------

      home.update(
        elapsed,
        pointer.x,
        pointer.y,
        holding,
      );

      // -----------------------------------------------
      // UPDATE PROJECTS
      //
      // ProjectsScene.update recebe:
      //
      // 1. tempo
      // 2. progresso
      // 3. velocidade do scroll
      // -----------------------------------------------

      projects.update(
        elapsed,
        projectProgress,
        scroll.velocity,
      );

      // =================================================
      // FINAL RENDER
      //
      // IMPORTANTE:
      // Não fazemos uma troca seca:
      //
      // renderer.render(home)
      // renderer.render(projects)
      //
      // SceneTransition mistura as cenas.
      // =================================================

      transition.render(
        renderer,
        home.scene,
        projects.scene,
        camera,
        transitionProgress,
        elapsed,
      );

      // -----------------------------------------------
      // NEXT FRAME
      // -----------------------------------------------

      animationFrame =
        requestAnimationFrame(
          animate,
        );
    };

    animate();

    // ===================================================
    // RESIZE
    // ===================================================

    const handleResize =
      () => {
        const width =
          container.clientWidth;

        const height =
          container.clientHeight;

        const pixelRatio =
          Math.min(
            window.devicePixelRatio,
            2,
          );

        // Camera

        camera.aspect =
          width /
          height;

        camera.updateProjectionMatrix();

        // Renderer

        renderer.setSize(
          width,
          height,
        );

        renderer.setPixelRatio(
          pixelRatio,
        );

        // RenderTargets

        transition.resize(
          width,
          height,
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

      transition.dispose();

      renderer.dispose();

      // -----------------------------------------------
      // REMOVE CSS VARIABLES
      // -----------------------------------------------

      if (uiRoot) {
        uiRoot.style.removeProperty(
          "--home-ui-opacity",
        );

        uiRoot.style.removeProperty(
          "--projects-ui-opacity",
        );

        uiRoot.style.removeProperty(
          "--home-ui-y",
        );

        uiRoot.style.removeProperty(
          "--projects-ui-y",
        );

        delete uiRoot.dataset.scene;
      }

      // -----------------------------------------------
      // REMOVE CANVAS
      // -----------------------------------------------

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