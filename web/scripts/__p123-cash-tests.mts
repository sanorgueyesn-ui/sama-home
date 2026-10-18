import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const BASE_URL = "http://localhost:3001";
const TEST_PASSWORD = "PlaywrightTest!2026";
const RENTAL_ID = "cmv9jur56001trsuf6yykyuoh"; // location P120, "P118 Hotel Actif", 5000 FCFA, 0 payé

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
  await page.goto(`${BASE_URL}/login`);
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /se connecter/i }).click();
  await page.waitForURL(`${BASE_URL}/`, { timeout: 8000 }).catch(() => {});
  return page;
}

const browser = await chromium.launch();

// ---------------------------------------------------------------------------
// G1 — Consultation : aucune session encore ouverte pour cet établissement.
// ---------------------------------------------------------------------------
console.log("=== G1 : consultation — aucune session de caisse encore enregistrée ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/caisse`);
  const body = await waitForBodyText(page, (t) => t.includes("Caisse"));
  check("page /caisse affiche l'état réel : aucune session enregistrée", body.includes("Aucune session de caisse n'a encore été enregistrée"));
  check("le formulaire d'ouverture manuelle exceptionnelle est bien proposé (première ouverture)", body.includes("Ouverture exceptionnelle"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// G2 — Ouverture manuelle (première ouverture, ADMIN requis).
// ---------------------------------------------------------------------------
console.log("\n=== G2 : ouverture manuelle de la caisse (10000 FCFA) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/caisse`);
  await page.locator("#manualAmount").fill("10000");
  await page.locator("#manualReason").fill("Première mise en service de la caisse — test D12-P123");
  await page.getByRole("button", { name: /ouvrir manuellement/i }).click();
  const body = await waitForBodyText(page, (t) => t.includes("SOLDE THÉORIQUE ACTUEL"));
  check("session ouverte réellement (solde théorique affiché)", body.includes("SOLDE THÉORIQUE ACTUEL"));
  check("montant d'ouverture réel affiché (10 000 FCFA, manuelle)", body.includes("10 000 FCFA") && body.includes("manuelle"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// G3 — Opération financière réelle : encaissement CASH sur la location P120.
// ---------------------------------------------------------------------------
console.log("\n=== G3 : opération financière — encaissement CASH de 5000 FCFA ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/locations/${RENTAL_ID}/pay`);
  const bodyBefore = await waitForBodyText(page, (t) => t.includes("Reste à payer"));
  check("reste à payer réel affiché (5000 FCFA)", bodyBefore.includes("5 000 FCFA") || bodyBefore.includes("5000 FCFA"));
  await page.getByRole("button", { name: /confirmer l'encaissement/i }).click();
  await page.waitForURL(/\/locations\/[^/]+\?paid=1/, { timeout: 8000 }).catch(() => {});
  check("encaissement réellement appliqué (redirection paid=1)", page.url().includes("paid=1"));

  await page.goto(`${BASE_URL}/caisse`);
  const bodyAfter = await waitForBodyText(page, (t) => t.includes("SOLDE THÉORIQUE ACTUEL"));
  check("le solde théorique reflète bien le nouvel encaissement (15 000 FCFA = 10000 ouverture + 5000 encaissé)", bodyAfter.includes("15 000 FCFA"));
  check("l'entrée CASH apparaît dans la décomposition du solde", bodyAfter.includes("Entrées CASH"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// Préparation G6 — un compte GESTIONNAIRE réel est nécessaire pour tester le
// comportement d'un rôle insuffisant, aucun compte de ce type n'existant déjà
// parmi les comptes de test D12-P118 (tous ADMIN). Créé via le vrai
// formulaire /settings/users/new (ADMIN requis, comme un vrai administrateur
// le ferait) — seule nouvelle donnée créée dans ce lot.
// ---------------------------------------------------------------------------
console.log("\n=== Préparation G6 : création réelle d'un compte GESTIONNAIRE de test ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/settings/users/new`);
  await page.locator("#name").fill("P123 Gestionnaire Test");
  await page.locator("#username").fill("p123-gestionnaire");
  await page.locator("#password").fill(TEST_PASSWORD);
  // Rôle déjà par défaut sur GESTIONNAIRE dans le formulaire réel.
  await page.getByRole("button", { name: /créer l'utilisateur/i }).click();
  await page.waitForURL(/\/settings\/users\?created=1/, { timeout: 8000 }).catch(() => {});
  check("compte GESTIONNAIRE créé réellement via le vrai formulaire", page.url().includes("created=1"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// G6 — Autorisation : un GESTIONNAIRE n'a jamais accès aux actions réservées
// à ADMIN (correction de caisse, modification de clôture) ; peut en revanche
// fermer la caisse (jamais réservé à ADMIN dans le code réel).
// ---------------------------------------------------------------------------
console.log("\n=== G6 : autorisation — comportement d'un rôle GESTIONNAIRE (insuffisant) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p123-gestionnaire", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/caisse`);
  const body = await waitForBodyText(page, (t) => t.includes("SOLDE THÉORIQUE ACTUEL"));
  check("le GESTIONNAIRE voit bien la caisse ouverte (lecture autorisée)", body.includes("SOLDE THÉORIQUE ACTUEL"));
  check("le bouton « + Correction de caisse » (réservé ADMIN) n'est jamais rendu pour ce rôle", !body.includes("Correction de caisse"));
  check("le bouton « Fermer la caisse » reste disponible (jamais réservé à ADMIN dans le code)", body.includes("Fermer la caisse"));
  await ctx.close();
}
console.log(
  "   Note méthodologique : l'absence du bouton « Correction de caisse » est un constat d'INTERFACE, jamais présenté" +
    " comme une preuve de protection serveur à elle seule. La protection serveur réelle (`if (user.role !== \"ADMIN\")`" +
    " dans createCashCorrection()/modifyClosedCashSession(), cash.ts) a été vérifiée directement dans le code source" +
    " lors de l'audit statique (D12-P121/P122) — aucun chemin d'interface réel n'existe pour soumettre malgré tout" +
    " cette action avec ce rôle, donc aucun appel direct de Server Action n'a été tenté (interdit par ce lot).",
);

// ---------------------------------------------------------------------------
// G4 — Correction de caisse (ADMIN), montant minimal négatif.
// ---------------------------------------------------------------------------
console.log("\n=== G4 : correction de caisse (-500 FCFA) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/caisse`);
  await page.getByRole("button", { name: /\+ correction de caisse/i }).click();
  await page.locator("#correctionAmount").fill("-500");
  await page.locator("#correctionReason").fill("Test D12-P123 — écart mineur simulé, valeur minimale");
  await page.getByRole("button", { name: /^enregistrer$/i }).click();
  const body = await waitForBodyText(page, (t) => t.includes("14 500 FCFA"));
  check("le solde théorique reflète bien la correction (14 500 FCFA = 15000 - 500)", body.includes("14 500 FCFA"));
  check("la correction apparaît dans la décomposition du solde (signée négativement)", body.includes("Corrections"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// G5 — Clôture, par le GESTIONNAIRE (jamais réservée à ADMIN), comptage
// physique correspondant exactement au solde théorique (aucun écart).
// ---------------------------------------------------------------------------
console.log("\n=== G5 : clôture de la caisse (sans écart, par le GESTIONNAIRE) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p123-gestionnaire", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/caisse`);
  await page.getByRole("button", { name: /fermer la caisse/i }).click();
  await page.locator("#physicalCount").fill("14500");
  const bodyVariance = await waitForBodyText(page, (t) => t.includes("Aucun écart"));
  check("aucun écart détecté côté client (comptage = solde théorique)", bodyVariance.includes("Aucun écart"));
  await page.getByRole("button", { name: /confirmer la fermeture/i }).click();
  const body = await waitForBodyText(page, (t) => t.includes("DERNIÈRE SESSION"));
  check("la session est réellement clôturée (page revient à l'état « aucune session ouverte »)", body.includes("DERNIÈRE SESSION"));
  check("le solde théorique de clôture réel est bien affiché (14 500 FCFA)", body.includes("14 500 FCFA"));
  check("aucun écart réel affiché sur la session clôturée", body.includes("Aucun écart"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// G7 — Établissement suspendu : l'OUVERTURE (création) d'une toute nouvelle
// session doit être bloquée — jamais testé en réactivant artificiellement
// l'établissement. Le complément (clôture non bloquée pour un établissement
// suspendu) n'a aucun scénario live possible ici : "P118 Hotel Suspendu" n'a
// jamais eu de session ouverte avant sa suspension (créé directement en
// SUSPENDED par le seed D12-P118) — confirmé uniquement par l'audit statique
// (D12-P121/P122 : closeCashSession() volontairement non gardée par
// requireActiveEstablishment(), vérifié directement dans le code).
// ---------------------------------------------------------------------------
console.log("\n=== G7 : établissement suspendu — ouverture bloquée (création jamais réduite) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-suspendu", TEST_PASSWORD);
  check("connexion acceptée malgré la suspension (jamais la connexion elle-même bloquée)", page.url() === `${BASE_URL}/`);
  await page.goto(`${BASE_URL}/caisse`);
  await page.locator("#manualAmount").fill("1000");
  await page.locator("#manualReason").fill("Tentative bloquée — test D12-P123");
  await page.getByRole("button", { name: /ouvrir manuellement/i }).click();
  const body = await waitForBodyText(page, (t) => t.includes("inactif"));
  check("message réel de blocage affiché (établissement inactif)", body.includes("inactif"));
  await ctx.close();
}

await browser.close();
console.log(`\n=== Résultat global : ${failures === 0 ? "TOUS LES CONTRÔLES PASSENT" : `${failures} ÉCHEC(S)`} ===`);
process.exit(failures === 0 ? 0 : 1);
