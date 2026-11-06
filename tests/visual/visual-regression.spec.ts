import { mkdirSync } from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";

const screenshotDirectory = path.resolve("artifacts/visual");

const debugQuery = (
  values: Record<string, string> = {},
) => {
  const params = new URLSearchParams({
    debug: "1",
    quality: "high",
    hideCursor: "1",
    freezeParticles: "1",
    freezeTime: "1",
    ...values,
  });
  return `/?${params.toString()}`;
};

const openScenario = async (
  page: Page,
  name: string,
  values: Record<string, string> = {},
  hash = "",
) => {
  await page.goto(`${debugQuery(values)}${hash}`);
  if (name === "loader") {
    await expect(page.getByTestId("visual-loader")).toBeVisible();
  } else if (name === "intro") {
    await expect(page.getByTestId("visual-intro")).toBeVisible();
  } else {
    await expect(page.locator("[data-debug-ready='true']")).toBeAttached();
    const expectedScene: Record<string, string> = {
      home: "home",
      "before-dive": "home",
      "mid-dive": "transition",
      "projects-entry": "projects",
      "projects-mid-scroll": "projects",
    };
    if (expectedScene[name]) {
      await expect(page.locator(".home-placeholder"))
        .toHaveAttribute("data-scene", expectedScene[name]!);
    }
    if (name === "contact" || name === "world") {
      await expect(page.locator(".home-placeholder"))
        .toHaveAttribute("data-route", name);
    }
  }

  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(name === "contact" || name === "world" ? 1800 : 600);

  if (name === "contact" || name === "world") {
    await page.evaluate(() => {
      const controller = (
        window as Window & {
          __UNSEEN_DEBUG__?: {
            setState: (state: { paused: boolean }) => void;
          };
        }
      ).__UNSEEN_DEBUG__;
      controller?.setState({ paused: true });
    });
    await page.waitForTimeout(150);
  }

  mkdirSync(screenshotDirectory, { recursive: true });
  await page.screenshot({
    path: path.join(screenshotDirectory, `${name}.png`),
    animations: "disabled",
    caret: "hide",
  });
};

test("captures loader and intro", async ({ page }) => {
  await openScenario(page, "loader", { screen: "loader" });
  await openScenario(page, "intro", { screen: "intro" });
});

test("captures Home at a fixed state", async ({ page }) => {
  await openScenario(page, "home");
});

test("captures Home immediately before the dive", async ({ page }) => {
  await openScenario(page, "before-dive", { homeProgress: "0.95" });
});

test("captures the midpoint of the dive", async ({ page }) => {
  await openScenario(page, "mid-dive", { transition: "0.5" });
});

test("captures the Projects entry", async ({ page }) => {
  await openScenario(page, "projects-entry", { projectsOffset: "0" });
});

test("captures Projects after a fixed scroll offset", async ({ page }) => {
  await openScenario(page, "projects-mid-scroll", { projectsOffset: "2" });
});

test("captures Contact after its transition", async ({ page }) => {
  await openScenario(page, "contact", {}, "#contact");
});

test("captures World after its transition", async ({ page }) => {
  await openScenario(page, "world", {}, "#world");
});

test("debug controller updates scene progress without reload", async ({ page }) => {
  await page.goto(debugQuery());
  await expect(page.locator("[data-debug-ready='true']")).toBeAttached();

  await page.evaluate(() => {
    const controller = (
      window as Window & {
        __UNSEEN_DEBUG__?: {
          setState: (state: {
            transitionProgress?: number;
            projectsOffset?: number;
            paused?: boolean;
          }) => void;
        };
      }
    ).__UNSEEN_DEBUG__;
    controller?.setState({
      transitionProgress: 0.5,
      paused: true,
    });
  });
  await expect(page.locator(".home-placeholder"))
    .toHaveAttribute("data-scene", "transition");

  await page.evaluate(() => {
    const controller = (
      window as Window & {
        __UNSEEN_DEBUG__?: {
          setState: (state: {
            projectsOffset?: number;
          }) => void;
        };
      }
    ).__UNSEEN_DEBUG__;
    controller?.setState({ projectsOffset: 2 });
  });
  await expect(page.locator(".home-placeholder"))
    .toHaveAttribute("data-scene", "projects");
});

test("Projects has a finite 20-item gallery and reveals its end section", async ({ page }) => {
  await page.goto(debugQuery({ projectsOffset: "0" }));
  const root = page.locator("[data-debug-ready='true']");
  await expect(root).toHaveAttribute("data-project-count", "20");
  await expect(root).toHaveAttribute("data-project-rows", "10");

  const initialCameraZ = await root.getAttribute("data-projects-camera-z");
  const maxOffset = Number(await root.getAttribute("data-projects-max-offset"));
  expect(maxOffset).toBeGreaterThan(0);
  expect(Number.isFinite(maxOffset)).toBe(true);

  await page.evaluate(() => {
    const controller = (
      window as Window & {
        __UNSEEN_DEBUG__?: {
          setState: (state: { projectsOffset: number; paused: boolean }) => void;
        };
      }
    ).__UNSEEN_DEBUG__;
    controller?.setState({
      projectsOffset: Number.MAX_SAFE_INTEGER,
      paused: true,
    });
  });

  await expect(root).toHaveAttribute("data-projects-ended", "true");
  await expect(page.getByTestId("projects-end-section"))
    .toContainText("View our work");
  const finalOffset = Number(await root.getAttribute("data-projects-offset"));
  expect(finalOffset).toBeLessThanOrEqual(maxOffset);
  expect(finalOffset).toBeGreaterThan(maxOffset - 0.001);
  expect(await root.getAttribute("data-projects-camera-z")).toBe(initialCameraZ);

  await page.evaluate(() => {
    const controller = (
      window as Window & {
        __UNSEEN_DEBUG__?: {
          setState: (state: { projectsOffset: number }) => void;
        };
      }
    ).__UNSEEN_DEBUG__;
    controller?.setState({ projectsOffset: 0 });
  });
  await expect(root).toHaveAttribute("data-projects-ended", "false");
  expect(Number(await root.getAttribute("data-projects-offset"))).toBe(0);
});

test("Projects scroll reaches its real end and reverses to Home", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto(debugQuery());
  const root = page.locator("[data-debug-ready='true']");
  await page.mouse.wheel(0, 10_000);
  await expect(root).toHaveAttribute("data-projects-ended", "true", {
    timeout: 15_000,
  });

  const maximumOffset = Number(
    await root.getAttribute("data-projects-max-offset"),
  );
  await expect.poll(async () => Number(
    await root.getAttribute("data-projects-offset"),
  )).toBeCloseTo(maximumOffset, 2);
  await expect(root).toHaveAttribute("data-dive-progress", "1.0000");
  await expect.poll(async () => Number(await root.getAttribute("data-projects-camera-z")))
    .toBeCloseTo(-17, 3);
  const cameraZAtEnd = await root.getAttribute("data-projects-camera-z");

  await page.mouse.wheel(0, -10_000);
  await expect(root).toHaveAttribute("data-scene", "home", {
    timeout: 15_000,
  });
  expect(Number(await root.getAttribute("data-projects-offset"))).toBe(0);
  await expect(root).toHaveAttribute("data-dive-progress", "0.0000");
  await expect.poll(() => root.getAttribute("data-projects-camera-z"))
    .toBe(cameraZAtEnd);
});
