import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import gsap from "gsap";


import ExperienceCanvas from "./experience/ExperienceCanvas";
import type {
  ExperienceCanvasHandle,
  ExperienceSceneSection,
} from "./experience/ExperienceCanvas";
import AudioManager from "./experience/audio/AudioManager";
import ExperienceCursor from "./experience/cursor/ExperienceCursor";
import {
  PROJECT_FILTERS,
  type ProjectFilter,
} from "./experience/scenes/ProjectsScene";
import type { WorldSelection } from "./experience/scenes/WorldScene";
import {
  PROJECT_ITEMS,
  getProjectBySlug,
} from "./experience/data/projects";
import {
  ensureVisualDebugController,
  getDebugScreen,
  getVisualDebugStateFromEvent,
  readVisualDebugState,
  type VisualDebugState,
} from "./experience/core/visualDebug";

type Screen =
  | "loader"
  | "intro"
  | "home";

type ExperienceSection =
  | ExperienceSceneSection
  | "contact"
  | "world";

const parseSection = (hash: string): ExperienceSection => {
  const section = hash.replace(/^#\/?/, "").split("/")[0]?.toLowerCase();

  return section === "projects" ||
    section === "contact" ||
    section === "world"
    ? section
    : "home";
};

const parseProjectSlug = (hash: string): string | null => {
  const match = hash.match(/^#\/?projects\/([^/?#]+)/i);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
};

function App() {
  const [screen, setScreen] =
    useState<Screen>(() =>
      readVisualDebugState().enabled
        ? getDebugScreen()
        : "loader",
    );

  const [visualDebug, setVisualDebug] =
    useState<VisualDebugState>(() => readVisualDebugState());

  const [audioManager] =
    useState(() => new AudioManager());

  const [projectFilter, setProjectFilter] =
    useState<ProjectFilter>("All");

  const [section, setSection] =
    useState<ExperienceSection>(() =>
      parseSection(window.location.hash),
    );

  const [projectSlug, setProjectSlug] =
    useState<string | null>(() =>
      parseProjectSlug(window.location.hash),
    );

  const [sceneSection, setSceneSection] =
    useState<ExperienceSceneSection>(() =>
      parseSection(window.location.hash) === "projects"
        ? "projects"
        : "home",
    );

  const [menuOpen, setMenuOpen] = useState(false);
  const [worldSelection, setWorldSelection] =
    useState<WorldSelection | null>(null);

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

  const audioRequestRef = useRef(0);
  const experienceRef =
    useRef<ExperienceCanvasHandle>(null);
  const menuToggleRef =
    useRef<HTMLButtonElement>(null);
  const menuFirstLinkRef =
    useRef<HTMLButtonElement>(null);
  const overlayCloseRef =
    useRef<HTMLButtonElement>(null);
  const [overlayReturnSection, setOverlayReturnSection] =
    useState<ExperienceSceneSection>("home");

  const closeSectionOverlay = useCallback(() => {
    if (section !== "contact" && section !== "world") {
      return;
    }

    setSection(overlayReturnSection);
    setSceneSection(overlayReturnSection);
    window.history.replaceState(
      { section: overlayReturnSection },
      "",
      `#${overlayReturnSection}`,
    );
    experienceRef.current?.navigateTo(overlayReturnSection);
  }, [overlayReturnSection, section]);

  const closeProjectDetail = useCallback(() => {
    setProjectSlug(null);
    setSection("projects");
    setSceneSection("projects");
    window.history.replaceState(
      { section: "projects" },
      "",
      "#projects",
    );
  }, []);

  useEffect(
    () => () => audioManager.dispose(),
    [audioManager],
  );

  useEffect(() => {
    ensureVisualDebugController();
    const handleDebugChange = (event: Event) => {
      const nextState = getVisualDebugStateFromEvent(event);
      if (nextState) setVisualDebug(nextState);
    };

    window.addEventListener("unseen-debug-change", handleDebugChange);
    return () =>
      window.removeEventListener(
        "unseen-debug-change",
        handleDebugChange,
      );
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const nextSection = parseSection(window.location.hash);
      const nextProjectSlug = parseProjectSlug(window.location.hash);
      setProjectSlug(nextProjectSlug);
      if (nextSection === "contact" || nextSection === "world") {
        setOverlayReturnSection(
          section === "home" || section === "projects"
            ? section
            : sceneSection,
        );
      }
      setMenuOpen(false);
      setSection(nextSection);

      if (nextSection === "contact") {
        experienceRef.current?.navigateTo("contact");
      } else if (nextSection === "world") {
        experienceRef.current?.navigateTo("world");
      } else if (nextSection === "home" || nextSection === "projects") {
        setSceneSection(nextSection);
        if (
          nextSection !== "projects" ||
          section !== "projects" ||
          sceneSection !== "projects"
        ) {
          experienceRef.current?.navigateTo(nextSection);
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [sceneSection, section]);

  useEffect(() => {
    if (menuOpen) {
      menuFirstLinkRef.current?.focus({ preventScroll: true });
      return;
    }

    if (
      section === "contact" ||
      section === "world" ||
      projectSlug
    ) {
      overlayCloseRef.current?.focus({ preventScroll: true });
      return;
    }

    if (!menuOpen) {
      menuToggleRef.current?.focus({ preventScroll: true });
    }
  }, [menuOpen, projectSlug, section]);

  useEffect(() => {
    if (
      !menuOpen &&
      section !== "contact" &&
      section !== "world" &&
      !projectSlug
    ) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (menuOpen) {
        setMenuOpen(false);
        return;
      }

      if (projectSlug) {
        closeProjectDetail();
      } else {
        closeSectionOverlay();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    closeProjectDetail,
    closeSectionOverlay,
    menuOpen,
    projectSlug,
    section,
    sceneSection,
  ]);

  useLayoutEffect(() => {
    if (screen !== "loader") {
      return;
    }

    if (visualDebug.enabled) {
      return;
    }

    const reducedMotion =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

    const animationScale =
      reducedMotion ? 0.01 : 1;

    const context =
      gsap.context(() => {
        const timeline =
          gsap.timeline({
            onComplete: () => {
              setScreen("intro");
            },
          });

        const letters =
          lettersRef.current?.children;

        if (letters?.length) {
          timeline.fromTo(
            letters,
            {
              yPercent: 112,
              opacity: 0,
            },
            {
              yPercent: 0,
              opacity: 1,
              duration:
                0.72 *
                animationScale,
              stagger:
                0.065 *
                animationScale,
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
              duration:
                0.36 *
                animationScale,
              ease: "power2.out",
            },
            "-=0.22",
          )
          .to(
            {},
            {
              duration:
                0.65 *
                animationScale,
            },
          )
          .to(
            loaderRef.current,
            {
              opacity: 0,
              duration:
                0.58 *
                animationScale,
              ease: "power2.inOut",
            },
          );
      }, loaderRef);

    return () => {
      context.revert();
    };
  }, [screen, visualDebug.enabled]);

  async function configureAudio(
    enabled: boolean,
    request: number,
    fadeSeconds?: number,
  ) {
    try {
      await audioManager.initialize();

      if (request !== audioRequestRef.current) {
        return;
      }

      // Music always runs so it keeps its place in time while muted.
      await audioManager.startMusic();

      if (request !== audioRequestRef.current) {
        return;
      }

      await audioManager.setEnabled(enabled, fadeSeconds);
    } catch (error) {
      console.error(
        "Unable to initialize or update audio playback.",
        error,
      );
    }
  }

  function enterSite(withAudio: boolean) {
    const request = ++audioRequestRef.current;
    const requestedSlug = parseProjectSlug(window.location.hash);
    const requestedSection = parseSection(window.location.hash);
    const requestedScene: ExperienceSceneSection =
      requestedSection === "projects" ? "projects" : "home";
    setSection(requestedSection);
    setProjectSlug(requestedSlug);
    setSceneSection(requestedScene);
    setAudioEnabled(withAudio);
    setScreen("home");
    window.history.replaceState(
      { section: requestedSection, projectSlug: requestedSlug },
      "",
      requestedSlug
        ? `#projects/${encodeURIComponent(requestedSlug)}`
        : `#${requestedSection}`,
    );
    void configureAudio(withAudio, request, withAudio ? 2 : 0.3);
  }

  function toggleAudio() {
    const request = ++audioRequestRef.current;
    const nextEnabled = !audioEnabled;
    setAudioEnabled(nextEnabled);
    void configureAudio(nextEnabled, request);
  }

  function navigateToProject(slug: string) {
    if (!getProjectBySlug(slug)) {
      console.error(`Cannot open unknown project "${slug}".`);
      return;
    }

    const needsProjectsNavigation = section !== "projects";
    setMenuOpen(false);
    setWorldSelection(null);
    setProjectSlug(slug);
    setSection("projects");
    setSceneSection("projects");
    window.history.pushState(
      { section: "projects", projectSlug: slug },
      "",
      `#projects/${encodeURIComponent(slug)}`,
    );
    if (needsProjectsNavigation) {
      experienceRef.current?.navigateTo("projects");
    }
  }

  function navigateToSection(nextSection: ExperienceSection) {
    if (nextSection === section) {
      setMenuOpen(false);
      if (projectSlug && nextSection === "projects") {
        closeProjectDetail();
      }
      return;
    }

    if (nextSection === "contact" || nextSection === "world") {
      setOverlayReturnSection(
        section === "home" || section === "projects"
          ? section
          : sceneSection,
      );
    }

    setMenuOpen(false);
    setProjectSlug(null);
    setSection(nextSection);
    window.history.pushState(
      { section: nextSection },
      "",
      `#${nextSection}`,
    );

    if (nextSection === "home" || nextSection === "projects") {
      setSceneSection(nextSection);
      experienceRef.current?.navigateTo(nextSection);
    } else if (nextSection === "contact") {
      experienceRef.current?.navigateTo("contact");
    } else if (nextSection === "world") {
      setWorldSelection(null);
      experienceRef.current?.navigateTo("world");
    }
  }

  function handleSceneSectionChange(
    nextSceneSection: ExperienceSceneSection,
  ) {
    setSceneSection(nextSceneSection);

    if (section === "contact" || section === "world") {
      return;
    }

    setSection(nextSceneSection);
    window.history.replaceState(
      { section: nextSceneSection },
      "",
      `#${nextSceneSection}`,
    );
  }

  const currentProject =
    projectSlug ? getProjectBySlug(projectSlug) : null;
  const previousProject = currentProject?.previous
    ? getProjectBySlug(currentProject.previous)
    : null;
  const nextProject = currentProject?.next
    ? getProjectBySlug(currentProject.next)
    : null;

  return (
    <main
      className="site"
      data-visual-debug={visualDebug.enabled ? "true" : undefined}
      data-debug-screen={screen}
      data-debug-hide-cursor={
        visualDebug.hideCursor ? "true" : undefined
      }
    >
      {/* =====================================
          LOADER
      ====================================== */}

      {screen === "loader" && (
        <section
          ref={loaderRef}
          className="loader"
          data-testid="visual-loader"
        >
          <div
            ref={lettersRef}
            className="unseen-mark unseen-mark--loader"
            aria-label="Unseen"
            role="img"
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

      {/* =====================================
          INTRO
      ====================================== */}

      {screen === "intro" && (
        <section className="intro" data-testid="visual-intro">
          <div
            className="unseen-mark unseen-mark--intro"
            aria-label="Giovanna Duarte Portfolio"
            role="img"
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
              Giovanna Duarte
            </p>

            <p className="intro__description">
              Engenharia de software, design e experiências digitais construídas entre tecnologia, movimento, água e imaginação.
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

      {/* =====================================
          EXPERIENCE
      ====================================== */}

      {screen === "home" && (
        <section
          className="home-placeholder"
          data-scene="home"
          data-route={section}
        >
          <ExperienceCanvas
            ref={experienceRef}
            projectFilter={projectFilter}
            audioManager={audioManager}
            initialSection={
              section === "contact"
                ? "contact"
                  : section === "world"
                    ? "world"
                    : sceneSection
            }
            onSceneSectionChange={handleSceneSectionChange}
            onWorldSelectionChange={setWorldSelection}
            onProjectSelect={(project) =>
              navigateToProject(project.slug)
            }
          />

          {/* =================================
              GLOBAL INTERFACE
          ================================== */}

          <div className="global-interface">
            <header className="experience-header">
              <button
                ref={menuToggleRef}
                type="button"
                className="ui-link"
                data-cursor="menu"
                aria-expanded={menuOpen}
                aria-controls="experience-menu"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? "Close Menu" : "Toggle Menu"}
              </button>

              <div className="experience-header__contact">
        <span>
          ⮡ Giovanna Duarte
      </span>

        <span>
      ⮡ Brasília · Brasil
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
                aria-pressed={audioEnabled}
                onClick={toggleAudio}
              >
                {audioEnabled ? "Sound On" : "Sound Off"}
              </button>
            </div>
          </div>

          {/* =================================
              HOME INTERFACE
          ================================== */}

          <div className="home-interface">
            <h1 className="scene-title">
              Home
            </h1>

            <p className="scene-instruction">
              Drag to explore our world
            </p>
          </div>

          {/* =================================
              PROJECTS INTERFACE
          ================================== */}

          <div className="projects-interface">
            <div
              className="project-meta-layer"
              aria-hidden="true"
            >
              {PROJECT_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className="project-meta"
                  data-project-id={item.id}
                >
                  <span className="project-meta__title">
                    {item.title}
                  </span>
                  <span className="project-meta__info">
                    {item.categories.join(" / ")}
                    <i>{item.year}</i>
                  </span>
                </div>
              ))}
            </div>

            {/* PROJECTS INTRO */}

            <div className="projects-interface__intro">
              <h1 className="scene-title">
                Projects
              </h1>

              <div className="projects-interface__contact">
                <p>
                  Looking for a creative
                  partner for your project?
                </p>

                <a href="mailto:projects@unseen.co">
                  projects@unseen.co
                </a>
              </div>
            </div>

            {/* SELECTED PROJECTS */}

            <div className="selected-projects-label">
              <span>
                Selected Projects
              </span>
            </div>

            {/* PROJECTS DRAG */}

            <p className="projects-interface__drag">
              Drag to explore our world
            </p>

            {/* FILTER */}

            <div className="projects-filter">
              <span className="projects-filter__label">
                Filter
              </span>

              <div
                className="projects-filter__options"
                role="group"
                aria-label="Project categories"
              >
                {PROJECT_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={
                      projectFilter === filter
                        ? "project-filter project-filter--active"
                        : "project-filter"
                    }
                    aria-pressed={projectFilter === filter}
                    onClick={() => setProjectFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <section
              className="projects-end-section"
              data-testid="projects-end-section"
              aria-label="End of selected projects"
            >
              <h2 className="projects-end-section__title">
                View our work
              </h2>
              <div className="projects-end-section__hello">
                <p>Say hello</p>
                <span>we look forward to hearing from you</span>
                <button
                  type="button"
                  onClick={() => navigateToSection("contact")}
                >
                  Contact <span aria-hidden="true">↗</span>
                </button>
              </div>
            </section>
          </div>

          <div
            id="experience-menu"
            className={`experience-menu${menuOpen ? " is-open" : ""}`}
            aria-hidden={!menuOpen}
            inert={!menuOpen}
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation"
          >
            <div className="experience-menu__backdrop" />
            <div className="experience-menu__panel">
              <div className="experience-menu__topline">
                <span><span>GIOVANNA DUARTE®</span></span>
                <button
                  type="button"
                  className="experience-menu__close"
                  onClick={() => setMenuOpen(false)}
                >
                  Close <span aria-hidden="true">×</span>
                </button>
              </div>

              <nav className="experience-menu__nav" aria-label="Sections">
                {(
                  ["Home", "Projects", "World", "Contact"] as const
                ).map((label) => {
                  const destination =
                    label.toLowerCase() as ExperienceSection;

                  return (
                    <button
                      key={destination}
                      ref={
                        destination === "home"
                          ? menuFirstLinkRef
                          : undefined
                      }
                      type="button"
                      className="experience-menu__link"
                      aria-current={
                        section === destination ? "page" : undefined
                      }
                      onClick={() => navigateToSection(destination)}
                    >
                      <span>{label}</span>
                      <span aria-hidden="true">↗</span>
                    </button>
                  );
                })}
              </nav>

              <p className="experience-menu__footer">
                Brasília · Brasil
              </p>
            </div>
          </div>

          {(section === "contact" || section === "world") && (
            <section
              className={`section-overlay section-overlay--${section}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="section-overlay-title"
            >
              <div className="section-overlay__topline">
                <span>Giovanna Duarte®</span>
                <button
                  ref={overlayCloseRef}
                  type="button"
                  className="section-overlay__close"
                  onClick={closeSectionOverlay}
                >
                  Return to {
                    overlayReturnSection === "projects"
                      ? "Projects"
                      : "Home"
                  }
                  <span aria-hidden="true"> ×</span>
                </button>
              </div>

              {section === "contact" ? (
                <div className="section-overlay__content">
                  <p className="section-overlay__eyebrow">
                    Say hello
                  </p>
                  <h1 id="section-overlay-title">Contact</h1>
                  <p>
                    we look forward to hearing from you
                  </p>
                  <a href="mailto:projects@unseen.co">
                    projects@unseen.co
                  </a>
                  <a href="tel:+441179226892">
                    (+44) 0117 922 6892
                  </a>
                  <p className="section-overlay__address">
                    Brasília · Brasil
                  </p>
                </div>
              ) : (
                <div className="section-overlay__content">
                  <p className="section-overlay__eyebrow">
                    Drag to explore
                  </p>
                  <h1 id="section-overlay-title">World</h1>
                  <p>Move freely through the world in every direction.</p>
                  {worldSelection && (
                    <div className="world-selection">
                      <span className="world-selection__meta">
                        {worldSelection.categories.join(" · ")} · {worldSelection.year}
                      </span>
                      <h2>{worldSelection.title}</h2>
                      <button
                        type="button"
                        className="section-overlay__explore"
                        onClick={() =>
                          navigateToProject(worldSelection.slug)
                        }
                      >
                        View more <span aria-hidden="true">↗</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {projectSlug && (
            <section
              className="project-detail"
              role="dialog"
              aria-modal="true"
              aria-labelledby="project-detail-title"
            >
              <header className="project-detail__header">
                <span>Selected Projects</span>
                <button
                  ref={overlayCloseRef}
                  type="button"
                  className="project-detail__close"
                  onClick={closeProjectDetail}
                >
                  Back to Projects <span aria-hidden="true">×</span>
                </button>
              </header>

              {currentProject ? (
                <div className="project-detail__body">
                  <div className="project-detail__intro">
                    <p className="project-detail__meta">
                      {currentProject.categories.join(" · ")} <span>—</span>{" "}
                      {currentProject.year}
                    </p>
                    <h1 id="project-detail-title">
                      {currentProject.title}
                    </h1>
                    <p className="project-detail__description">
                      {currentProject.description}
                    </p>
                  </div>

                  <div className="project-detail__gallery">
                    {currentProject.gallery.map((image, index) => (
                      <figure key={`${image}-${index}`}>
                        <img
                          src={image}
                          alt={`${currentProject.title} project visual ${index + 1}`}
                          loading={index > 0 ? "lazy" : "eager"}
                        />
                      </figure>
                    ))}
                  </div>

                  <div className="project-detail__credits">
                    <h2>Credits</h2>
                    <dl>
                      {currentProject.credits.map((credit) => (
                        <div key={`${credit.role}-${credit.name}`}>
                          <dt>{credit.role}</dt>
                          <dd>{credit.name}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <nav
                    className="project-detail__navigation"
                    aria-label="Other projects"
                  >
                    {previousProject ? (
                      <button
                        type="button"
                        onClick={() => navigateToProject(previousProject.slug)}
                      >
                        <span>Previous</span>
                        <strong>{previousProject.title}</strong>
                      </button>
                    ) : <span />}
                    {nextProject ? (
                      <button
                        type="button"
                        onClick={() => navigateToProject(nextProject.slug)}
                      >
                        <span>Next</span>
                        <strong>{nextProject.title}</strong>
                      </button>
                    ) : <span />}
                  </nav>
                </div>
              ) : (
                <div className="project-detail__missing">
                  <h1 id="project-detail-title">Project unavailable</h1>
                  <p>This project is not in the local project catalogue.</p>
                  <button type="button" onClick={closeProjectDetail}>
                    Back to Projects
                  </button>
                </div>
              )}
            </section>
          )}

          <ExperienceCursor />
        </section>
      )}
    </main>
  );
}

export default App;