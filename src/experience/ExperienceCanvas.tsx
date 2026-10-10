import {
  useEffect,
  useLayoutEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";

import * as THREE from "three";

import HomeScene from "./scenes/HomeScene";
import AudioManager from "./audio/AudioManager";
import ContactScene from "./scenes/ContactScene";
import ProjectsScene, {
  PROJECT_SCENE_CONFIG,
  type ProjectFilter,
} from "./scenes/ProjectsScene";
import {
  HOME_CAMERA_FAR,
  HOME_CAMERA_FOV,
  HOME_CAMERA_NEAR,
  HOME_CAMERA_START,
  HOME_PARALLAX_X,
  HOME_PARALLAX_Y,
} from "./config/visual";
import type { ProjectItem } from "./data/projects";

import ScrollManager, {
  EXPERIENCE_SCROLL_CONFIG,
} from "./core/ScrollManager";
import {
  getQualityPixelRatio,
  getQualitySettings,
} from "./core/quality";
import SceneTransition from "./core/SceneTransition";
import DebugHud from "./core/debugHud";
import WorldInteractionManager from "./core/WorldInteractionManager";
import WorldScene, {
  WORLD_SCENE_CONFIG,
  type WorldSelection,
} from "./scenes/WorldScene";
import {
  ensureVisualDebugController,
  getVisualDebugStateFromEvent,
  readVisualDebugState,
  type VisualDebugState,
} from "./core/visualDebug";

export type ExperienceSceneSection =
  | "home"
  | "projects";

export type ExperienceCanvasHandle = {
  navigateTo: (
    section: ExperienceSceneSection | "contact" | "world",
  ) => void;
};

type ExperienceNavigationSection =
  | ExperienceSceneSection
  | "contact"
  | "world";

type ExperienceCanvasProps = {
  projectFilter: ProjectFilter;
  audioManager: AudioManager;
  initialSection: ExperienceNavigationSection;
  onSceneSectionChange: (section: ExperienceSceneSection) => void;
  onWorldSelectionChange: (selection: WorldSelection | null) => void;
  onProjectSelect: (project: ProjectItem) => void;
};

const ExperienceCanvas = forwardRef<
  ExperienceCanvasHandle,
  ExperienceCanvasProps
>(function ExperienceCanvas({
  projectFilter,
  audioManager,
  initialSection,
  onSceneSectionChange,
  onWorldSelectionChange,
  onProjectSelect,
}, ref) {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const projectFilterRef =
    useRef(projectFilter);

  const initialSectionRef =
    useRef(initialSection);

  const onSceneSectionChangeRef =
    useRef(onSceneSectionChange);

  const onWorldSelectionChangeRef =
    useRef(onWorldSelectionChange);

  const onProjectSelectRef =
    useRef(onProjectSelect);

  const scrollManagerRef =
    useRef<ScrollManager | null>(null);

  const pendingNavigationRef =
    useRef<ExperienceNavigationSection | null>(null);

  const lastReportedSceneSectionRef =
    useRef<ExperienceSceneSection>("home");

  useLayoutEffect(() => {
    projectFilterRef.current = projectFilter;
  }, [projectFilter]);

  useLayoutEffect(() => {
    initialSectionRef.current = initialSection;
    onSceneSectionChangeRef.current = onSceneSectionChange;
    onWorldSelectionChangeRef.current = onWorldSelectionChange;
    onProjectSelectRef.current = onProjectSelect;
  }, [
    initialSection,
    onSceneSectionChange,
    onWorldSelectionChange,
    onProjectSelect,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      navigateTo: (section) => {
        pendingNavigationRef.current = section;
        if (section === "home" || section === "projects") {
          scrollManagerRef.current?.navigateTo(section);
        }
      },
    }),
    [],
  );

  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    // ===================================================
    // UI ROOT
    // ===================================================

    const uiRoot =
      container.parentElement as
        | HTMLElement
        | null;

    const quality = getQualitySettings();

    // ===================================================
    // SCENES
    // ===================================================

    const home =
      new HomeScene(quality);

    const projects =
      new ProjectsScene(quality);
    projects.attachMetaLayer(
      uiRoot?.querySelector<HTMLElement>(".project-meta-layer") ??
        null,
    );

    const contact =
      new ContactScene();

    const world =
      new WorldScene(quality);

    // ===================================================
    // CAMERAS
    // ===================================================

    const homeCamera =
      new THREE.PerspectiveCamera(
        HOME_CAMERA_FOV,
        container.clientWidth /
          container.clientHeight,
        HOME_CAMERA_NEAR,
        HOME_CAMERA_FAR,
      );

    homeCamera.position.set(
      ...HOME_CAMERA_START,
    );

    const projectsCamera =
      new THREE.PerspectiveCamera(
        PROJECT_SCENE_CONFIG.cameraFov,
        container.clientWidth /
          container.clientHeight,
        PROJECT_SCENE_CONFIG.cameraNear,
        PROJECT_SCENE_CONFIG.cameraFar,
      );

    projectsCamera.position.set(
      0,
      0,
      PROJECT_SCENE_CONFIG.cameraZ,
    );

    projectsCamera.lookAt(
      0,
      0,
      PROJECT_SCENE_CONFIG.cameraTargetZ,
    );

    const contactCamera =
      new THREE.PerspectiveCamera(
        42,
        container.clientWidth /
          container.clientHeight,
        0.1,
        100,
      );
    contactCamera.position.set(0, 1.55, 12);
    contactCamera.lookAt(0, 1.1, -4);

    const worldCamera =
      new THREE.PerspectiveCamera(
        WORLD_SCENE_CONFIG.cameraFov,
        container.clientWidth / container.clientHeight,
        WORLD_SCENE_CONFIG.cameraNear,
        WORLD_SCENE_CONFIG.cameraFar,
      );
    worldCamera.position.set(0, 0, WORLD_SCENE_CONFIG.cameraZ);
    worldCamera.lookAt(0, 0, 0);

    // ===================================================
    // HOME CAMERA PATH
    // ===================================================

    const cameraPath =
      new THREE.CatmullRomCurve3(
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
    // ===================================================

    const lookAtPath =
      new THREE.CatmullRomCurve3(
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
    // ===================================================
    // RENDERER
    // ===================================================

    const renderer =
      new THREE.WebGLRenderer({
        antialias: true,
        powerPreference:
          "high-performance",
      });

    const initialPixelRatio =
      getQualityPixelRatio(quality);
    renderer.domElement.dataset.qualityMode = quality.mode;
    renderer.domElement.dataset.pixelRatio =
      initialPixelRatio.toString();

    renderer.setPixelRatio(
      initialPixelRatio,
    );

    renderer.setSize(
      container.clientWidth,
      container.clientHeight,
    );

    renderer.outputColorSpace =
      THREE.SRGBColorSpace;

    renderer.toneMapping =
      THREE.ACESFilmicToneMapping;

    renderer.toneMappingExposure =
      1;

    renderer.shadowMap.enabled =
      quality.shadows;

    renderer.shadowMap.type =
      THREE.PCFSoftShadowMap;

    container.appendChild(
      renderer.domElement,
    );

    const debugHud = readVisualDebugState().enabled
      ? new DebugHud(container)
      : null;
    // ===================================================
    // SCENE TRANSITION
    // ===================================================

    const transition =
      new SceneTransition(
        container.clientWidth,
        container.clientHeight,
        initialPixelRatio,
      );

    home.resizeReflection(
      container.clientWidth,
      container.clientHeight,
      initialPixelRatio,
    );

    projects.resize(
      container.clientWidth,
      container.clientHeight,
    );

    // ===================================================
    // SCROLL
    // ===================================================

    const scroll =
      new ScrollManager();
    scrollManagerRef.current = scroll;
    scroll.setProjectsMaxOffset(
      projects.getProjectsMaxOffset(projectFilterRef.current),
    );
    let activeProjectFilter: ProjectFilter = "All";
    let visualDebug = readVisualDebugState();
    const applyVisualDebugState = (
      nextState: VisualDebugState,
    ) => {
      visualDebug = nextState;
      if (!nextState.enabled) return;
      scroll.setEnabled(
        !nextState.paused &&
          initialSectionRef.current !== "world",
      );
      scroll.setDebugProgress(nextState);
    };
    const debugController = ensureVisualDebugController();
    const handleDebugChange = (event: Event) => {
      const nextState = getVisualDebugStateFromEvent(event);
      if (nextState) applyVisualDebugState(nextState);
    };
    window.addEventListener(
      "unseen-debug-change",
      handleDebugChange,
    );
    pendingNavigationRef.current =
      initialSectionRef.current === "projects"
        ? "projects"
        : initialSectionRef.current === "contact" ||
            initialSectionRef.current === "world"
          ? initialSectionRef.current
          : null;
    lastReportedSceneSectionRef.current = "home";
    scroll.navigateTo(
      initialSectionRef.current === "projects"
        ? "projects"
        : "home",
    );
    scroll.setEnabled(
      initialSectionRef.current !== "world" &&
        !visualDebug.paused,
    );
    if (debugController) {
      applyVisualDebugState(debugController.state);
    }

    // ===================================================
    // POINTER
    // ===================================================

    const pointer = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      clientX: 0,
      clientY: 0,
      hasMoved: false,
    };

    let projectCardsEnabled = false;

    const handlePointerMove = (
      event: PointerEvent,
    ) => {
      pointer.clientX = event.clientX;
      pointer.clientY = event.clientY;
      pointer.hasMoved = true;
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

    let projectPointerStart: { x: number; y: number } | null = null;
    const handleProjectPointerDown = (event: PointerEvent) => {
      if (!projectCardsEnabled || event.button !== 0) return;
      projectPointerStart = {
        x: event.clientX,
        y: event.clientY,
      };
    };
    const handleProjectPointerUp = (event: PointerEvent) => {
      if (!projectPointerStart) return;
      const pointerDistance = Math.hypot(
        event.clientX - projectPointerStart.x,
        event.clientY - projectPointerStart.y,
      );
      projectPointerStart = null;
      if (pointerDistance > 5) return;

      const project = projects.getProjectAt(
        event.clientX,
        event.clientY,
        projectsCamera,
        renderer.domElement.getBoundingClientRect(),
      );
      if (project) onProjectSelectRef.current(project);
    };
    renderer.domElement.addEventListener(
      "pointerdown",
      handleProjectPointerDown,
    );
    renderer.domElement.addEventListener(
      "pointerup",
      handleProjectPointerUp,
    );

    // ===================================================
    // REUSABLE VECTORS
    // ===================================================

    const desiredHomePosition =
      new THREE.Vector3();

    const desiredHomeLookAt =
      new THREE.Vector3();

    const currentHomeLookAt =
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
    let lastFrameTime = 0;
    let sceneElapsed = 0;
    let contactProgress = 0;
    let contactTarget = 0;
    let contactOriginSection: ExperienceSceneSection = "home";
    let contactReturnSection: ExperienceSceneSection | null = null;
    const contactOriginPosition = new THREE.Vector3();
    const contactDestinationPosition = new THREE.Vector3(0, 1.55, 12);
    const contactOriginLookAt = new THREE.Vector3();
    const contactDestinationLookAt = new THREE.Vector3(0, 1.1, -4);
    const contactCameraLookAt = new THREE.Vector3();
    let observedNavigation: ExperienceNavigationSection =
      initialSectionRef.current === "contact" ||
      initialSectionRef.current === "world"
        ? "home"
        : initialSectionRef.current;
    let worldProgress = initialSectionRef.current === "world" ? 1 : 0;
    let worldTarget = worldProgress;
    let worldOriginSection: ExperienceSceneSection =
      initialSectionRef.current === "projects" ? "projects" : "home";
    let worldReturnSection: ExperienceNavigationSection | null = null;
    const worldInteraction = new WorldInteractionManager(
      renderer.domElement,
      world,
      worldCamera,
      {
        onHover: (selection) => {
          if (uiRoot) {
            uiRoot.dataset.cursorTarget = selection
              ? "project"
              : "draggable";
          }
        },
        onSelect: (selection) =>
          onWorldSelectionChangeRef.current(selection),
      },
    );
    worldInteraction.setActive(initialSectionRef.current === "world");


    // ===================================================
    // ANIMATION
    // ===================================================

    const frameInterval = 1000 / quality.maxFps;
    const animate = (frameTime = performance.now()) => {
      if (frameTime - lastFrameTime < frameInterval) {
        animationFrame = requestAnimationFrame(animate);
        return;
      }
      lastFrameTime = frameTime;

      const deltaSeconds =
        clock.getDelta();
      const motionDelta =
        visualDebug.enabled && visualDebug.paused
          ? 0
          : deltaSeconds;

      if (
        !visualDebug.enabled ||
        (!visualDebug.paused && !visualDebug.freezeTime)
      ) {
        sceneElapsed += deltaSeconds;
      }

      const elapsed = sceneElapsed;

      // -----------------------------------------------
      // POINTER SMOOTHING
      // -----------------------------------------------

      if (!visualDebug.enabled || !visualDebug.paused) {
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
      }

      // -----------------------------------------------
      // SCROLL
      // -----------------------------------------------

      if (activeProjectFilter !== projectFilterRef.current) {
        activeProjectFilter = projectFilterRef.current;
        projects.setFilter(activeProjectFilter, elapsed);
        scroll.setProjectsMaxOffset(
          projects.getProjectsMaxOffset(activeProjectFilter),
        );
      }
      const scrollState = scroll.update(motionDelta);

      if (debugHud) {
        const hudSection =
          worldProgress > 0 || worldTarget > 0
            ? "world"
            : contactProgress > 0 || contactTarget > 0
              ? "contact"
              : scrollState.phase;
        debugHud.tick(frameTime, {
          scene: hudSection,
          homeProgress: scrollState.homeProgress,
          transitionProgress: scrollState.transitionProgress,
          projectsOffset: scrollState.projectsOffset,
          projectsMaxOffset: projects.getProjectsMaxOffset(activeProjectFilter),
          camera:
            hudSection === "world"
              ? worldCamera
              : hudSection === "contact"
                ? contactCamera
                : hudSection === "projects"
                  ? projectsCamera
                  : homeCamera,
          soundEnabled: !audioManager.state.muted,
        });
      }
      const requestedNavigation = pendingNavigationRef.current;
      if (
        requestedNavigation &&
        requestedNavigation !== observedNavigation
      ) {
        if (requestedNavigation === "world") {
          worldOriginSection =
            scrollState.phase === "projects" ||
            scrollState.transitionProgress >= 0.5
              ? "projects"
              : "home";
          worldTarget = 1;
          worldReturnSection = null;
          contactTarget = 0;
          contactProgress = 0;
          scroll.setEnabled(false);
          worldInteraction.setActive(true);
          onWorldSelectionChangeRef.current(null);
        } else if (requestedNavigation === "contact") {
          if (observedNavigation === "world") {
            worldTarget = 0;
            worldInteraction.setActive(false);
          }
          contactOriginSection =
            scrollState.phase === "projects" ||
            scrollState.transitionProgress >= 0.5
              ? "projects"
              : "home";
          const originCamera =
            contactOriginSection === "projects"
              ? projectsCamera
              : homeCamera;
          contactOriginPosition.copy(originCamera.position);
          originCamera.getWorldDirection(contactOriginLookAt);
          contactOriginLookAt
            .multiplyScalar(10)
            .add(originCamera.position);
          contactTarget = 1;
          contactReturnSection = null;
        } else if (observedNavigation === "world") {
          worldTarget = 0;
          worldReturnSection = requestedNavigation;
          worldInteraction.setActive(false);
        } else if (observedNavigation === "contact") {
          contactTarget = 0;
          contactReturnSection = requestedNavigation;
        } else {
          scroll.navigateTo(requestedNavigation);
        }
        observedNavigation = requestedNavigation;
      }

      const worldDamping =
        1 - Math.exp(-3.6 * Math.max(0, motionDelta));
      worldProgress += (worldTarget - worldProgress) * worldDamping;
      if (Math.abs(worldTarget - worldProgress) < 0.0001) {
        worldProgress = worldTarget;
      }
      if (worldProgress > 0 || worldTarget > 0) {
        worldInteraction.update(motionDelta, elapsed);
      }

      if (worldProgress === 0 && worldReturnSection) {
        const destination = worldReturnSection;
        worldReturnSection = null;
        if (destination === "contact") {
          scroll.setEnabled(true);
          pendingNavigationRef.current = "contact";
          observedNavigation = "world";
        } else if (
          destination === "home" ||
          destination === "projects"
        ) {
          scroll.setEnabled(true);
          scroll.navigateTo(destination);
          pendingNavigationRef.current = destination;
        }
      }

      const contactDamping =
        1 - Math.exp(-3.8 * Math.max(0, motionDelta));
      contactProgress +=
        (contactTarget - contactProgress) * contactDamping;
      if (Math.abs(contactTarget - contactProgress) < 0.0001) {
        contactProgress = contactTarget;
      }

      if (
        contactProgress === 0 &&
        contactReturnSection
      ) {
        scroll.setEnabled(true);
        scroll.navigateTo(contactReturnSection);
        pendingNavigationRef.current = contactReturnSection;
        contactReturnSection = null;
      }

      const contactSmoothProgress =
        contactProgress * contactProgress *
        (3 - 2 * contactProgress);
      const contactPathPosition = desiredHomePosition
        .copy(contactOriginPosition)
        .lerp(contactDestinationPosition, contactSmoothProgress);
      contactPathPosition.y +=
        Math.sin(Math.PI * contactSmoothProgress) * 1.1;
      if (visualDebug.enabled && visualDebug.paused) {
        contactCamera.position.copy(contactPathPosition);
      } else {
        contactCamera.position.lerp(contactPathPosition, 0.18);
      }
      contactCameraLookAt
        .copy(contactOriginLookAt)
        .lerp(contactDestinationLookAt, contactSmoothProgress);
      contactCamera.lookAt(contactCameraLookAt);
      contact.update(elapsed);

      const sceneSection: ExperienceSceneSection =
        scrollState.phase === "projects"
          ? "projects"
          : "home";

      const pendingNavigation =
        pendingNavigationRef.current;
      const reachedRequestedScene =
        pendingNavigation === "home"
          ? scrollState.phase === "home"
          : pendingNavigation === "projects"
            ? scrollState.phase === "projects" &&
              scrollState.transitionProgress >= 1
            : true;

      if (
        reachedRequestedScene &&
        (sceneSection === "home" &&
          scrollState.phase === "home") ||
        (reachedRequestedScene &&
          sceneSection === "projects" &&
          scrollState.transitionProgress >= 1)
      ) {
        if (pendingNavigation === sceneSection) {
          pendingNavigationRef.current = null;
        }
        if (
          sceneSection !==
          lastReportedSceneSectionRef.current
        ) {
          lastReportedSceneSectionRef.current = sceneSection;
          onSceneSectionChangeRef.current(sceneSection);
        }
      }

      audioManager.updateTransition(
        contactProgress > 0
          ? contactProgress
          : scrollState.transitionProgress,
        contactProgress > 0
          ? contactProgress >= 0.999
          : scrollState.phase === "projects",
      );

      // =================================================
      // UI SYNCHRONIZATION
      // =================================================

      const homeUiOpacity =
        1 -
        THREE.MathUtils.smoothstep(
          scrollState.homeProgress,
          EXPERIENCE_SCROLL_CONFIG.homeUiFadeStart,
          1,
        );

      const projectsUiOpacity =
        scrollState.phase === "home"
          ? 0
          : THREE.MathUtils.smoothstep(
              scrollState.transitionProgress,
              EXPERIENCE_SCROLL_CONFIG.projectsUiFadeStart,
              1,
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
        const projectsEndProgress =
          projects.getEndSectionProgress(
            scrollState.projectsCurrentOffset,
          );
        const projectsHelloProgress =
          THREE.MathUtils.smoothstep(
            projectsEndProgress,
            0.42,
            0.88,
          );
        uiRoot.style.setProperty(
          "--home-ui-opacity",
          homeUiOpacity.toFixed(4),
        );

        uiRoot.style.setProperty(
          "--projects-ui-opacity",
          projectsUiOpacity.toFixed(
            4,
          ),
        );

        uiRoot.style.setProperty(
          "--home-ui-y",
          `${homeUiY.toFixed(
            2,
          )}px`,
        );

        uiRoot.style.setProperty(
          "--projects-ui-y",
          `${projectsUiY.toFixed(
            2,
          )}px`,
        );
        uiRoot.style.setProperty(
          "--projects-end-progress",
          projectsEndProgress.toFixed(4),
        );
        uiRoot.style.setProperty(
          "--projects-content-opacity",
          (1 - projectsEndProgress).toFixed(4),
        );
        uiRoot.style.setProperty(
          "--projects-hello-progress",
          projectsHelloProgress.toFixed(4),
        );
        uiRoot.style.setProperty(
          "--projects-hello-y",
          `${((1 - projectsHelloProgress) * 12).toFixed(2)}px`,
        );

        uiRoot.dataset.scene =
          scrollState.phase;
        uiRoot.dataset.projectsEndProgress =
          projectsEndProgress.toFixed(4);
        uiRoot.dataset.projectsEnded =
          projectsEndProgress >= 0.999 ? "true" : "false";
        if (visualDebug.enabled) {
          uiRoot.dataset.debugReady = "true";
          uiRoot.dataset.projectCount =
            projects.getProjectCount().toString();
          uiRoot.dataset.projectsOffset =
            scrollState.projectsCurrentOffset.toFixed(4);
          uiRoot.dataset.projectsTargetOffset =
            scrollState.projectsTargetOffset.toFixed(4);
          uiRoot.dataset.projectsMaxOffset =
            scrollState.projectsMaxOffset.toFixed(4);
          uiRoot.dataset.projectRows =
            projects.getProjectRowCount(projectFilterRef.current).toString();
          uiRoot.dataset.projectsCameraZ =
            projectsCamera.position.z.toFixed(4);
        }
      }

      // =================================================
      // HOME CAMERA
      // =================================================

      cameraPath.getPointAt(
        scrollState.homeCameraPathProgress,
        desiredHomePosition,
      );

      lookAtPath.getPointAt(
        scrollState.homeCameraPathProgress,
        desiredHomeLookAt,
      );

      // =================================================
      // HOME PARALLAX
      // =================================================

      const transitionParallaxReduction =
        THREE.MathUtils.smoothstep(
          scrollState.transitionProgress,
          EXPERIENCE_SCROLL_CONFIG.homeParallaxFadeStart,
          1,
        );

      const parallaxStrength =
        THREE.MathUtils.lerp(
          1,
          EXPERIENCE_SCROLL_CONFIG.homeParallaxEndStrength,
          transitionParallaxReduction,
        );

      desiredHomePosition.x +=
        pointer.x *
        HOME_PARALLAX_X *
        parallaxStrength;

      desiredHomePosition.y -=
        pointer.y *
        HOME_PARALLAX_Y *
        parallaxStrength;

      // =================================================
      // CLICK & HOLD
      //
      // O efeito desaparece quando chegamos
      // em Projects para não provocar zoom.
      // =================================================

      if (!visualDebug.enabled || !visualDebug.paused) {
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
      }

      const holdHomeStrength =
        1 -
        scrollState.transitionProgress;

      desiredHomePosition.z -=
        holdProgress *
        0.45 *
        holdHomeStrength;

      // =================================================
      // HOME CAMERA SMOOTHING
      // =================================================

      if (visualDebug.enabled && visualDebug.paused) {
        homeCamera.position.copy(desiredHomePosition);
        currentHomeLookAt.copy(desiredHomeLookAt);
      } else {
        homeCamera.position.lerp(
          desiredHomePosition,
          0.075,
        );

        currentHomeLookAt.lerp(
          desiredHomeLookAt,
          0.07,
        );
      }

      homeCamera.lookAt(
        currentHomeLookAt,
      );

      // =================================================
      // HOME FOV
      // =================================================

      const targetFov =
        38 -
        holdProgress *
          3 *
          holdHomeStrength;

      if (visualDebug.enabled && visualDebug.paused) {
        homeCamera.fov = targetFov;
      } else {
        homeCamera.fov +=
          (
            targetFov -
            homeCamera.fov
          ) *
          0.05;
      }

      homeCamera.updateProjectionMatrix();

      // =================================================
      // HOME UPDATE
      // =================================================

      const homeVisible =
        scrollState.transitionProgress < 0.999 ||
        ((worldProgress > 0.001 || worldTarget > 0.001) &&
          worldOriginSection === "home") ||
        ((contactProgress > 0.001 || contactTarget > 0.001) &&
          contactOriginSection === "home");
      if (homeVisible) {
        home.update(
          elapsed,
          pointer.x,
          pointer.y,
          holding,
          homeCamera,
          visualDebug.enabled && visualDebug.freezeParticles,
        );
        home.renderReflection(
          renderer,
          homeCamera,
        );
      }

      // =================================================
      // PROJECTS UPDATE
      // =================================================

      projects.update(
        elapsed,
        scrollState.projectsOffset,
        scrollState.scrollVelocity,
        visualDebug.enabled && visualDebug.freezeParticles,
      );
      projectCardsEnabled =
        scrollState.phase === "projects" &&
        scrollState.transitionProgress >= 1 &&
        contactProgress <= 0 &&
        worldProgress <= 0;
      projectsCamera.updateMatrixWorld();
      projects.updateMeta(
        projectsCamera,
        container.clientWidth,
        container.clientHeight,
        projectCardsEnabled,
      );

      if (uiRoot) {
        const overProject =
          scrollState.phase === "projects" &&
          pointer.hasMoved &&
          projects.isProjectAt(
            pointer.clientX,
            pointer.clientY,
            projectsCamera,
            renderer.domElement.getBoundingClientRect(),
          );
        uiRoot.dataset.cursorTarget = overProject
          ? "project"
          : "draggable";
      }

      // =================================================
      // FINAL RENDER
      // =================================================

      if (worldProgress > 0 || worldTarget > 0) {
        const originScene =
          worldOriginSection === "projects"
            ? projects.scene
            : home.scene;
        const originCamera =
          worldOriginSection === "projects"
            ? projectsCamera
            : homeCamera;
        const exitingWorld = worldTarget === 0;

        transition.render(
          renderer,
          exitingWorld ? world.scene : originScene,
          exitingWorld ? worldCamera : originCamera,
          exitingWorld ? originScene : world.scene,
          exitingWorld ? originCamera : worldCamera,
          exitingWorld ? 1 - worldProgress : worldProgress,
          elapsed,
          scrollState.scrollVelocity,
          scrollState.direction,
        );
      } else if (contactProgress > 0 || contactTarget > 0) {
        const originScene =
          contactOriginSection === "projects"
            ? projects.scene
            : home.scene;
        const originCamera =
          contactOriginSection === "projects"
            ? projectsCamera
            : homeCamera;
        const exitingContact = contactTarget === 0;

        transition.render(
          renderer,
          exitingContact ? contact.scene : originScene,
          exitingContact ? contactCamera : originCamera,
          exitingContact ? originScene : contact.scene,
          exitingContact ? originCamera : contactCamera,
          exitingContact ? 1 - contactProgress : contactProgress,
          elapsed,
          scrollState.scrollVelocity,
          scrollState.direction,
        );
      } else {
        transition.render(
          renderer,
          home.scene,
          homeCamera,
          projects.scene,
          projectsCamera,
          scrollState.transitionProgress,
          elapsed,
          scrollState.scrollVelocity,
          scrollState.direction,
        );
      }

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
        if (width <= 0 || height <= 0) return;

        const pixelRatio =
          getQualityPixelRatio(quality);
        renderer.domElement.dataset.pixelRatio =
          pixelRatio.toString();

        const aspect =
          width /
          height;

        homeCamera.aspect =
          aspect;

        homeCamera.updateProjectionMatrix();

        projectsCamera.aspect =
          aspect;

        projectsCamera.updateProjectionMatrix();

        contactCamera.aspect = aspect;
        contactCamera.updateProjectionMatrix();

        worldCamera.aspect = aspect;
        worldCamera.updateProjectionMatrix();

        renderer.setPixelRatio(
          pixelRatio,
        );

        renderer.setSize(
          width,
          height,
        );

        home.resizeReflection(
          width,
          height,
          pixelRatio,
        );

        projects.resize(
          width,
          height,
        );
        scroll.setProjectsMaxOffset(
          projects.getProjectsMaxOffset(projectFilterRef.current),
        );

        transition.resize(
          width,
          height,
          pixelRatio,
        );
      };

    let resizeFrame = 0;
    const scheduleResize = () => {
      if (resizeFrame !== 0) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        handleResize();
      });
    };
    const resizeObserver = new ResizeObserver(scheduleResize);
    resizeObserver.observe(container);
    window.addEventListener("resize", scheduleResize);
    window.addEventListener("orientationchange", scheduleResize);

    // ===================================================
    // CLEANUP
    // ===================================================

    return () => {
      debugHud?.dispose();
      cancelAnimationFrame(
        animationFrame,
      );
      if (resizeFrame !== 0) {
        cancelAnimationFrame(resizeFrame);
      }
      resizeObserver.disconnect();

      window.removeEventListener(
        "resize",
        scheduleResize,
      );
      window.removeEventListener(
        "orientationchange",
        scheduleResize,
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

      renderer.domElement.removeEventListener(
        "pointerdown",
        handleProjectPointerDown,
      );
      renderer.domElement.removeEventListener(
        "pointerup",
        handleProjectPointerUp,
      );
      window.removeEventListener(
        "unseen-debug-change",
        handleDebugChange,
      );

      scroll.dispose();
      scrollManagerRef.current = null;
      worldInteraction.dispose();

      home.dispose();

      projects.dispose();

      contact.dispose();

      world.dispose();

      transition.dispose();

      renderer.dispose();

      if (uiRoot) {
        uiRoot.style.removeProperty(
          "--home-ui-opacity",
        );
        uiRoot.style.removeProperty(
          "--projects-end-progress",
        );
        uiRoot.style.removeProperty(
          "--projects-content-opacity",
        );
        uiRoot.style.removeProperty(
          "--projects-hello-progress",
        );
        uiRoot.style.removeProperty(
          "--projects-hello-y",
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
        delete uiRoot.dataset.cursorTarget;
      }

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
  }, [audioManager]);

  return (
    <div
      ref={containerRef}
      className="experience-canvas"
      data-cursor="draggable"
      aria-hidden="true"
    />
  );
});

export default ExperienceCanvas;