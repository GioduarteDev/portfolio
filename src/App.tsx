import {
  useEffect,
  useRef,
  useState,
} from "react";

import gsap from "gsap";

import "./index.css";

import ExperienceCanvas from "./experience/ExperienceCanvas";

type Screen =
  | "loader"
  | "intro"
  | "home";

function App() {
  const [screen, setScreen] =
    useState<Screen>("loader");

  const [
    audioEnabled,
    setAudioEnabled,
  ] = useState(false);

  const loaderRef =
    useRef<HTMLElement>(null);

  const lettersRef =
    useRef<HTMLDivElement>(null);

  const loadingRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (screen !== "loader") return;

    const letters =
      lettersRef.current?.children;

    const timeline =
      gsap.timeline({
        onComplete: () => {
          setScreen("intro");
        },
      });

    if (letters) {
      timeline.fromTo(
        letters,
        {
          yPercent: 120,
          opacity: 0,
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.09,
          ease: "power3.out",
        },
      );
    }

    timeline
      .fromTo(
        loadingRef.current,
        {
          opacity: 0,
        },
        {
          opacity: 1,
          duration: 0.5,
        },
        "-=0.3",
      )
      .to(
        {},
        {
          duration: 1,
        },
      )
      .to(loaderRef.current, {
        opacity: 0,
        duration: 0.7,
        ease: "power2.inOut",
      });

    return () => {
      timeline.kill();
    };
  }, [screen]);

  function enterSite(
    withAudio: boolean,
  ) {
    setAudioEnabled(withAudio);
    setScreen("home");
  }

  return (
    <main className="site">
      {/* =========================
          LOADER
      ========================== */}

      {screen === "loader" && (
        <section
          ref={loaderRef}
          className="loader"
        >
          <div
            ref={lettersRef}
            className="unseen-mark unseen-mark--loader"
            aria-label="Unseen"
          >
            <span>U</span>
            <span>N</span>
            <span>S</span>
            <span>E</span>
            <span>E</span>
            <span>N</span>
          </div>

          <div
            ref={loadingRef}
            className="loader__status"
          >
            (Loading)
          </div>
        </section>
      )}

      {/* =========================
          INTRO
      ========================== */}

      {screen === "intro" && (
        <section className="intro">
          <div
            className="unseen-mark unseen-mark--intro"
            aria-label="Unseen"
          >
            <span>U</span>
            <span>N</span>
            <span>S</span>
            <span>E</span>
            <span>E</span>
            <span>N</span>
          </div>

          <div className="intro__content">
            <p className="intro__name">
              Unseen Studio®
            </p>

            <p className="intro__description">
              A brand, digital and
              motion studio creating
              <br />

              refreshingly unexpected
              ideas and striking visuals
              <br />

              that help bold brands cut
              through the noise.
            </p>

            <div className="intro__actions">
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  enterSite(true)
                }
              >
                Enter
              </button>

              <button
                type="button"
                className="text-button"
                onClick={() =>
                  enterSite(false)
                }
              >
                Enter without audio
              </button>
            </div>
          </div>
        </section>
      )}

      {/* =========================
          EXPERIENCE
      ========================== */}

      {screen === "home" && (
        <section
          className="home-placeholder"
          data-scene="home"
        >
          <ExperienceCanvas />

          {/* GLOBAL INTERFACE */}

          <div className="global-interface">
            <header className="experience-header">
              <button
                type="button"
                className="ui-link"
              >
                Toggle Menu
              </button>

              <div className="experience-header__contact">
                <span>
                  ⮡ projects@unseen.co
                </span>

                <span>
                  ⮡ (+44) 0117 922
                  6892
                </span>
              </div>
            </header>

            <div className="experience-controls">
              <span>
                Click &amp; Hold
              </span>

              <button
                type="button"
                className="ui-link"
                onClick={() =>
                  setAudioEnabled(
                    (current) =>
                      !current,
                  )
                }
              >
                {audioEnabled
                  ? "Sound On"
                  : "Toggle Sound"}
              </button>
            </div>
          </div>

          {/* HOME INTERFACE */}

          <div className="home-interface">
            <h1 className="scene-title">
              Home
            </h1>

            <p className="scene-instruction">
              Drag to explore our world
            </p>
          </div>

          {/* PROJECTS INTERFACE */}

          <div className="projects-interface">
            <div className="projects-interface__intro">
              <h1 className="scene-title">
                Projects
              </h1>

              <div className="projects-interface__contact">
                <p>
                  Looking for a creative
                  partner for your project?
                </p>

                <a
                  href="mailto:projects@unseen.co"
                >
                  projects@unseen.co
                </a>
              </div>
            </div>

            <div className="projects-filter">
              <span className="projects-filter__label">
                Filter
              </span>

              <div className="projects-filter__options">
                <button
                  type="button"
                  className="project-filter project-filter--active"
                >
                  All
                </button>

                <button
                  type="button"
                  className="project-filter"
                >
                  Branding
                </button>

                <button
                  type="button"
                  className="project-filter"
                >
                  Digital
                </button>

                <button
                  type="button"
                  className="project-filter"
                >
                  Motion
                </button>

                <button
                  type="button"
                  className="project-filter"
                >
                  Experiment
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;