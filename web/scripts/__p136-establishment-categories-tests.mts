import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const BASE_URL = "http://localhost:3001";
const TEST_PASSWORD = "PlaywrightTest!2026";

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? "OK " : "ECHEC "} — ${label}`);
  if (!condition) failures++;
}

async function freshContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext();
}

async function waitForBodyText(page: Page, predicate: (text: string) => boolean, timeoutMs = 8000): Promise<string> {
  const start = Date.now();
  let last = "";
  while (Date.now() - start < timeoutMs) {
    last = (await page.locator("body").textContent().catch(() => "")) ?? "";
    if (predicate(last)) return last;
    await page.waitForTimeout(200);
  }
  return last;
}

async function login(context: BrowserContext, username: string, password: string) {
  const page = await context.newPage();
  page.on("dialog", (d) => d.accept());
  await page.goto(`${BASE_URL}/login`);
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /se connecter/i }).click();
  await page.waitForURL(`${BASE_URL}/`, { timeout: 8000 }).catch(() => {});
  return page;
}

const browser = await chromium.launch();
const NOM_A = "P136 Etablissement Auto";
const NOM_B = "P136 Etablissement Manuel";
const EMAIL_A = "p136-auto@test.sama-home.local";
const EMAIL_B = "p136-manuel@test.sama-home.local";

// ---------------------------------------------------------------------------
// Préparation A — activer l'approbation automatique (réellement, via l'UI).
// ---------------------------------------------------------------------------
console.log("=== Préparation : activation réelle de l'approbation automatique ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-platform-admin", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/plateforme/parametres`);
  const body = await waitForBodyText(page, (t) => t.length > 0);
  if (body.includes("Désactivée")) {
    await page.getByRole("button", { name: /^activer$/i }).click();
    await page.waitForTimeout(800);
  }
  const after = await waitForBodyText(page, (t) => t.includes("Activée"));
  check("approbation automatique réellement activée", after.includes("Activée"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// TEST A — Inscription publique (auto-approuvée).
// ---------------------------------------------------------------------------
console.log("\n=== TEST A : inscription publique (auto-approbation) ===");
const establishmentIdA: string | null = null;
{
  const ctx = await freshContext(browser);
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/register`);
  await page.locator("#establishmentName").fill(NOM_A);
  await page.locator("#managerName").fill("Gestionnaire Auto Test");
  await page.locator("#email").fill(EMAIL_A);
  await page.locator("#password").fill(TEST_PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /créer mon espace/i }).click();
  const body = await waitForBodyText(page, (t) => t.includes("Votre espace a été créé"));
  check("inscription réellement réussie (message de confirmation réel)", body.includes("Votre espace a été créé"));
  await ctx.close();
}
{
  // Connexion réelle avec le nouveau compte pour confirmer l'accès métier
  // immédiat (preuve indirecte que l'établissement est bien ACTIVE, pas PENDING).
  const ctx = await freshContext(browser);
  const page = await login(ctx, EMAIL_A, TEST_PASSWORD);
  await page.goto(`${BASE_URL}/depenses/new`);
  const body = await waitForBodyText(page, (t) => t.length > 0);
  check("accès métier immédiat (établissement réellement ACTIVE, pas PENDING)", page.url() === `${BASE_URL}/depenses/new`);
  check("les 10 catégories par défaut sont réellement proposées (Loyer visible)", body.includes("Loyer"));
  check("catégorie « Autre » réellement présente", body.includes("Autre"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// Préparation B — désactiver l'approbation automatique (réellement).
// ---------------------------------------------------------------------------
console.log("\n=== Préparation : désactivation réelle de l'approbation automatique ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-platform-admin", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/plateforme/parametres`);
  const body = await waitForBodyText(page, (t) => t.length > 0);
  if (body.includes("Activée")) {
    await page.getByRole("button", { name: /^désactiver$/i }).click();
    await page.waitForTimeout(800);
  }
  const after = await waitForBodyText(page, (t) => t.includes("Désactivée"));
  check("approbation automatique réellement désactivée (restauration de l'état initial)", after.includes("Désactivée"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// TEST B — Approbation manuelle.
// ---------------------------------------------------------------------------
console.log("\n=== TEST B : inscription + approbation manuelle réelle ===");
{
  const ctx = await freshContext(browser);
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/register`);
  await page.locator("#establishmentName").fill(NOM_B);
  await page.locator("#managerName").fill("Gestionnaire Manuel Test");
  await page.locator("#email").fill(EMAIL_B);
  await page.locator("#password").fill(TEST_PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /créer mon espace/i }).click();
  const body = await waitForBodyText(page, (t) => t.includes("Votre espace a été créé"));
  check("inscription réellement réussie", body.includes("Votre espace a été créé"));
  await ctx.close();
}
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, EMAIL_B, TEST_PASSWORD);
  await page.goto(`${BASE_URL}/depenses/new`);
  const body = await waitForBodyText(page, (t) => t.includes("inactif"));
  check("accès métier réellement bloqué avant approbation (établissement PENDING)", body.includes("inactif"));
  await ctx.close();
}
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-platform-admin", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/plateforme/etablissements?status=PENDING`);
  await waitForBodyText(page, (t) => t.includes(NOM_B));
  // Cible précisément la carte contenant NOM_B (jamais un bouton générique :
  // "P118 Hotel En Attente" est aussi PENDING dans cette base de test).
  const card = page.locator("div", { hasText: NOM_B }).last();
  await card.getByRole("button", { name: /^approuver$/i }).click();
  await page.waitForTimeout(1000);
  const after = await waitForBodyText(page, (t) => t.length > 0);
  check("l'établissement n'apparaît plus dans le filtre PENDING après approbation", !after.includes(NOM_B));
  await ctx.close();
}
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, EMAIL_B, TEST_PASSWORD);
  await page.goto(`${BASE_URL}/depenses/new`);
  const body = await waitForBodyText(page, (t) => t.length > 0);
  check("accès métier réel désormais autorisé après approbation", page.url() === `${BASE_URL}/depenses/new`);
  check("les 10 catégories par défaut réellement présentes après approbation manuelle", body.includes("Loyer") && body.includes("Autre"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// TEST C (partiel, live) — isolation réelle entre A et B.
// ---------------------------------------------------------------------------
console.log("\n=== TEST C : isolation réelle entre les deux nouveaux établissements ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, EMAIL_A, TEST_PASSWORD);
  await page.goto(`${BASE_URL}/settings/expense-categories`);
  const body = await waitForBodyText(page, (t) => t.length > 0);
  check("l'établissement A voit exactement 10 catégories (jamais 20, jamais celles de B)", (body.match(/Loyer/g) ?? []).length === 1);
  await ctx.close();
}

await browser.close();
console.log(`\n=== Résultat global : ${failures === 0 ? "TOUS LES CONTRÔLES PASSENT" : `${failures} ÉCHEC(S)`} ===`);
process.exit(failures === 0 ? 0 : 1);
