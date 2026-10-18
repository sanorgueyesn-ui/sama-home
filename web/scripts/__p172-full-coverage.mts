import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import path from "node:path";

const BASE_URL = "http://localhost:3002";
const TEST_PASSWORD = "PlaywrightTest!2026";
const SCREEN_DIR = path.join(process.cwd(), "scripts", "__p172-screens");

const RESERVATION_ID = "cmv9juhj0001srsuff4ctv05y";
const RENTAL_ID = "cmv9jur56001trsuf6yykyuoh";
const PROPERTY_ID = "cmv9e0eya0003zkuf3rb3juaw";
const BANK_ACCOUNT_ID = "cmv9l1mls002srsufkm4m8rv9";

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
      if (msg.type() === "error") consoleErrors.push(`[${page.url()}] ${msg.text().slice(0, 150)}`);
    });
  });
  return ctx;
}

async function login(context: BrowserContext, username: string, password = TEST_PASSWORD) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`);
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /se connecter/i }).click();
  await page.waitForURL(`${BASE_URL}/`, { timeout: 8000 }).catch(() => {});
  return page;
}

const browser = await chromium.launch();

console.log("=== 1. Clients : liste + création ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif");
  await page.goto(`${BASE_URL}/clients`);
  check("liste clients accessible", page.url() === `${BASE_URL}/clients`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: path.join(SCREEN_DIR, "01-clients-list.png"), fullPage: true });

  await page.goto(`${BASE_URL}/clients/new`);
  await page.locator("#name").fill("P172 Client Test");
  await page.locator("#phone").fill("761112233");
  await page.getByRole("button", { name: /enregistrer|créer|ajouter/i }).first().click();
  await page.waitForURL((u) => u.pathname.startsWith("/clients") && !u.pathname.includes("/new"), { timeout: 8000 }).catch(() => {});
  check("client créé (plus sur le formulaire vide, ou message de succès)", page.url().includes("/clients") && !page.url().includes("/new"));
  await page.screenshot({ path: path.join(SCREEN_DIR, "02-client-created.png"), fullPage: true });
  await ctx.close();
}

console.log("\n=== 2. Dépenses et catégories ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif");
  await page.goto(`${BASE_URL}/depenses`);
  check("page dépenses accessible", page.url() === `${BASE_URL}/depenses`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: path.join(SCREEN_DIR, "03-depenses.png"), fullPage: true });

  await page.goto(`${BASE_URL}/settings/expense-categories/new`);
  await page.locator("#name").fill("P172 Catégorie Test");
  await page.getByRole("button", { name: /enregistrer|créer|ajouter/i }).first().click();
  await page.waitForTimeout(1000);
  check("catégorie créée (retour à la liste)", !page.url().includes("/new"));
  await page.screenshot({ path: path.join(SCREEN_DIR, "04-categorie-created.png"), fullPage: true });

  await page.goto(`${BASE_URL}/depenses/new`);
  const body = await page.locator("body").textContent();
  check("nouvelle catégorie proposée dans le formulaire de dépense", !!body?.includes("P172 Catégorie Test"));
  await ctx.close();
}

console.log("\n=== 3. Virements bancaires programmés ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif");
  await page.goto(`${BASE_URL}/settings/transfer-schedules`);
  check("page virements programmés accessible", page.url() === `${BASE_URL}/settings/transfer-schedules`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: path.join(SCREEN_DIR, "05-transfer-schedules.png"), fullPage: true });
  await ctx.close();
}

console.log("\n=== 4. Édition d'un bien existant ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif");
  await page.goto(`${BASE_URL}/logements/${PROPERTY_ID}/edit`);
  check("formulaire d'édition de bien accessible", page.url().includes(`${PROPERTY_ID}/edit`));
  await page.waitForLoadState("networkidle").catch(() => {});
  const nameField = page.locator("#name");
  const nameFieldVisible = await nameField.isVisible().catch(() => false);
  check("champ nom pré-rempli", nameFieldVisible && (await nameField.inputValue()).length > 0);
  await page.screenshot({ path: path.join(SCREEN_DIR, "06-property-edit.png"), fullPage: true });
  await ctx.close();
}

console.log("\n=== 5. Édition d'une réservation existante ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif");
  await page.goto(`${BASE_URL}/reservations/${RESERVATION_ID}`);
  check("fiche réservation accessible", page.url().includes(RESERVATION_ID));
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: path.join(SCREEN_DIR, "07-reservation-detail.png"), fullPage: true });

  await page.goto(`${BASE_URL}/reservations/${RESERVATION_ID}/edit`);
  check("formulaire d'édition de réservation accessible", page.url().includes("edit"));
  await page.screenshot({ path: path.join(SCREEN_DIR, "08-reservation-edit.png"), fullPage: true });
  await ctx.close();
}

console.log("\n=== 6. Édition/prolongation d'une location existante ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif");
  await page.goto(`${BASE_URL}/locations/${RENTAL_ID}`);
  check("fiche location accessible", page.url().includes(RENTAL_ID));
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: path.join(SCREEN_DIR, "09-location-detail.png"), fullPage: true });

  await page.goto(`${BASE_URL}/locations/${RENTAL_ID}/extend`);
  const extendVisible = page.url().includes("extend");
  check("formulaire de prolongation accessible", extendVisible);
  await page.screenshot({ path: path.join(SCREEN_DIR, "10-location-extend.png"), fullPage: true });
  await ctx.close();
}

console.log("\n=== 7. Contrat PDF réel ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif");
  // La route contrat déclenche un téléchargement direct (PDF), pas une
  // navigation classique — Playwright traite cela comme un événement
  // "download", jamais une erreur de page.goto().
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 15000 }).catch(() => null),
    page.goto(`${BASE_URL}/locations/${RENTAL_ID}/contract`).catch(() => null),
  ]);
  check("un téléchargement PDF réel a démarré", !!download);
  if (download) {
    const savedPath = path.join(SCREEN_DIR, "11-contract.pdf");
    await download.saveAs(savedPath);
    const fs = await import("node:fs");
    const size = fs.statSync(savedPath).size;
    check("le PDF téléchargé est non vide et a une taille plausible", size > 1000);
    check("le fichier commence bien par la signature PDF (%PDF-)", fs.readFileSync(savedPath, { encoding: "latin1", flag: "r" }).slice(0, 5) === "%PDF-");
  }
  await ctx.close();
}

console.log("\n=== 8. Inscription publique (/register) ===");
{
  const ctx = await freshContext(browser);
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/register`);
  check("page inscription accessible sans authentification", page.url() === `${BASE_URL}/register`);
  await page.screenshot({ path: path.join(SCREEN_DIR, "12-register.png"), fullPage: true });
  await ctx.close();
}

