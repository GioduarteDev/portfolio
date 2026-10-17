import { test, expect } from "@playwright/test";

const query = "/?debug=1&quality=low&freezeTime=1&freezeParticles=1&homeProgress=0";

test("dive timeline is reversible, wet cursor dries, and Projects stays interactive", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
  await page.goto(query);
  const root = page.locator(".home-placeholder");
  await expect(root).toHaveAttribute("data-debug-ready", "true");
  await page.mouse.move(700, 400);
  for (const [progress, phase] of [
    [0.10, "approach"], [0.24, "contact"], [0.38, "crossing"],
    [0.62, "submerged"], [0.87, "arrival"],
    [0.62, "submerged"], [0.38, "crossing"], [0.24, "contact"], [0.10, "approach"],
  ] as const) {
    await page.evaluate(p => window.__UNSEEN_DEBUG__?.setState({ transitionProgress: p, paused: true }), progress);
    await expect(root).toHaveAttribute("data-dive-phase", phase);
    if (phase === "crossing") {
      const line = Number(await root.getAttribute("data-dive-waterline"));
      expect(line).toBeGreaterThan(0); expect(line).toBeLessThan(1);
      await expect(page.locator(".experience-cursor")).toHaveAttribute("data-wet", "true");
    }
  }
  await page.evaluate(() => window.__UNSEEN_DEBUG__?.setState({ transitionProgress: 1, paused: true }));
  await expect(root).toHaveAttribute("data-dive-wet", "0.0000");
  await expect(page.locator(".experience-cursor")).toHaveAttribute("data-wet", "false");
  await expect(root).toHaveAttribute("data-scene", "projects");
  const card = await page.locator(".project-meta").evaluateAll(elements => {
    const element = elements.find(node => Number((node as HTMLElement).style.opacity) > 0.5);
    const box = element?.getBoundingClientRect();
    return box ? { x: box.left + 90, y: box.top - 90 } : null;
  });
  expect(card).not.toBeNull();
  await page.mouse.move(card!.x, card!.y);
  await expect(root).toHaveAttribute("data-cursor-target", "project");
  await page.mouse.click(card!.x, card!.y);
  await expect(page.locator(".project-detail")).toBeVisible();
  await page.locator(".project-detail__close").click();
  await expect(page.locator(".project-detail")).not.toBeVisible();
  await page.evaluate(() => window.__UNSEEN_DEBUG__?.setState({ homeProgress: 0, transitionProgress: undefined, paused: true }));
  await expect(root).toHaveAttribute("data-scene", "home");
  await expect(root).toHaveAttribute("data-dive-progress", "0.0000");
  expect(errors).toEqual([]);
});

test("reduced motion changes live and pooled dive resources resize/dispose", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(query);
  await expect(page.locator("[data-debug-ready=true]")).toBeAttached();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(".home-placeholder")).toHaveAttribute("data-dive-reduced-motion", "false");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".home-placeholder")).toHaveAttribute("data-dive-reduced-motion", "true");
  const result = await page.evaluate(async () => {
    const transitionPath = "/src/experience/core/SceneTransition.ts";
    const particlesPath = "/src/experience/dive/DiveParticles.ts";
    const timelinePath = "/src/experience/dive/diveTimeline.ts";
    const threePath = "/node_modules/.vite/deps/three.js";
    const [{ default: Transition }, { DiveParticles }, { createDiveState, sampleDiveState }, THREE] =
      await Promise.all([import(/* @vite-ignore */ transitionPath), import(/* @vite-ignore */ particlesPath),
        import(/* @vite-ignore */ timelinePath), import(/* @vite-ignore */ threePath)]);
    const transition = new Transition(320, 180, 1, "low");
    const counts = [];
    const state = createDiveState();
    for (const mode of ["low", "medium", "high"]) {
      const particles = new DiveParticles(mode, new THREE.Texture(), new THREE.Vector2(320, 180));
      const mesh = particles.scene.children[0];
      const buffer = mesh.geometry.getAttribute("aSeed").array;
      counts.push(mesh.geometry.instanceCount);
      for (let i = 0; i < 100; i++) particles.update(sampleDiveState(i / 99, state), i, false);
      if (mesh.geometry.getAttribute("aSeed").array !== buffer) throw new Error("Particle buffers were replaced");
      particles.dispose();
      mesh.material.uniforms.uSceneTexture.value.dispose();
    }
    transition.resize(1366, 768, 1);
    const resized = transition.projectsTarget.width === 1366 && transition.projectsTarget.height === 768;
    const resources = [transition.homeTarget, transition.projectsTarget, transition.projectsTarget.depthTexture,
      transition.finalTarget, transition.transitionMaterial, transition.navigationMaterial,
      transition.postProcessMaterial, transition.quadGeometry,
      transition.diveParticles.geometry, transition.diveParticles.material];
    const disposed = new Set();
    resources.forEach(resource => resource.addEventListener("dispose", () => disposed.add(resource)));
    transition.dispose();
    return { counts, resized, allDisposed: disposed.size === resources.length };
  });
  expect(result.counts).toEqual([12, 34, 62]);
  expect(result.resized).toBe(true);
  expect(result.allDisposed).toBe(true);
});

