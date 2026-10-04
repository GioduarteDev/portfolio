class ScrollManager {
  public current = 0;
  public target = 0;
  public velocity = 0;

  private previous = 0;
  private touchY = 0;

  private readonly wheelStrength = 0.00055;
  private readonly touchStrength = 0.0025;

  constructor() {
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

  private clamp(value: number) {
    return Math.min(
      1,
      Math.max(0, value),
    );
  }

  private handleWheel = (
    event: WheelEvent,
  ) => {
    event.preventDefault();

    this.target = this.clamp(
      this.target +
        event.deltaY *
          this.wheelStrength,
    );
  };

  private handleTouchStart = (
    event: TouchEvent,
  ) => {
    const touch =
      event.touches[0];

    if (!touch) return;

    this.touchY = touch.clientY;
  };

  private handleTouchMove = (
    event: TouchEvent,
  ) => {
    const touch =
      event.touches[0];

    if (!touch) return;

    event.preventDefault();

    const delta =
      this.touchY -
      touch.clientY;

    this.touchY =
      touch.clientY;

    this.target = this.clamp(
      this.target +
        delta *
          this.touchStrength,
    );
  };

  update() {
    this.previous =
      this.current;

    this.current +=
      (
        this.target -
        this.current
      ) * 0.065;

    this.velocity =
      this.current -
      this.previous;

    return this.current;
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

export default ScrollManager;