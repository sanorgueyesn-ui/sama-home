import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const BASE_URL = "http://localhost:3001";
const TEST_PASSWORD = "PlaywrightTest!2026";
const RESERVATION_ID = "cmv9juhj0001srsuff4ctv05y"; // réservation P120, CONFIRMED, 5000 FCFA, 0 payé
const RENTAL_ID = "cmv9jur56001trsuf6yykyuoh"; // location P120, déjà intégralement payée (5000/5000)

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
// J1 — Consultation réelle : réservation encore non payée.
// ---------------------------------------------------------------------------
console.log("=== J1 : consultation — réservation réelle non payée ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/reservations/${RESERVATION_ID}`);
  const body = await waitForBodyText(page, (t) => t.length > 0);
  check("statut réel « Non payé » affiché avant tout encaissement", body.includes("Non payé"));
  check("bouton « Encaisser » réel présent (reste à payer > 0)", body.includes("Encaisser"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// J2 — Paiement partiel réel (2000 FCFA, WAVE), par un compte GESTIONNAIRE
// (vérifie au passage l'absence de restriction de rôle dans
// createReservationPayment, confirmée par lecture du code en D12-P122).
// ---------------------------------------------------------------------------
console.log("\n=== J2 : paiement partiel réel (2000 FCFA, WAVE, par un GESTIONNAIRE) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p123-gestionnaire", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/reservations/${RESERVATION_ID}/pay`);
  check("GESTIONNAIRE accède bien au formulaire d'encaissement (aucun contrôle de rôle)", page.url() === `${BASE_URL}/reservations/${RESERVATION_ID}/pay`);
  const bodyBefore = await waitForBodyText(page, (t) => t.includes("Reste à payer"));
  check("reste à payer réel affiché (5000 FCFA)", bodyBefore.includes("5 000 FCFA") || bodyBefore.includes("5000 FCFA"));

  await page.locator("#amount").fill("2000");
  await page.locator("#method").selectOption("WAVE");
  await page.getByRole("button", { name: /confirmer l'encaissement/i }).click();
  await page.waitForURL(/\/reservations\/[^/]+\?paid=1/, { timeout: 8000 }).catch(() => {});
  check("paiement partiel réellement enregistré (redirection paid=1)", page.url().includes("paid=1"));
  const body = await waitForBodyText(page, (t) => t.includes("Partiel"));
  check("statut réel « Partiel » affiché après ce premier encaissement", body.includes("Partiel"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// J3 — Vérification que ce paiement WAVE n'affecte jamais la caisse (seul
// CASH impacte computeTheoreticalBalance — jamais une supposition).
// ---------------------------------------------------------------------------
console.log("\n=== J3 : un paiement WAVE n'affecte jamais le solde théorique de la caisse ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/caisse`);
  const body = await waitForBodyText(page, (t) => t.includes("SOLDE THÉORIQUE ACTUEL"));
  check("le solde théorique réel reste inchangé après un paiement WAVE (12 700 FCFA)", body.includes("12 700 FCFA"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// J4 — Solde du paiement (3000 FCFA, CASH), par l'ADMIN : finalise le
// paiement et impacte réellement la caisse.
// ---------------------------------------------------------------------------
console.log("\n=== J4 : solde du paiement (3000 FCFA, CASH) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/reservations/${RESERVATION_ID}/pay`);
  const bodyBefore = await waitForBodyText(page, (t) => t.includes("Reste à payer"));
  check("reste à payer réel mis à jour (3000 FCFA)", bodyBefore.includes("3 000 FCFA") || bodyBefore.includes("3000 FCFA"));
  await page.locator("#amount").fill("3000");
  // Mode de paiement déjà par défaut sur CASH.
  await page.getByRole("button", { name: /confirmer l'encaissement/i }).click();
  await page.waitForURL(/\/reservations\/[^/]+\?paid=1/, { timeout: 8000 }).catch(() => {});
  const body = await waitForBodyText(page, (t) => t.includes("Payé"));
  check("statut réel « Payé » affiché (intégralement réglé)", body.includes("Payé"));

  await page.goto(`${BASE_URL}/caisse`);
  const bodyCash = await waitForBodyText(page, (t) => t.includes("15 700 FCFA"));
  check("le solde théorique réel a bien augmenté de 3000 FCFA (12700 -> 15700, seul le paiement CASH)", bodyCash.includes("15 700 FCFA"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// J5 — Paiement déjà enregistré : tentative d'un nouvel encaissement sur une
// réservation désormais intégralement payée.
// ---------------------------------------------------------------------------
console.log("\n=== J5 : réservation déjà intégralement payée — redirection réelle ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/reservations/${RESERVATION_ID}/pay`);
  await page.waitForURL(`${BASE_URL}/reservations/${RESERVATION_ID}`, { timeout: 8000 }).catch(() => {});
  check("redirection réelle hors du formulaire d'encaissement (remaining <= 0)", page.url() === `${BASE_URL}/reservations/${RESERVATION_ID}`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// J6 — Location déjà intégralement payée (5000/5000, D12-P123) — même
// comportement attendu.
// ---------------------------------------------------------------------------
console.log("\n=== J6 : location déjà intégralement payée (donnée réelle de D12-P123) — redirection réelle ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/locations/${RENTAL_ID}/pay`);
  await page.waitForURL(`${BASE_URL}/locations/${RENTAL_ID}`, { timeout: 8000 }).catch(() => {});
  check("redirection réelle hors du formulaire d'encaissement (déjà intégralement payée)", page.url() === `${BASE_URL}/locations/${RENTAL_ID}`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// J7 — Isolation réelle : un établissement étranger ne peut pas atteindre le
// formulaire d'encaissement d'une réservation qui ne lui appartient pas.
// ---------------------------------------------------------------------------
console.log("\n=== J7 : isolation — formulaire d'encaissement d'une réservation étrangère ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif2", TEST_PASSWORD);
  const response = await page.goto(`${BASE_URL}/reservations/${RESERVATION_ID}/pay`);
  const bodyText = await page.locator("body").textContent();
  check(`page "introuvable" affichée (statut HTTP réel : ${response?.status()})`, Boolean(bodyText?.includes("404")));
  await ctx.close();
}

await browser.close();
console.log(`\n=== Résultat global : ${failures === 0 ? "TOUS LES CONTRÔLES PASSENT" : `${failures} ÉCHEC(S)`} ===`);
process.exit(failures === 0 ? 0 : 1);
