export type ExperienceScrollPhase =
  | "home"
  | "transition"
  | "projects";

export type ExperienceScrollState = {
  homeProgress: number;
  transitionProgress: number;
  homeCameraPathProgress: number;
  projectsOffset: number;
  projectsTargetOffset: number;
  projectsCurrentOffset: number;
  projectsMaxOffset: number;
  scrollVelocity: number;
  direction: -1 | 0 | 1;
  phase: ExperienceScrollPhase;
};

export type ExperienceScrollConfig = {
  homeScrollLength: number;
  transitionScrollLength: number;
  projectsScrollUnit: number;
  homeCameraPathAtTransitionStart: number;
  homeCameraPathEnd: number;
  dampingRate: number;
  wheelStrength: number;
  touchStrength: number;
  directionEpsilon: number;
  settleEpsilon: number;
  homeUiFadeStart: number;
  homeParallaxFadeStart: number;
  projectsUiFadeStart: number;
  homeParallaxEndStrength: number;
};

export const EXPERIENCE_SCROLL_CONFIG:
  Readonly<ExperienceScrollConfig> = {
    homeScrollLength: 0.36,
    transitionScrollLength: 0.22,
    projectsScrollUnit: 0.42,
    homeCameraPathAtTransitionStart: 0.36,
    homeCameraPathEnd: 0.58,
    dampingRate: 4,
    wheelStrength: 0.00055,
    touchStrength: 0.0025,
    directionEpsilon: 0.000001,
    settleEpsilon: 0.0001,
    homeUiFadeStart: 0.75,
    homeParallaxFadeStart: 0.27,
    projectsUiFadeStart: 0.73,
    homeParallaxEndStrength: 0,
  };

class ScrollManager {
  private currentPosition = 0;
  private targetPosition = 0;
  private previousPosition = 0;
  private touchY = 0;
  private enabled = true;
  private projectsMaxOffset = 0;

  private readonly config: Readonly<ExperienceScrollConfig>;

  private readonly state: ExperienceScrollState = {
    homeProgress: 0,
    transitionProgress: 0,
    homeCameraPathProgress: 0,
    projectsOffset: 0,
    projectsTargetOffset: 0,
    projectsCurrentOffset: 0,
    projectsMaxOffset: 0,
    scrollVelocity: 0,
    direction: 0,
    phase: "home",
  };

  constructor(
    config: ExperienceScrollConfig =
      EXPERIENCE_SCROLL_CONFIG,
  ) {
    if (
      config.homeScrollLength <= 0 ||
      config.transitionScrollLength <= 0 ||
      config.projectsScrollUnit <= 0 ||
      config.homeCameraPathAtTransitionStart < 0 ||
      config.homeCameraPathEnd <
        config.homeCameraPathAtTransitionStart ||
      config.dampingRate <= 0 ||
      config.wheelStrength <= 0 ||
      config.touchStrength <= 0 ||
      config.directionEpsilon < 0 ||
      config.settleEpsilon <= config.directionEpsilon ||
      config.homeUiFadeStart < 0 ||
      config.homeUiFadeStart > 1 ||
      config.homeParallaxFadeStart < 0 ||
      config.homeParallaxFadeStart > 1 ||
      config.projectsUiFadeStart < 0 ||
      config.projectsUiFadeStart > 1 ||
      config.homeParallaxEndStrength < 0 ||
      config.homeParallaxEndStrength > 1
    ) {
      throw new Error(
        "Invalid experience scroll configuration.",
      );
    }

    this.config = config;

    window.addEventListener(
      "wheel",
      this.handleWheel,
      { passive: false },
    );

    window.addEventListener(
      "touchstart",
      this.handleTouchStart,
      { passive: true },
    );

    window.addEventListener(
      "touchmove",
      this.handleTouchMove,
      { passive: false },
    );
  }

  private handleWheel = (
    event: WheelEvent,
  ) => {
    if (!this.enabled) return;
    event.preventDefault();

    this.targetPosition = clamp(
      this.targetPosition +
        event.deltaY * this.config.wheelStrength,
      0,
      this.getMaximumPosition(),
    );
  };

  private handleTouchStart = (
    event: TouchEvent,
  ) => {
    if (!this.enabled) return;
    const touch =
      event.touches[0];

    if (!touch) return;

    this.touchY = touch.clientY;
  };

  private handleTouchMove = (
    event: TouchEvent,
  ) => {
    if (!this.enabled) return;
    const touch =
      event.touches[0];

    if (!touch) return;

    event.preventDefault();

    const delta =
      this.touchY -
      touch.clientY;

    this.touchY =
      touch.clientY;

    this.targetPosition = clamp(
      this.targetPosition +
        delta * this.config.touchStrength,
      0,
      this.getMaximumPosition(),
    );
  };

