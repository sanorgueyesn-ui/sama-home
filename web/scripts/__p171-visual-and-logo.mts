import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = "http://localhost:3002";
const TEST_PASSWORD = "PlaywrightTest!2026";
const SCREEN_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "__p171-screens");

let failures = 0;
const consoleErrors: string[] = [];
function check(label: string, condition: boolean) {
  console.log(`${condition ? "OK " : "ECHEC "} — ${label}`);
  if (!condition) failures++;
}

async function freshContext(browser: Browser): Promise<BrowserContext> {
  const ctx = await browser.newContext();
  ctx.on("page", (page) => {
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(`[${page.url()}] ${msg.text()}`);
    });
    page.on("pageerror", (err) => consoleErrors.push(`[${page.url()}] pageerror: ${err.message}`));
  });
  return ctx;
}

async function login(context: BrowserContext, username: string, password: string) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`);
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /se connecter/i }).click();
  await page.waitForURL(`${BASE_URL}/`, { timeout: 8000 }).catch(() => {});
  return page;
}

const browser = await chromium.launch();

console.log("=== 1. Page de connexion moderne (desktop + mobile) ===");
{
  const ctx = await freshContext(browser);
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(`${BASE_URL}/login`);
  const body = await page.locator("body").textContent();
  check("texte de présentation deux-colonnes présent (desktop)", !!body?.includes("en toute simplicité"));
  await page.screenshot({ path: path.join(SCREEN_DIR, "01-login-desktop.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SCREEN_DIR, "02-login-mobile.png"), fullPage: true });
  await ctx.close();
}

console.log("\n=== 2. Connexion + tableau de bord ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  check("redirection vers le tableau de bord", page.url() === `${BASE_URL}/`);
  await page.screenshot({ path: path.join(SCREEN_DIR, "03-dashboard.png"), fullPage: true });
  await ctx.close();
}

console.log("\n=== 3. Navigation principale, logements, réservations, locations ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/logements`);
  check("page logements accessible", page.url() === `${BASE_URL}/logements`);
  await page.screenshot({ path: path.join(SCREEN_DIR, "04-logements.png"), fullPage: true });

  await page.goto(`${BASE_URL}/logements/new`);
  check("formulaire nouveau logement accessible", page.url() === `${BASE_URL}/logements/new`);
  await page.screenshot({ path: path.join(SCREEN_DIR, "05-logement-new.png"), fullPage: true });

  await page.goto(`${BASE_URL}/reservations`);
  await page.screenshot({ path: path.join(SCREEN_DIR, "06-reservations.png"), fullPage: true });

  await page.goto(`${BASE_URL}/locations`);
  await page.screenshot({ path: path.join(SCREEN_DIR, "07-locations.png"), fullPage: true });
  await ctx.close();
}

console.log("\n=== 4. Caisse et finances ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/caisse`);
  check("page caisse accessible", page.url() === `${BASE_URL}/caisse`);
  await page.screenshot({ path: path.join(SCREEN_DIR, "08-caisse.png"), fullPage: true });
  await ctx.close();
}

console.log("\n=== 5. Paramètres, thème, couleurs ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/settings`);
  const body = await page.locator("body").textContent();
  check("section thème présente", !!body?.match(/thème|clair|sombre/i));
  await page.screenshot({ path: path.join(SCREEN_DIR, "09-settings.png"), fullPage: true });
  await ctx.close();
}

console.log("\n=== 6. Parcours réel du logo (upload -> affichage -> suppression) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/settings`);

  // Les champs obligatoires doivent être renseignés pour que la validation
  // Zod réussisse, indépendamment du logo (établissement de test sans
  // Settings pré-remplis).
  await page.locator("#establishmentName").fill("P118 Hotel Actif (test logo)");
  await page.locator("#phone").fill("700000000");
  await page.locator("#address").fill("Adresse de test");

  const fileInput = page.locator("input#logo");
  const testImagePath = path.join(SCREEN_DIR, "..", "..", "public", "brand", "Sama-Home-icone-Bleu-nuit.png");
  await fileInput.setInputFiles(testImagePath);
  await page.waitForTimeout(300);
  const previewVisible = await page.locator("img[alt='Aperçu du logo']").isVisible().catch(() => false);
  check("aperçu local du logo affiché avant envoi", previewVisible);

  await page.getByRole("button", { name: /enregistrer/i }).first().click();
  await page.waitForURL(/\/settings\?saved=1/, { timeout: 10000 }).catch(() => {});
  check("enregistrement réussi (redirection ?saved=1)", page.url().includes("saved=1"));

  await page.goto(`${BASE_URL}/settings`);
  await page.waitForTimeout(300);
  const logoAfterUpload = await page.locator("img[alt='Aperçu du logo']").isVisible().catch(() => false);
  check("logo affiché après rechargement (lu depuis S3)", logoAfterUpload);

  // Suppression du logo.
  const removeCheckbox = page.locator("input[name='removeLogo']");
  if (await removeCheckbox.isVisible().catch(() => false)) {
    await removeCheckbox.check();
    await page.getByRole("button", { name: /enregistrer/i }).first().click();
    await page.waitForURL(/\/settings\?saved=1/, { timeout: 10000 }).catch(() => {});
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForTimeout(300);
    const logoAfterRemoval = await page.locator("img[alt='Aperçu du logo']").isVisible().catch(() => false);
    check("logo bien absent après suppression", !logoAfterRemoval);
  } else {
    check("case de suppression du logo trouvée", false);
  }
  await page.screenshot({ path: path.join(SCREEN_DIR, "10-settings-after-logo.png"), fullPage: true });
  await ctx.close();
}

console.log("\n=== 7. Erreurs console/réseau accumulées ===");
check("aucune erreur console JS détectée sur l'ensemble du parcours", consoleErrors.length === 0);
if (consoleErrors.length > 0) {
  console.log(consoleErrors.slice(0, 10).join("\n"));
}

await browser.close();
console.log(`\n=== Résultat global : ${failures === 0 ? "TOUS LES CONTRÔLES PASSENT" : `${failures} ÉCHEC(S)`} ===`);
process.exit(failures === 0 ? 0 : 1);
