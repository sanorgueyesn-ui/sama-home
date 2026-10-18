import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const BASE_URL = "http://localhost:3001";
const TEST_PASSWORD = "PlaywrightTest!2026";
const CATEGORY_NAME = "P126 Catégorie Test";
const CATEGORY_NAME_RENAMED = "P126 Catégorie Renommée";

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

// ---------------------------------------------------------------------------
// I1 — Consultation : aucune catégorie encore enregistrée.
// ---------------------------------------------------------------------------
console.log("=== I1 : consultation des catégories (état vide réel) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/settings/expense-categories`);
  const body = await waitForBodyText(page, (t) => t.length > 0);
  check("page accessible à l'ADMIN (pas de redirection)", page.url() === `${BASE_URL}/settings/expense-categories`);
  check("aucune catégorie réelle encore présente", body.includes("Aucune catégorie de dépense"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// I2 — Création d'une catégorie réelle.
// ---------------------------------------------------------------------------
console.log("\n=== I2 : création réelle d'une catégorie ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/settings/expense-categories/new`);
  await page.locator("#name").fill(CATEGORY_NAME);
  await page.getByRole("button", { name: /^créer$/i }).click();
  await page.waitForURL(/done=created/, { timeout: 8000 }).catch(() => {});
  check("catégorie créée réellement (redirection done=created)", page.url().includes("done=created"));
  const body = await waitForBodyText(page, (t) => t.includes(CATEGORY_NAME));
  check("la catégorie réelle apparaît dans la liste", body.includes(CATEGORY_NAME));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// I4 — Renommage réel.
// ---------------------------------------------------------------------------
console.log("\n=== I4 : renommage réel de la catégorie ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/settings/expense-categories`);
  await page.getByRole("button", { name: /^renommer$/i }).first().click();
  await page.locator("input[type=text]").last().fill(CATEGORY_NAME_RENAMED);
  await page.getByRole("button", { name: /^enregistrer$/i }).click();
  const body = await waitForBodyText(page, (t) => t.includes(CATEGORY_NAME_RENAMED));
  check("le nouveau nom réel est bien affiché après renommage", body.includes(CATEGORY_NAME_RENAMED));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// I5 — Désactivation réelle (aucune dépense ne l'utilise encore).
// ---------------------------------------------------------------------------
console.log("\n=== I5 : désactivation réelle (sans dépense associée) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/settings/expense-categories`);
  await page.getByRole("button", { name: /^désactiver$/i }).first().click();
  await page.locator("textarea").fill("Test D12-P126 — désactivation temporaire");
  await page.getByRole("button", { name: /^désactiver$/i }).click();
  const body = await waitForBodyText(page, (t) => t.includes("Désactivée"));
  check("le badge réel « Désactivée » apparaît", body.includes("Désactivée"));

  await page.goto(`${BASE_URL}/depenses/new`);
  const bodyNew = await waitForBodyText(page, (t) => t.length > 0);
  check("une catégorie désactivée n'est jamais proposée pour une nouvelle dépense (absente du menu réel)", !bodyNew.includes(CATEGORY_NAME_RENAMED));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// I6 — Réactivation réelle (nécessaire pour l'utiliser dans une dépense).
// ---------------------------------------------------------------------------
console.log("\n=== I6 : réactivation réelle ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/settings/expense-categories`);
  await page.getByRole("button", { name: /^activer$/i }).first().click();
  await page.waitForTimeout(800);
  const body = await waitForBodyText(page, (t) => t.length > 0);
  check("la catégorie n'affiche plus le badge « Désactivée »", !body.includes("Désactivée"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// I7 — Consultation des dépenses (état vide réel).
// ---------------------------------------------------------------------------
console.log("\n=== I7 : consultation des dépenses (état vide réel) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/depenses`);
  check("page dépenses accessible (pas de redirection)", page.url() === `${BASE_URL}/depenses`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// I8/I13a — Création réelle d'une dépense CASH (impact caisse mesuré avant).
// ---------------------------------------------------------------------------
console.log("\n=== I8 : création réelle d'une dépense (300 FCFA, CASH) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/caisse`);
  const bodyBefore = await waitForBodyText(page, (t) => t.includes("SOLDE THÉORIQUE ACTUEL"));
  check("solde théorique réel avant la dépense (13 000 FCFA attendu)", bodyBefore.includes("13 000 FCFA"));

  await page.goto(`${BASE_URL}/depenses/new`);
  await page.locator("#categoryId").selectOption({ label: CATEGORY_NAME_RENAMED });
  await page.locator("#amount").fill("300");
  // Mode de paiement déjà par défaut sur CASH.
  await page.locator("#reference").fill("P126-TEST");
  await page.getByRole("button", { name: /enregistrer la dépense/i }).click();
  await page.waitForURL(/\/depenses\?created=1/, { timeout: 8000 }).catch(() => {});
  check("dépense créée réellement (redirection created=1)", page.url().includes("created=1"));
  const bodyList = await waitForBodyText(page, (t) => t.includes(CATEGORY_NAME_RENAMED));
  check("la dépense réelle apparaît dans la liste (catégorie + montant)", bodyList.includes(CATEGORY_NAME_RENAMED) && (bodyList.includes("300 FCFA")));

  await page.goto(`${BASE_URL}/caisse`);
  const bodyAfter = await waitForBodyText(page, (t) => t.includes("12 700 FCFA"));
  check("le solde théorique réel a bien diminué de 300 FCFA (13000 -> 12700, dépense CASH)", bodyAfter.includes("12 700 FCFA"));
  check("la dépense CASH apparaît distinctement dans la décomposition", bodyAfter.includes("Dépenses CASH"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// I11 — Désactivation de la catégorie maintenant référencée par 1 dépense.
// ---------------------------------------------------------------------------
console.log("\n=== I11 : désactivation d'une catégorie déjà référencée par une dépense ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/settings/expense-categories`);
  const bodyBefore = await waitForBodyText(page, (t) => t.includes("Utilisée dans l'historique"));
  check("l'usage réel de la catégorie est bien affiché (1 dépense)", bodyBefore.includes("Utilisée dans l'historique (1)"));
  check("le bouton Supprimer est absent pour une catégorie référencée (jamais une suppression destructive)", !bodyBefore.includes(">Supprimer<"));

  await page.getByRole("button", { name: /^désactiver$/i }).first().click();
  await page.locator("textarea").fill("Test D12-P126 — désactivation avec historique");
  await page.getByRole("button", { name: /^désactiver$/i }).click();
  const body = await waitForBodyText(page, (t) => t.includes("Désactivée"));
  check("désactivation réelle réussie malgré l'historique (seule la suppression est bloquée, jamais la désactivation)", body.includes("Désactivée"));
  await ctx.close();
}

await browser.close();
console.log(`\n=== Résultat global (partie 1) : ${failures === 0 ? "TOUS LES CONTRÔLES PASSENT" : `${failures} ÉCHEC(S)`} ===`);
process.exit(failures === 0 ? 0 : 1);
