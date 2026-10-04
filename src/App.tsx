import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import "./index.css";
import ExperienceCanvas from "./experience/ExperienceCanvas";

type Screen = "loader" | "intro" | "home";

function App() {
  const [screen, setScreen] = useState<Screen>("loader");
  const [audioEnabled, setAudioEnabled] = useState(false);

  const loaderRef = useRef<HTMLElement>(null);
  const lettersRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (screen !== "loader") return;

    const letters = lettersRef.current?.children;

    const timeline = gsap.timeline({
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
      .to({}, { duration: 1 })
      .to(loaderRef.current, {
        opacity: 0,
        duration: 0.7,
        ease: "power2.inOut",
      });

    return () => {
      timeline.kill();
    };
  }, [screen]);

  function enterSite(withAudio: boolean) {
    setAudioEnabled(withAudio);
    setScreen("home");
  }

  return (
    <main className="site">
      {/* LOADER */}
      {screen === "loader" && (
        <section ref={loaderRef} className="loader">
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

          <div ref={loadingRef} className="loader__status">
            (Loading)
          </div>
        </section>
      )}

      {/* INTRO */}
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
            <p className="intro__name">Unseen Studio®</p>

            <p className="intro__description">
              A brand, digital and motion studio creating
              <br />
              refreshingly unexpected ideas and striking visuals
              <br />
              that help bold brands cut through the noise.
            </p>

            <div className="intro__actions">
              <button
                type="button"
                className="text-button"
                onClick={() => enterSite(true)}
              >
                Enter
              </button>

              <button
                type="button"
                className="text-button"
                onClick={() => enterSite(false)}
              >
                Enter without audio
              </button>
            </div>
          </div>
        </section>
      )}

      {/* HOME / WEBGL */}
      {screen === "home" && (
        <section className="home-placeholder">
          <ExperienceCanvas />

          <header className="header">
            <div>Unseen Studio®</div>

            <button type="button" className="text-button">
              Toggle Menu
            </button>
          </header>

          <p className="home-placeholder__drag">
            Drag to explore our world
          </p>

          <div className="home-placeholder__controls">
            <span>Click &amp; Hold</span>
            <span>{audioEnabled ? "Sound On" : "Sound Off"}</span>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;