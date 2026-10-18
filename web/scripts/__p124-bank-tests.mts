import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const BASE_URL = "http://localhost:3001";
const TEST_PASSWORD = "PlaywrightTest!2026";

let failures = 0;
function check(label: string, condition: boolean) {
  console.log(`${condition ? "OK " : "ECHEC "} — ${label}`);
  if (!condition) failures++;
}

async function freshContext(browser: Browser): Promise<BrowserContext> {
  const ctx = await browser.newContext();
  return ctx;
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

function isoLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const browser = await chromium.launch();

// ---------------------------------------------------------------------------
// H1 — Consultation : aucun compte bancaire ni virement encore enregistrés.
// ---------------------------------------------------------------------------
console.log("=== H1 : consultation — comptes bancaires et virements, état vide réel ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/settings/bank-accounts`);
  const body1 = await waitForBodyText(page, (t) => t.length > 0);
  check("page comptes bancaires accessible à l'ADMIN (pas de redirection)", page.url() === `${BASE_URL}/settings/bank-accounts`);
  await page.goto(`${BASE_URL}/caisse/virements`);
  const body2 = await waitForBodyText(page, (t) => t.length > 0);
  check("page virements accessible (pas de redirection)", page.url() === `${BASE_URL}/caisse/virements`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// H2 — Création d'un compte bancaire réel.
// ---------------------------------------------------------------------------
console.log("\n=== H2 : création réelle d'un compte bancaire ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/settings/bank-accounts/new`);
  await page.locator("#label").fill("P124 Compte Test");
  await page.locator("#bankName").fill("Ecobank");
  await page.getByRole("button", { name: /^créer$/i }).click();
  await page.waitForURL(/\/settings\/bank-accounts\?done=created/, { timeout: 8000 }).catch(() => {});
  check("compte créé réellement (redirection done=created)", page.url().includes("done=created"));
  const body = await waitForBodyText(page, (t) => t.includes("P124 Compte Test"));
  check("le compte réel apparaît dans la liste", body.includes("P124 Compte Test") && body.includes("Ecobank"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// H3 — Programmation de virement, échéance déjà due (passé proche).
// ---------------------------------------------------------------------------
console.log("\n=== H3 : création d'une programmation de virement (échéance déjà due) ===");
const dueAt = new Date(Date.now() - 2 * 60 * 60 * 1000); // il y a 2h
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/settings/transfer-schedules/new`);
  await page.locator("#bankAccountId").selectOption({ label: "P124 Compte Test · Ecobank" });
  // Fréquence laissée à son défaut (Hebdomadaire) — seule l'échéance compte.
  await page.locator("#fixedAmount").fill("1000");
  await page.locator("#nextRunAt").fill(isoLocal(dueAt));
  await page.getByRole("button", { name: /^créer$/i }).click();
  await page.waitForURL(/\/settings\/transfer-schedules\?done=created/, { timeout: 8000 }).catch(() => {});
  check("programmation créée réellement (redirection done=created)", page.url().includes("done=created"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// H4 — Point de vigilance : generateDueScheduledTransfers() déclenchée par
// la simple consultation de /caisse/virements.
// ---------------------------------------------------------------------------
console.log("\n=== H4 : génération paresseuse — première consultation (doit générer 1 virement) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/caisse/virements`);
  const body = await waitForBodyText(page, (t) => t.includes("1 000 FCFA") || t.includes("1000 FCFA"));
  check("un virement SCHEDULED de 1000 FCFA a été réellement généré par la simple consultation", body.includes("1 000 FCFA") || body.includes("1000 FCFA"));
  check("le compte réel associé est affiché", body.includes("P124 Compte Test"));
  await ctx.close();
}

console.log("\n=== H5 : génération paresseuse — seconde consultation (ne doit PAS dupliquer) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/caisse/virements`);
  const body = await waitForBodyText(page, (t) => t.length > 0);
  console.log(`   Observation brute (texte de la page, non décisive seule) : ${(body.match(/1[\s ]000 FCFA/g) ?? []).length} occurrence(s) de "1 000 FCFA".`);
  console.log("   Preuve décisive : comptage réel en base, effectué séparément en Phase 4 (nombre de BankTransfer liés à cette programmation).");
  await ctx.close();
}

// ---------------------------------------------------------------------------
// H6 — Virement manuel (DRAFT), destiné à être annulé.
// ---------------------------------------------------------------------------
console.log("\n=== H6 : création d'un virement manuel DRAFT (500 FCFA, pour annulation) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/caisse/virements/new`);
  await page.locator("#bankAccountId").selectOption({ label: "P124 Compte Test · Ecobank" });
  await page.locator("#amount").fill("500");
  await page.getByRole("button", { name: /^créer$/i }).click();
  await page.waitForURL(/\/caisse\/virements\?done=created/, { timeout: 8000 }).catch(() => {});
  check("virement manuel créé réellement", page.url().includes("done=created"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// H7 — Ouverture normale de la caisse (une session précédente existe déjà,
// D12-P123 — solde proposé 14 500 FCFA).
// ---------------------------------------------------------------------------
console.log("\n=== H7 : ouverture normale de la caisse (solde proposé 14 500 FCFA) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/caisse`);
  const bodyBefore = await waitForBodyText(page, (t) => t.includes("14 500 FCFA"));
  check("montant d'ouverture proposé réel (14 500 FCFA, repris de la clôture précédente)", bodyBefore.includes("14 500 FCFA"));
  await page.getByRole("button", { name: /ouvrir la caisse/i }).click();
  const body = await waitForBodyText(page, (t) => t.includes("SOLDE THÉORIQUE ACTUEL"));
  check("session normale ouverte réellement", body.includes("SOLDE THÉORIQUE ACTUEL") && body.includes("14 500 FCFA"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// H8 — Effectuer le virement programmé (1000 FCFA) : doit réduire le solde
// théorique de la caisse.
// ---------------------------------------------------------------------------
console.log("\n=== H8 : effectuer le virement programmé (1000 FCFA) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/caisse/virements`);
  await page.getByRole("button", { name: /effectuer le virement/i }).first().click();
  await page.waitForTimeout(1500);
  const body = await waitForBodyText(page, (t) => t.includes("Effectué"));
  check("le virement de 1000 FCFA est réellement passé à EFFECTED", body.includes("Effectué"));

  await page.goto(`${BASE_URL}/caisse`);
  const bodyCash = await waitForBodyText(page, (t) => t.includes("13 500 FCFA"));
  check("le solde théorique réel de la caisse a bien diminué de 1000 FCFA (14500 -> 13500)", bodyCash.includes("13 500 FCFA"));
  check("le versement bancaire apparaît distinctement dans la décomposition", bodyCash.includes("Versements vers la banque"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// H9 — Annuler le virement manuel DRAFT (500 FCFA) : jamais effectué, doit
// rester sans impact sur le solde de caisse.
// ---------------------------------------------------------------------------
console.log("\n=== H9 : annuler le virement manuel DRAFT (500 FCFA) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/caisse/virements`);
  await page.getByRole("button", { name: /^annuler$/i }).first().click();
  await page.waitForTimeout(1000);
  const body = await waitForBodyText(page, (t) => t.includes("Annulé"));
  check("le virement de 500 FCFA est réellement passé à CANCELLED", body.includes("Annulé"));

  await page.goto(`${BASE_URL}/caisse`);
  const bodyCash = await waitForBodyText(page, (t) => t.includes("13 500 FCFA"));
  check("le solde théorique reste inchangé (13 500 FCFA) — un virement annulé n'a jamais été soustrait", bodyCash.includes("13 500 FCFA"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// H10 — Désactivation du compte bancaire alors que la programmation est
// encore active : l'avertissement réel documenté (D12-P42) doit apparaître.
// ---------------------------------------------------------------------------
console.log("\n=== H10 : désactivation du compte bancaire — avertissement réel (programmation active) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/settings/bank-accounts`);
  await page.getByRole("button", { name: /désactiver/i }).click();
  const body = await waitForBodyText(page, (t) => t.includes("programmation"));
  check("l'avertissement réel sur la programmation active est bien affiché", body.includes("programmation") && body.includes("active"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// H11 — Désactivation de la programmation elle-même.
// ---------------------------------------------------------------------------
console.log("\n=== H11 : désactivation de la programmation de virement ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/settings/transfer-schedules`);
  const before = await waitForBodyText(page, (t) => t.length > 0);
  check("la programmation réelle apparaît dans la liste avant désactivation", before.includes("P124 Compte Test"));
  const desactiverButtons = page.getByRole("button", { name: /désactiver/i });
  await desactiverButtons.first().click();
  await page.waitForTimeout(1000);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// H12 — Autorisations : un GESTIONNAIRE est redirigé hors des pages Comptes
// bancaires / Programmations (requireAdmin(), redirection réelle "/"), mais
// accède normalement à la création de virement (ADMIN + GESTIONNAIRE).
// ---------------------------------------------------------------------------
console.log("\n=== H12 : autorisations — comportement réel d'un rôle GESTIONNAIRE ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p123-gestionnaire", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/settings/bank-accounts/new`);
  check("redirection réelle hors de la page Comptes bancaires (requireAdmin)", page.url() === `${BASE_URL}/`);
  await page.goto(`${BASE_URL}/settings/transfer-schedules/new`);
  check("redirection réelle hors de la page Programmations (requireAdmin)", page.url() === `${BASE_URL}/`);
  await page.goto(`${BASE_URL}/caisse/virements/new`);
  check("page de création de virement bien accessible à un GESTIONNAIRE (ADMIN + GESTIONNAIRE)", page.url() === `${BASE_URL}/caisse/virements/new`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// H13 — Isolation : l'établissement étranger ne voit ni ne génère rien.
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
  check("aucun virement réel de l'établissement étranger n'apparaît (génération paresseuse confinée à son propre établissement, 0 programmation à lui)", !body2.includes("P124 Compte Test"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// H14 — Établissement suspendu : création bloquée (jamais réactivé artificiellement).
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
console.log(
  "   Note méthodologique : seul le volet « création bloquée » a pu être testé en direct. Le volet complémentaire" +
    " (« réduction/annulation reste disponible malgré la suspension ») n'a aucun scénario live possible — cet" +
    " établissement n'a jamais eu de virement/compte créé avant sa suspension (créé directement SUSPENDED par le" +
    " seed D12-P118) — couvert uniquement par l'audit statique déjà réalisé (D12-P121/P122 :" +
    " deactivateBankAccount()/cancelBankTransfer() volontairement non gardées par requireActiveEstablishment()).",
);

await browser.close();
console.log(`\n=== Résultat global : ${failures === 0 ? "TOUS LES CONTRÔLES PASSENT" : `${failures} ÉCHEC(S)`} ===`);
process.exit(failures === 0 ? 0 : 1);
