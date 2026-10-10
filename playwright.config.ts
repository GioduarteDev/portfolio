import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  outputDir: "./test-results/playwright",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    launchOptions: {
      args: [
        "--enable-webgl",
        "--ignore-gpu-blocklist",
        "--use-gl=angle",
        // Keep software rendering as the default for reproducible CI captures.
        // Native D3D11 is an opt-in on Windows when compiling physical materials.
        `--use-angle=${process.env.PLAYWRIGHT_GPU_BACKEND === "d3d11" ? "d3d11" : "swiftshader"}`,
      ],
    },
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
