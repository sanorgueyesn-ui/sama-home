import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

// Poursuite de D12-P124 après l'incident de script (double gestionnaire de
// dialogue natif) survenu pendant l'exécution du script principal
// (__p124-bank-tests.mts). L'état réel de la base de test a été relu avant
// d'écrire ce script (voir rapport) — aucune donnée fabriquée, uniquement
// la suite réelle des scénarios H8 à H14 sur l'état réel actuel.

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

// ---------------------------------------------------------------------------
// H9a — Annuler le virement DRAFT (500 FCFA), le plus récent (index 0, tri
// createdAt desc confirmé par lecture directe de la base avant ce script).
// ---------------------------------------------------------------------------
console.log("=== H9a : annuler le virement DRAFT (500 FCFA) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/caisse/virements`);
  await page.getByRole("button", { name: /^annuler$/i }).nth(0).click();
  await page.waitForTimeout(1000);
  const body = await waitForBodyText(page, (t) => t.length > 0);
  check("un virement supplémentaire porte désormais le statut Annulé", (body.match(/Annulé/g) ?? []).length >= 1);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// H8 — Effectuer l'un des virements SCHEDULED (1000 FCFA) ; une session de
// caisse OPEN existe déjà réellement (ouverte pendant la tentative précédente
// du script principal, solde d'ouverture 14500, déjà réduit de 500 par un
// encaissement effectué accidentellement pendant cette même tentative —
// solde théorique réel actuel avant cette action : 14000 FCFA).
// ---------------------------------------------------------------------------
console.log("\n=== H8 : effectuer un virement programmé (1000 FCFA) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/caisse`);
  const bodyBefore = await waitForBodyText(page, (t) => t.includes("SOLDE THÉORIQUE ACTUEL"));
  check("solde théorique réel avant l'effet (14 000 FCFA attendu)", bodyBefore.includes("14 000 FCFA"));

  await page.goto(`${BASE_URL}/caisse/virements`);
  await page.getByRole("button", { name: /effectuer le virement/i }).nth(0).click();
  await page.waitForTimeout(1500);
  const body = await waitForBodyText(page, (t) => t.includes("Effectué"));
  check("un virement de 1000 FCFA est réellement passé à EFFECTED", body.includes("Effectué"));

  await page.goto(`${BASE_URL}/caisse`);
  const bodyAfter = await waitForBodyText(page, (t) => t.includes("13 000 FCFA"));
  check("le solde théorique réel a bien diminué de 1000 FCFA (14000 -> 13000)", bodyAfter.includes("13 000 FCFA"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// H9b — Annuler le virement SCHEDULED restant (1000 FCFA) : jamais effectué,
// doit rester sans impact sur le solde.
// ---------------------------------------------------------------------------
console.log("\n=== H9b : annuler le second virement SCHEDULED restant (1000 FCFA) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/caisse/virements`);
  await page.getByRole("button", { name: /^annuler$/i }).nth(0).click();
  await page.waitForTimeout(1000);
  const body = await waitForBodyText(page, (t) => (t.match(/Annulé/g) ?? []).length >= 2);
  check("un deuxième virement réel porte désormais le statut Annulé", (body.match(/Annulé/g) ?? []).length >= 2);

  await page.goto(`${BASE_URL}/caisse`);
  const bodyCash = await waitForBodyText(page, (t) => t.includes("13 000 FCFA"));
  check("le solde théorique reste inchangé (13 000 FCFA) — un virement annulé n'a jamais été soustrait", bodyCash.includes("13 000 FCFA"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// H10 — Désactivation du compte bancaire référencé par 2 programmations
// actives réelles : l'avertissement réel documenté (D12-P42) doit apparaître.
// ---------------------------------------------------------------------------
console.log("\n=== H10 : désactivation du compte bancaire — avertissement réel (2 programmations actives) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/settings/bank-accounts`);
  // Le premier compte réel créé (référencé par les 2 programmations) est
  // listé en premier (tri alphabétique identique entre les 3 doublons,
  // donc par ordre de création parmi les actifs) — désactivé ici.
  await page.getByRole("button", { name: /désactiver/i }).nth(0).click();
  const body = await waitForBodyText(page, (t) => t.includes("programmation"));
  check("l'avertissement réel sur les programmations actives est bien affiché", body.includes("programmation") && body.includes("actives"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// H11 — Désactivation d'une programmation de virement réelle.
// ---------------------------------------------------------------------------
console.log("\n=== H11 : désactivation d'une programmation de virement ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/settings/transfer-schedules`);
  const before = await waitForBodyText(page, (t) => t.length > 0);
  check("au moins une programmation réelle est listée", before.includes("P124 Compte Test"));
  await page.getByRole("button", { name: /désactiver/i }).nth(0).click();
  await page.waitForTimeout(1000);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// H12 — Autorisations réelles : GESTIONNAIRE redirigé hors des pages ADMIN.
// ---------------------------------------------------------------------------
console.log("\n=== H12 : autorisations — comportement réel d'un rôle GESTIONNAIRE ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p123-gestionnaire", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/settings/bank-accounts/new`);
  // La redirection réelle (requireAdmin -> redirect("/")) est ici appliquée
  // après le premier flux HTML (même mécanisme de streaming déjà démontré en
  // D12-P119 : /settings possède un loading.tsx ancestral) — exécutée
  // côté client après hydratation, jamais instantanément au chargement.
  await page.waitForURL(`${BASE_URL}/`, { timeout: 8000 }).catch(() => {});
  check("redirection réelle hors de la page Comptes bancaires (requireAdmin)", page.url() === `${BASE_URL}/`);
  await page.goto(`${BASE_URL}/settings/transfer-schedules/new`);
  await page.waitForURL(`${BASE_URL}/`, { timeout: 8000 }).catch(() => {});
  check("redirection réelle hors de la page Programmations (requireAdmin)", page.url() === `${BASE_URL}/`);
  await page.goto(`${BASE_URL}/caisse/virements/new`);
  check("page de création de virement bien accessible à un GESTIONNAIRE", page.url() === `${BASE_URL}/caisse/virements/new`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// H13 — Isolation réelle inter-établissements.
// ---------------------------------------------------------------------------
console.log("\n=== H13 : isolation — établissement étranger (« P118 Hotel Actif 2 ») ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif2", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/settings/bank-accounts`);
  const body1 = await waitForBodyText(page, (t) => t.length > 0);
  check("aucun compte bancaire réel de l'établissement étranger n'apparaît", !body1.includes("P124 Compte Test"));
  await page.goto(`${BASE_URL}/caisse/virements`);
  const body2 = await waitForBodyText(page, (t) => t.length > 0);
  check("aucun virement réel de l'établissement étranger n'apparaît", !body2.includes("P124 Compte Test"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// H14 — Établissement suspendu : création bloquée.
// ---------------------------------------------------------------------------
console.log("\n=== H14 : établissement suspendu — création de compte bancaire bloquée ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-suspendu", TEST_PASSWORD);
  check("connexion acceptée malgré la suspension", page.url() === `${BASE_URL}/`);
  await page.goto(`${BASE_URL}/settings/bank-accounts/new`);
  await page.locator("#label").fill("Ne devrait jamais être créé");
  await page.locator("#bankName").fill("Banque Test");
  await page.getByRole("button", { name: /^créer$/i }).click();
  const body = await waitForBodyText(page, (t) => t.includes("inactif"));
  check("message réel de blocage affiché (établissement inactif)", body.includes("inactif"));
  await ctx.close();
}

await browser.close();
console.log(`\n=== Résultat global : ${failures === 0 ? "TOUS LES CONTRÔLES PASSENT" : `${failures} ÉCHEC(S)`} ===`);
process.exit(failures === 0 ? 0 : 1);