test("dive audio never autostarts and returns from muffling on arrival", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(query);
  await expect(page.locator("[data-debug-ready=true]")).toBeAttached();
  const before = await page.evaluate(async () => {
    const audioPath = "/src/experience/audio/AudioManager.ts";
    const timelinePath = "/src/experience/dive/diveTimeline.ts";
    const [{ default: Audio }, { createDiveState, sampleDiveState }] =
      await Promise.all([import(/* @vite-ignore */ audioPath), import(/* @vite-ignore */ timelinePath)]);
    const manager = new Audio();
    manager.updateDive(sampleDiveState(0.6, createDiveState()));
    const initialized = manager.state.initialized;
    window.__DIVE_AUDIO_TEST__ = { manager, createDiveState, sampleDiveState };
    document.addEventListener("pointerdown", async () => {
      await manager.initialize(); await manager.setEnabled(true, 0.01);
    }, { once: true });
    return initialized;
  });
  expect(before).toBe(false);
  await page.mouse.click(500, 350);
  await expect.poll(() => page.evaluate(() => window.__DIVE_AUDIO_TEST__.manager.state.initialized)).toBe(true);
  const result = await page.evaluate(async () => {
    const { manager, createDiveState, sampleDiveState } = window.__DIVE_AUDIO_TEST__;
    manager.updateDive(sampleDiveState(0.60, createDiveState()));
    const underwater = manager.immersion;
    await new Promise(resolve => setTimeout(resolve, 100));
    manager.updateDive(sampleDiveState(1, createDiveState()));
    const arrival = manager.immersion;
    const sources = manager.diveAudio.sources.length;
    const context = manager.context;
    await manager.setEnabled(false, 0.01);
    const muted = manager.state.muted;
    manager.dispose();
    delete window.__DIVE_AUDIO_TEST__;
    return { underwater, arrival, sources, muted, initialized: manager.state.initialized, closed: context.state === "closed" };
  });
  expect(result.underwater).toBe(1);
  expect(result.arrival).toBe(0);
  expect(result.sources).toBe(3);
  expect(result.muted).toBe(true);
  expect(result.initialized).toBe(false);
});

test("fast input and stalled frames cannot skip the two-medium crossing", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto(query);
  await expect(page.locator("[data-debug-ready=true]")).toBeAttached();
  const result = await page.evaluate(async () => {
    const cameraPath = "/src/experience/dive/DiveCamera.ts";
    const threePath = "/node_modules/.vite/deps/three.js";
    const [{ DiveCamera }, THREE] = await Promise.all([
      import(/* @vite-ignore */ cameraPath), import(/* @vite-ignore */ threePath),
    ]);
    const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 100);
    const position = new THREE.Vector3(0, 0.7, 5);
    const lookAt = new THREE.Vector3(0, 0.2, -20);
    const dive = new DiveCamera(position, lookAt, camera);
    const phases = new Set();
    let mixed = 0;
    for (let i = 0; i < 90; i++) {
      const state = dive.update(1, 0.8, false); // emulate a large wheel jump + GPU stall
      phases.add(state.phase);
      dive.sample(camera.position, lookAt, 0, true);
      const line = dive.waterline(camera);
      if (line > 0 && line < 1) mixed++;
    }
    const arrived = dive.state.progress === 1;
    const submergedY = camera.position.y;
    for (let i = 0; i < 90; i++) dive.update(0, 0.8, false);
    const returned = dive.state.progress === 0;
    const exactEndpoint = dive.update(1 - Number.EPSILON, 0, true).progress === 1;
    return { phases: [...phases], mixed, arrived, submergedY, returned, exactEndpoint };
  });
  expect(result.phases).toEqual(["approach", "contact", "crossing", "submerged", "arrival"]);
  expect(result.mixed).toBeGreaterThanOrEqual(2);
  expect(result.arrived).toBe(true);
  expect(result.submergedY).toBeLessThan(0.16);
  expect(result.returned).toBe(true);
  expect(result.exactEndpoint).toBe(true);
});

type DiveState = import("../../src/experience/dive/diveTimeline").DiveState;
interface DiveAudioHarness {
  manager: {
    state: { initialized: boolean; muted: boolean };
    immersion: number;
    context: AudioContext;
    diveAudio: { sources: AudioScheduledSourceNode[] };
    initialize(): Promise<void>;
    setEnabled(enabled: boolean, fade: number): Promise<void>;
    updateDive(state: DiveState): void;
    dispose(): void;
  };
  createDiveState(): DiveState;
  sampleDiveState(progress: number, state: DiveState): DiveState;
}
declare global { interface Window { __DIVE_AUDIO_TEST__: DiveAudioHarness } }
