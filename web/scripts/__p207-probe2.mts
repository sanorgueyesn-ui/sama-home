import { chromium } from "playwright";

const BASE_URL = "http://localhost:3010";
const TEST_PASSWORD = "PlaywrightTest!2026";

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(`${BASE_URL}/login`);
await page.locator("#username").fill("p118-platform-admin");
await page.locator("#password").fill(TEST_PASSWORD);
await page.getByRole("button", { name: /se connecter/i }).click();
await page.waitForTimeout(1000);

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE_URL}/plateforme`);
await page.waitForTimeout(500);

const info = await page.evaluate(`
  (function () {
    function describe(el) {
      if (!el) return null;
      var cs = getComputedStyle(el);
      var rect = el.getBoundingClientRect();
      return { display: cs.display, width: rect.width, height: rect.height, className: el.className };
    }
    return { header: describe(document.querySelector("header")), aside: describe(document.querySelector("aside")) };
  })()
`);
console.log(JSON.stringify(info, null, 2));
await browser.close();
