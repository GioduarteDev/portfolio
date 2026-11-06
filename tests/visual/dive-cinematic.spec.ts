import { mkdirSync } from "node:fs";
import { test, expect } from "@playwright/test";

test("cinematic descent reveals the gallery and reverses through the water membrane", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?debug=1&quality=medium&freezeTime=1&freezeParticles=1&hideCursor=1&homeProgress=0");
  const root = page.locator(".home-placeholder");
  await expect(root).toHaveAttribute("data-debug-ready", "true");
  mkdirSync("artifacts/visual/dive", { recursive: true });
  const chapters = [
    [0, "contemplation"], [0.10, "call"], [0.18, "approach"], [0.26, "contact"],
    [0.38, "crossing"], [0.62, "descent"], [0.87, "revelation"], [1, "arrival"],
  ] as const;
  let previousY = Infinity;
  for (const [progress, name] of chapters) {
    await page.evaluate(transitionProgress => window.__UNSEEN_DEBUG__?.setState({ transitionProgress, paused: true }), progress);
    await expect(root).toHaveAttribute("data-dive-progress", progress.toFixed(4));
    const y = Number(await root.getAttribute("data-dive-camera-y"));
    expect(y).toBeLessThanOrEqual(previousY + 0.001);
    previousY = y;
    await page.screenshot({ path: `artifacts/visual/dive/${name}.png`, animations: "disabled" });
  }
  for (const progress of [0.87, 0.62, 0.38, 0.26, 0.10, 0]) {
    await page.evaluate(transitionProgress => window.__UNSEEN_DEBUG__?.setState({ transitionProgress, paused: true }), progress);
    await expect(root).toHaveAttribute("data-dive-progress", progress.toFixed(4));
  }
  await expect(root).toHaveAttribute("data-dive-chapter", "contemplation");
  expect(errors).toEqual([]);
});
