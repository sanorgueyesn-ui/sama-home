import { chromium } from "playwright";

const BASE_URL = "http://localhost:3010";
const TEST_PASSWORD = "PlaywrightTest!2026";
const ROUTES = ["/plateforme", "/plateforme/etablissements", "/plateforme/abonnements", "/plateforme/utilisateurs", "/plateforme/parametres", "/plateforme/historique"];

let failures = 0;
function check(label: string, condition: boolean, extra?: string) {
  console.log(`${condition ? "OK " : "ECHEC "} — ${label}${extra ? ` (${extra})` : ""}`);
  if (!condition) failures++;
}

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(`${BASE_URL}/login`);
await page.locator("#username").fill("p118-platform-admin");
await page.locator("#password").fill(TEST_PASSWORD);
await page.getByRole("button", { name: /se connecter/i }).click();
await page.waitForTimeout(1000);

console.log("=== 1. Mobile 390x844 — navigation sur chaque route /plateforme ===");
await page.setViewportSize({ width: 390, height: 844 });
for (const route of ROUTES) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const menuBtn = page.locator('button[aria-label="Menu"]').first();
  check(`${route} — bouton Menu visible (mobile)`, await menuBtn.isVisible().catch(() => false));
  const sw = await page.evaluate("document.documentElement.scrollWidth");
  const cw = await page.evaluate("document.documentElement.clientWidth");
  check(`${route} — pas de débordement horizontal (mobile)`, sw === cw, `scrollWidth=${sw} clientWidth=${cw}`);
}

console.log("\n=== 2. Ouverture/fermeture du menu mobile, Échap, clic sur plusieurs rubriques ===");
await page.goto(`${BASE_URL}/plateforme`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.locator('button[aria-label="Menu"]').first().click();
await page.waitForTimeout(300);
check("menu ouvert — 'Établissements' visible", await page.locator("a:visible", { hasText: "Établissements" }).first().isVisible());
check("menu ouvert — 'Paramètres de la plateforme' (Bientôt) visible", await page.locator("span:visible", { hasText: "Paramètres de la plateforme" }).first().isVisible());

await page.locator('button[aria-label="Menu"]').first().click();
await page.waitForTimeout(300);
check("second clic sur le bouton Menu referme le panneau", !(await page.locator("a:visible", { hasText: "Établissements" }).first().isVisible().catch(() => false)));

await page.locator('button[aria-label="Menu"]').first().click();
await page.waitForTimeout(300);
await page.locator("a:visible", { hasText: "Établissements" }).first().click();
await page.waitForURL(`${BASE_URL}/plateforme/etablissements`, { timeout: 5000 }).catch(() => {});
await page.waitForTimeout(500);
check("clic sur 'Établissements' — navigation effectuée", page.url().includes("/plateforme/etablissements"), `url: ${page.url()}`);
check("clic sur une rubrique — menu refermé", !(await page.locator("a:visible", { hasText: "Historique des décisions" }).first().isVisible().catch(() => false)));

console.log("\n=== 3. Tablette 768x1024 ===");
await page.setViewportSize({ width: 768, height: 1024 });
await page.goto(`${BASE_URL}/plateforme`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
check("tablette — bouton Menu visible", await page.locator('button[aria-label="Menu"]').first().isVisible());
const sw2 = await page.evaluate("document.documentElement.scrollWidth");
const cw2 = await page.evaluate("document.documentElement.clientWidth");
check("tablette — pas de débordement horizontal", sw2 === cw2, `scrollWidth=${sw2} clientWidth=${cw2}`);

console.log("\n=== 4. Desktop 1440x900 — inchangé ===");
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${BASE_URL}/plateforme`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
check("desktop — barre latérale visible", await page.locator("aside").first().isVisible());
check("desktop — bouton Menu absent", !(await page.locator('button[aria-label="Menu"]').first().isVisible().catch(() => false)));

await ctx.close();

console.log("\n=== 5. Protections inchangées (compte métier ADMIN, toutes routes /plateforme) ===");
{
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await page2.goto(`${BASE_URL}/login`);
  await page2.locator("#username").fill("p118-admin-actif");
  await page2.locator("#password").fill(TEST_PASSWORD);
  await page2.getByRole("button", { name: /se connecter/i }).click();
  await page2.waitForTimeout(1000);
  for (const route of ROUTES) {
    await page2.goto(`${BASE_URL}${route}`);
    await page2.waitForTimeout(500);
    check(`${route} — refusé à un compte métier ADMIN`, !page2.url().endsWith(route), `url: ${page2.url()}`);
  }
  await ctx2.close();
}

await browser.close();
console.log(`\n=== Résultat global : ${failures === 0 ? "TOUS LES CONTRÔLES PASSENT" : `${failures} ÉCHEC(S)`} ===`);
process.exit(failures === 0 ? 0 : 1);
