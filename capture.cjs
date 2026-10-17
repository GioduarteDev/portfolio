const { chromium } = require('@playwright/test');

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=d3d11']
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.goto('http://localhost:5174/?debug=1&quality=high&hideCursor=1&freezeParticles=1&freezeTime=1');
  await page.waitForSelector('[data-debug-ready="true"]', { timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'artifacts/visual/browser-1920.png' });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'artifacts/visual/browser-1366.png' });
  await browser.close();
  console.log('Screenshots saved!');
}

run().catch(console.error);
