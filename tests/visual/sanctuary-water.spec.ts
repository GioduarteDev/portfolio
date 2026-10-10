import { test, expect } from "@playwright/test";

const query = "/?debug=1&quality=low&freezeTime=1&freezeParticles=1&hideCursor=1&homeProgress=0";

test("Home camera stays above water throughout the crossing", async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(query);
  await expect(page.locator("[data-debug-ready=true]")).toBeAttached();
  for (const progress of [0, 0.2, 0.45, 0.65, 0.85, 1]) {
    await page.evaluate((homeProgress) => {
      window.__UNSEEN_DEBUG__?.setState({ homeProgress, paused: true });
    }, progress);
    await expect(page.locator(".debug-hud")).toContainText(`homeProgress ${progress.toFixed(3)}`, { timeout: 15_000 });
    // HUD samples before the camera update, so wait for its next refresh.
    await page.waitForTimeout(350);
    const text = await page.locator(".debug-hud").innerText();
    const position = text.match(/cam pos\s+[-\d.]+, ([-\d.]+), ([-\d.]+)/);
    expect(position).not.toBeNull();
    expect(Number(position![1])).toBeGreaterThan(0.25);
    expect(Number(position![2])).toBeGreaterThan(-1);
  }
  for (const progress of [0.1, 0.35, 0.5, 0.7, 0.95]) {
    await page.evaluate((transitionProgress) => {
      window.__UNSEEN_DEBUG__?.setState({ transitionProgress, paused: true });
    }, progress);
    await expect(page.locator(".debug-hud")).toContainText(`transition   ${progress.toFixed(3)}`, { timeout: 15_000 });
    await page.waitForTimeout(350);
    const text = await page.locator(".debug-hud").innerText();
    const position = text.match(/cam pos\s+[-\d.]+, ([-\d.]+), ([-\d.]+)/);
    expect(position).not.toBeNull();
    expect(Number(position![1])).toBeGreaterThan(0.25);
    expect(Number(position![2])).toBeGreaterThan(-1);
  }
  expect(errors).toEqual([]);
});

test("water capture targets resize, restore renderer state and dispose", async ({ page }) => {
  test.setTimeout(60_000); // A second WebGL context compiles its own shaders.
  await page.goto(`${query}#projects`);
  await expect(page.locator("[data-debug-ready=true]")).toBeAttached();
  const result = await page.evaluate(async () => {
    const homePath = "/src/experience/scenes/HomeScene.ts";
    const qualityPath = "/src/experience/core/quality.ts";
    const threePath = "/node_modules/.vite/deps/three.js";
    const [{ default: HomeScene }, { getQualitySettings }, THREE] = await Promise.all([
      import(/* @vite-ignore */ homePath), import(/* @vite-ignore */ qualityPath),
      import(/* @vite-ignore */ threePath),
    ]);
    const home = new HomeScene(getQualitySettings());
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(160, 100);
    const camera = new THREE.PerspectiveCamera(38, 1.6, 0.1, 100);
    camera.position.set(0, 2.65, 9);
    camera.lookAt(0, 1.2, -14);
    home.resizeReflection(1920, 1080, 2);
    const large = [home.refractionTarget.width, home.refractionTarget.height];
    home.resizeReflection(160, 100, 1);
    home.update(0, 0, 0, false, camera, true);
    const sentinel = new THREE.WebGLRenderTarget(8, 8);
    renderer.setRenderTarget(sentinel);
    renderer.autoClear = false;
    renderer.transmissionResolutionScale = 0.75;
    home.renderReflection(renderer, camera);
    const restored = renderer.getRenderTarget() === sentinel && renderer.autoClear === false &&
      renderer.transmissionResolutionScale === 0.75 && home.water.visible;
    const allocated = renderer.info.memory.textures;
    home.renderReflection(renderer, camera);
    const noReallocation = allocated === renderer.info.memory.textures;
    home.update(0.2, 0, 0.65, true, camera, true);
    const held = home.waterMaterial.uniforms.uHold.value;
    const pointerHitsWater = home.pointerValid === 1;
    home.update(0.3, 0, 0.65, false, camera, true);
    const released = home.waterMaterial.uniforms.uHold.value;
    const holdInertia = released > 0 && released < held;
    const resources = [...new Set([
      ...home.geometries, ...home.materials, ...home.textures,
      home.reflectionTarget, home.refractionTarget, home.refractionTarget.depthTexture,
      home.environmentTarget,
    ])];
    const disposed = new Set();
    for (const resource of resources) resource.addEventListener("dispose", () => disposed.add(resource));
    home.dispose();
    const allDisposed = disposed.size === resources.length;
    const empty = home.scene.children.length === 0 && home.scene.environment === null;
    sentinel.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    return { large, restored, noReallocation, allDisposed, empty, pointerHitsWater, holdInertia };
  });
  expect(result.large).toEqual([512, 288]);
  expect(result.restored).toBe(true);
  expect(result.noReallocation).toBe(true);
  expect(result.allDisposed).toBe(true);
  expect(result.empty).toBe(true);
  expect(result.pointerHitsWater).toBe(true);
  expect(result.holdInertia).toBe(true);
});

