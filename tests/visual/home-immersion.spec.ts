import { expect, test } from "@playwright/test";

test("Home parallax is bounded and yields to a changed reduced-motion preference", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?debug=1&quality=low&homeProgress=0&pause=0&freezeTime=1&freezeParticles=1&hideCursor=1");
  await expect(page.locator("[data-debug-ready=true]")).toBeAttached();
  const cameraX = async () => {
    const hud = await page.locator(".debug-hud").innerText();
    return Number(hud.match(/cam pos\s+([-\d.]+)/)?.[1] ?? NaN);
  };
  await page.mouse.move(1400, 450);
  await expect.poll(cameraX, { timeout: 20_000 }).toBeGreaterThan(0.15);
  expect(await cameraX()).toBeLessThan(0.35);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(async () => Math.abs(await cameraX()), { timeout: 20_000 }).toBeLessThan(0.02);
  expect(errors).toEqual([]);
});