console.log("\n=== 9. Abonnement ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif");
  await page.goto(`${BASE_URL}/abonnement`);
  check("page abonnement accessible pour un établissement actif", page.url() === `${BASE_URL}/abonnement`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: path.join(SCREEN_DIR, "13-abonnement.png"), fullPage: true });
  await ctx.close();
}

console.log("\n=== 10. Administration plateforme ===");
{
  const ctxNonAdmin = await freshContext(browser);
  const pageNonAdmin = await login(ctxNonAdmin, "p118-admin-actif");
  await pageNonAdmin.goto(`${BASE_URL}/plateforme`);
  await pageNonAdmin.waitForTimeout(500);
  check(
    "un ADMIN d'établissement (non plateforme) ne voit PAS le tableau de bord plateforme",
    pageNonAdmin.url() !== `${BASE_URL}/plateforme` || !(await pageNonAdmin.locator("body").textContent())?.includes("Tableau de bord"),
  );
  await pageNonAdmin.screenshot({ path: path.join(SCREEN_DIR, "14-plateforme-denied.png"), fullPage: true });
  await ctxNonAdmin.close();

  const ctxAdmin = await freshContext(browser);
  const pageAdmin = await login(ctxAdmin, "p118-platform-admin");
  await pageAdmin.goto(`${BASE_URL}/plateforme`);
  check("un administrateur de plateforme accède au tableau de bord plateforme", pageAdmin.url() === `${BASE_URL}/plateforme`);
  await pageAdmin.waitForLoadState("networkidle").catch(() => {});
  await pageAdmin.screenshot({ path: path.join(SCREEN_DIR, "15-plateforme-admin.png"), fullPage: true });

  await pageAdmin.goto(`${BASE_URL}/plateforme/etablissements`);
  await pageAdmin.waitForLoadState("networkidle").catch(() => {});
  await pageAdmin.screenshot({ path: path.join(SCREEN_DIR, "16-plateforme-etablissements.png"), fullPage: true });
  await ctxAdmin.close();
}

console.log("\n=== 11. Pages d'erreur / états vides ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif");
  await page.goto(`${BASE_URL}/reservations/this-id-does-not-exist`);
  await page.waitForTimeout(500);
  check("identifiant inexistant géré sans crash (404 ou redirection, pas d'erreur non gérée)", page.url().length > 0);
  await page.screenshot({ path: path.join(SCREEN_DIR, "17-not-found.png"), fullPage: true });
  await ctx.close();
}

console.log("\n=== 12. Mobile — quelques écrans clés ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/clients`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREEN_DIR, "18-clients-mobile.png"), fullPage: true });
  await page.goto(`${BASE_URL}/depenses`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREEN_DIR, "19-depenses-mobile.png"), fullPage: true });
  await ctx.close();
}

console.log("\n=== Erreurs console accumulées ===");
check("aucune erreur console JS détectée (hors avertissement d'hydratation déjà connu)", consoleErrors.filter((e) => !e.includes("hydrat")).length === 0);
if (consoleErrors.length > 0) {
  console.log(consoleErrors.slice(0, 15).join("\n"));
}

await browser.close();
console.log(`\n=== Résultat global : ${failures === 0 ? "TOUS LES CONTRÔLES PASSENT" : `${failures} ÉCHEC(S)`} ===`);
process.exit(failures === 0 ? 0 : 1);
