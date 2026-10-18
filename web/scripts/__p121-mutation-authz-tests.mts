import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const BASE_URL = "http://localhost:3001";
const TEST_PASSWORD = "PlaywrightTest!2026";

// Enregistrements réels déjà créés dans des lots précédents (D12-P119/P120),
// réutilisés tels quels — aucune donnée supplémentaire créée dans ce lot.
const FOREIGN_PROPERTY_ID = "cmv9e0eya0003zkuf3rb3juaw"; // "P118 Chambre Active"
const FOREIGN_CLIENT_ID = "cmv9ju9u5001rrsuf7ih6t71i"; // "P120 Client Test"
const FOREIGN_CLIENT_NAME = "P120 Client Test";
const FOREIGN_RESERVATION_ID = "cmv9juhj0001srsuff4ctv05y";

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
// F1-F3 — tentative de modification par l'établissement B ("P118 Hotel Actif
// 2") d'enregistrements réels appartenant à l'établissement A ("P118 Hotel
// Actif"), via les vraies pages d'édition de l'application (jamais un appel
// direct de Server Action).
// ---------------------------------------------------------------------------
console.log("=== F1 : édition client étranger — /clients/{id}/edit ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif2", TEST_PASSWORD);
  const response = await page.goto(`${BASE_URL}/clients/${FOREIGN_CLIENT_ID}/edit`);
  const bodyText = await page.locator("body").textContent();
  check(`page d'édition inaccessible (contenu "404", statut HTTP réel : ${response?.status()})`, Boolean(bodyText?.includes("404")));
  check("aucun champ pré-rempli avec le nom réel du client étranger", !bodyText?.includes(FOREIGN_CLIENT_NAME));
  await ctx.close();
}

console.log("\n=== F2 : édition logement étranger — /logements/{id}/edit ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif2", TEST_PASSWORD);
  const response = await page.goto(`${BASE_URL}/logements/${FOREIGN_PROPERTY_ID}/edit`);
  const bodyText = await page.locator("body").textContent();
  check(`page d'édition inaccessible (contenu "404", statut HTTP réel : ${response?.status()})`, Boolean(bodyText?.includes("404")));
  check("aucune donnée réelle du logement étranger n'apparaît", !bodyText?.includes("P118 Chambre Active"));
  await ctx.close();
}

console.log("\n=== F3 : édition réservation étrangère — /reservations/{id}/edit ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif2", TEST_PASSWORD);
  const response = await page.goto(`${BASE_URL}/reservations/${FOREIGN_RESERVATION_ID}/edit`);
  const bodyText = await page.locator("body").textContent();
  check(`page d'édition inaccessible (contenu "404", statut HTTP réel : ${response?.status()})`, Boolean(bodyText?.includes("404")));
  check("aucune donnée réelle de la réservation étrangère n'apparaît", !bodyText?.includes(FOREIGN_CLIENT_NAME));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// F4 — contrôle positif : le propriétaire légitime peut réellement éditer et
// la modification est réellement appliquée (preuve que le chemin autorisé
// fonctionne, pas seulement que tout le monde est bloqué).
// ---------------------------------------------------------------------------
console.log("\n=== F4 : contrôle positif — le propriétaire réel édite avec succès ===");
const newPhoneValue = "770000099";
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  const response = await page.goto(`${BASE_URL}/clients/${FOREIGN_CLIENT_ID}/edit`);
  check(`le propriétaire réel atteint la page d'édition (statut HTTP réel : ${response?.status()})`, response?.status() === 200);
  const bodyBefore = await waitForBodyText(page, (t) => t.includes(FOREIGN_CLIENT_NAME));
  check("le formulaire est bien pré-rempli avec les données réelles", bodyBefore.includes(FOREIGN_CLIENT_NAME));

  await page.locator("#phone").fill(newPhoneValue);
  await page.getByRole("button", { name: /enregistrer/i }).click();
  await page.waitForURL(/\/clients\/[^/]+\?updated=1/, { timeout: 8000 }).catch(() => {});
  check("la modification réelle a été appliquée (redirection updated=1)", page.url().includes("updated=1"));
  const bodyAfter = await waitForBodyText(page, (t) => t.includes(newPhoneValue));
  check("le nouveau téléphone réellement enregistré est bien affiché", bodyAfter.includes(newPhoneValue));
  await ctx.close();
}

await browser.close();
console.log(`\n=== Résultat global : ${failures === 0 ? "TOUS LES CONTRÔLES PASSENT" : `${failures} ÉCHEC(S)`} ===`);
process.exit(failures === 0 ? 0 : 1);