  update(
    deltaSeconds: number,
  ): ExperienceScrollState {
    this.targetPosition = clamp(
      this.targetPosition,
      0,
      this.getMaximumPosition(),
    );
    this.previousPosition =
      this.currentPosition;

    const damping =
      1 -
      Math.exp(
        -this.config.dampingRate *
          Math.max(0, deltaSeconds),
      );

    this.currentPosition +=
      (
        this.targetPosition -
        this.currentPosition
      ) *
      damping;
    this.currentPosition = clamp(
      this.currentPosition,
      0,
      this.getMaximumPosition(),
    );

    if (
      Math.abs(
        this.targetPosition -
          this.currentPosition,
      ) <= this.config.settleEpsilon
    ) {
      this.currentPosition =
        this.targetPosition;
    }

    const positionDelta =
      this.currentPosition -
      this.previousPosition;

    const homeEnd =
      this.config.homeScrollLength;

    const transitionEnd =
      homeEnd +
      this.config.transitionScrollLength;
    const projectsTargetOffset = clamp(
      (this.targetPosition - transitionEnd) /
        this.config.projectsScrollUnit,
      0,
      this.projectsMaxOffset,
    );
    const projectsCurrentOffset = clamp(
      (this.currentPosition - transitionEnd) /
        this.config.projectsScrollUnit,
      0,
      this.projectsMaxOffset,
    );

    const homeProgress =
      this.clamp01(
        this.currentPosition /
          homeEnd,
      );

    const transitionProgress =
      this.clamp01(
        (
          this.currentPosition -
          homeEnd
        ) /
          this.config.transitionScrollLength,
      );

    this.state.homeProgress =
      homeProgress;

    this.state.transitionProgress =
      transitionProgress;

    this.state.homeCameraPathProgress =
      transitionProgress > 0
        ? this.lerp(
            this.config.homeCameraPathAtTransitionStart,
            this.config.homeCameraPathEnd,
            transitionProgress,
          )
        : this.config.homeCameraPathAtTransitionStart *
          homeProgress;

    this.state.projectsOffset = projectsCurrentOffset;
    this.state.projectsTargetOffset = projectsTargetOffset;
    this.state.projectsCurrentOffset = projectsCurrentOffset;
    this.state.projectsMaxOffset = this.projectsMaxOffset;

    this.state.scrollVelocity =
      deltaSeconds > 0
        ? positionDelta /
          deltaSeconds /
          this.config.projectsScrollUnit
        : 0;

    this.state.direction =
      Math.abs(positionDelta) <=
      this.config.directionEpsilon
        ? 0
        : positionDelta > 0
          ? 1
          : -1;

    this.state.phase =
      this.currentPosition < homeEnd
        ? "home"
        : this.currentPosition <
            transitionEnd
          ? "transition"
          : "projects";

    return this.state;
  }

  navigateTo(
    section: "home" | "projects",
  ): void {
    this.targetPosition = clamp(
      section === "home"
        ? 0
        : this.config.homeScrollLength +
          this.config.transitionScrollLength,
      0,
      this.getMaximumPosition(),
    );
  }

  setProjectsMaxOffset(maxOffset: number): void {
    if (!Number.isFinite(maxOffset)) {
      throw new Error("Projects max offset must be finite.");
    }

    this.projectsMaxOffset = Math.max(0, maxOffset);
    const maximumPosition = this.getMaximumPosition();
    this.targetPosition = clamp(
      this.targetPosition,
      0,
      maximumPosition,
    );
    this.currentPosition = clamp(
      this.currentPosition,
      0,
      maximumPosition,
    );
    this.previousPosition = this.currentPosition;
    this.state.projectsMaxOffset = this.projectsMaxOffset;
    this.update(0);
  }

  setDebugProgress(progress: {
    homeProgress?: number;
    transitionProgress?: number;
    projectsOffset?: number;
  }): void {
    const homeEnd = this.config.homeScrollLength;
    const transitionEnd =
      homeEnd + this.config.transitionScrollLength;

    if (progress.projectsOffset !== undefined) {
      this.currentPosition =
        transitionEnd +
        clamp(progress.projectsOffset, 0, this.projectsMaxOffset) *
          this.config.projectsScrollUnit;
    } else if (progress.transitionProgress !== undefined) {
      this.currentPosition =
        homeEnd +
        progress.transitionProgress *
          this.config.transitionScrollLength;
    } else if (progress.homeProgress !== undefined) {
      this.currentPosition =
        progress.homeProgress * homeEnd;
    } else {
      return;
    }

    this.targetPosition = clamp(
      this.currentPosition,
      0,
      this.getMaximumPosition(),
    );
    this.currentPosition = this.targetPosition;
    this.previousPosition = this.currentPosition;
    this.state.scrollVelocity = 0;
    this.state.direction = 0;
    this.update(0);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private lerp(
    start: number,
    end: number,
    progress: number,
  ) {
    return start +
      (end - start) *
        progress;
  }

  private clamp01(value: number) {
    return Math.min(
      1,
      Math.max(0, value),
    );
  }

  private getMaximumPosition() {
    return (
      this.config.homeScrollLength +
      this.config.transitionScrollLength +
      this.projectsMaxOffset * this.config.projectsScrollUnit
    );
  }

  dispose() {
    window.removeEventListener(
      "wheel",
      this.handleWheel,
    );

    window.removeEventListener(
      "touchstart",
      this.handleTouchStart,
    );

    window.removeEventListener(
      "touchmove",
      this.handleTouchMove,
    );
  }
}

const clamp = (
  value: number,
  minimum: number,
  maximum: number,
) => Math.min(maximum, Math.max(minimum, value));

export default ScrollManager;
