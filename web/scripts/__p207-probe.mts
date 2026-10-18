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

for (const [name, w, h] of [["mobile", 390, 844], ["tablet", 768, 1024], ["desktop", 1440, 900]] as [string, number, number][]) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`${BASE_URL}/plateforme`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const headerVisible = await page.locator("header").first().isVisible().catch(() => false);
  const asideVisible = await page.locator("aside").first().isVisible().catch(() => false);
  const menuBtnVisible = await page.locator('button[aria-label="Menu"]').first().isVisible().catch(() => false);
  console.log(`${name} (${w}x${h}) — header visible: ${headerVisible}, aside visible: ${asideVisible}, bouton menu visible: ${menuBtnVisible}`);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  console.log(`  scrollWidth=${scrollWidth} clientWidth=${clientWidth} overflow=${scrollWidth > clientWidth}`);
  await page.screenshot({ path: `C:\\Users\\DELLPR~1\\AppData\\Local\\Temp\\claude\\c--Users-DELL-PRECISION-3541-Desktop-SAMA-HOME\\25deaa23-496f-4e1d-bf87-8f645799d6eb\\scratchpad\\__p207_${name}.png`, fullPage: false });
}

await browser.close();
