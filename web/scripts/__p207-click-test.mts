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
await page.goto(`${BASE_URL}/plateforme`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const btn = page.locator('button[aria-label="Menu"]').first();
console.log("avant clic — aria-expanded:", await btn.getAttribute("aria-expanded"));
await btn.click();
await page.waitForTimeout(400);
console.log("après clic — aria-expanded:", await btn.getAttribute("aria-expanded"));

const panelInfo = await page.evaluate(`
  (function () {
    var links = Array.from(document.querySelectorAll("a")).filter(function (a) { return a.textContent && a.textContent.indexOf("tablissements") >= 0; });
    return links.map(function (a) {
      var rect = a.getBoundingClientRect();
      return { rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height }, href: a.getAttribute("href") };
    });
  })()
`);
console.log("nombre de liens 'Établissements' trouvés:", JSON.stringify(panelInfo, null, 2));
const menuPanelVisible = await page.locator("div.border-b.border-white\\/10.bg-\\[\\#0e1a22\\].px-4.py-3").first().isVisible().catch((e) => String(e));
console.log("panneau menu mobile visible:", menuPanelVisible);

await browser.close();
