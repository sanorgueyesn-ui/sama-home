import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const BASE_URL = "http://localhost:3001";
const TEST_PASSWORD = "PlaywrightTest!2026";
const FOREIGN_PROPERTY_ID = "cmv9e0eya0003zkuf3rb3juaw"; // "P118 Chambre Active", établissement "P118 Hotel Actif"

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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
function nowTimeIso(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const browser = await chromium.launch();

// ---------------------------------------------------------------------------
// Préparation — enregistrements minimaux créés via les VRAIS formulaires de
// l'application, pour le compte de "P118 Hotel Actif" (jamais une insertion
// directe en base). Un tarif est un prérequis réel du processus métier pour
// créer une réservation ou une location — ce n'est pas un détournement.
// ---------------------------------------------------------------------------
console.log("=== Préparation : tarif, client, réservation, location réels pour P118 Hotel Actif ===");
let tariffId: string | null = null;
let clientId: string | null = null;
let reservationId: string | null = null;
let rentalId: string | null = null;
const clientName = "P120 Client Test";
const tariffLabel = "P120 Tarif Test";

{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);

  // 1. Tarif (prérequis pour qu'une réservation/location soit possible —
  //    listActivePropertiesWithActiveTariffs() exige un tarif actif).
  await page.goto(`${BASE_URL}/logements/${FOREIGN_PROPERTY_ID}/tariffs/new`);
  await page.locator("#label").fill(tariffLabel);
  await page.locator("#amount").fill("5000");
  await page.getByRole("button", { name: /enregistrer/i }).click();
  await page.waitForURL(/tariffCreated=1/, { timeout: 8000 }).catch(() => {});
  check("tarif de test créé réellement via le formulaire", page.url().includes("tariffCreated=1"));
  const tariffHref = await page.locator('a[href*="/tariffs/"][href*="/edit"]').first().getAttribute("href");
  const tariffMatch = tariffHref?.match(/\/tariffs\/([^/]+)\/edit/);
  tariffId = tariffMatch ? tariffMatch[1] : null;
  console.log(`   id réel du tarif : ${tariffId ?? "AUCUN — échec"}`);

  // 2. Client.
  await page.goto(`${BASE_URL}/clients/new`);
  await page.locator("#name").fill(clientName);
  await page.locator("#phone").fill("770000001");
  await page.getByRole("button", { name: /enregistrer le client/i }).click();
  await page.waitForURL(/\/clients\/[^/]+\?created=1/, { timeout: 8000 }).catch(() => {});
  const clientMatch = page.url().match(/\/clients\/([^/?]+)/);
  clientId = clientMatch ? clientMatch[1] : null;
  console.log(`   id réel du client : ${clientId ?? "AUCUN — échec"}`);

  if (tariffId && clientId) {
    // 3. Réservation (demain 15:00 — assistant à 3 étapes, rempli dans l'ordre réel).
    await page.goto(`${BASE_URL}/reservations/new`);
    await page.locator("#propertyId").selectOption(FOREIGN_PROPERTY_ID);
    await page.locator("#date").fill(tomorrowIso());
    await page.locator("#arrivalTime").fill("15:00");
    await page.locator("#tariffId").selectOption(tariffId);
    await waitForBodyText(page, (t) => t.includes("Disponible"), 5000);
    await page.getByRole("button", { name: /^suivant$/i }).click();
    await page.locator("#clientId").selectOption(clientId);
    await page.getByRole("button", { name: /suivant|continuer sans client/i }).click();
    await page.getByRole("button", { name: /confirmer la réservation/i }).click();
    await page.waitForURL(/\/reservations\/[^/]+\?created=1/, { timeout: 8000 }).catch(() => {});
    const reservationMatch = page.url().match(/\/reservations\/([^/?]+)/);
    reservationId = reservationMatch ? reservationMatch[1] : null;
    console.log(`   id réel de la réservation : ${reservationId ?? "AUCUN — échec"}`);

    // 4. Location directe (maintenant, formulaire simple).
    await page.goto(`${BASE_URL}/locations/new`);
    await page.locator("#clientId").selectOption(clientId);
    await page.locator("#propertyId").selectOption(FOREIGN_PROPERTY_ID);
    await page.locator("#date").fill(todayIso());
    await page.locator("#arrivalTime").fill(nowTimeIso());
    await page.locator("#tariffId").selectOption(tariffId);
    await waitForBodyText(page, (t) => t.includes("Disponible"), 5000);
    await page.getByRole("button", { name: /confirmer la location/i }).click();
    await page.waitForURL(/\/locations\/[^/]+\?created=1/, { timeout: 8000 }).catch(() => {});
    const rentalMatch = page.url().match(/\/locations\/([^/?]+)/);
    rentalId = rentalMatch ? rentalMatch[1] : null;
    console.log(`   id réel de la location : ${rentalId ?? "AUCUN — échec"}`);
  }

  await ctx.close();
}

if (!reservationId || !rentalId) {
  console.log("ABANDON — préparation incomplète, impossible de poursuivre les tests d'isolation.");
  await browser.close();
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Tests d'isolation — depuis "P118 Hotel Actif 2" (établissement étranger).
// ---------------------------------------------------------------------------
console.log("\n=== E1 : réservations — liste, depuis un établissement étranger ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif2", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/reservations?time=all`);
  const body = await waitForBodyText(page, (t) => t.length > 0);
  check("le client réel de la réservation étrangère n'apparaît jamais dans la liste", !body.includes(clientName));
  check("le logement réel de l'établissement étranger n'apparaît jamais dans la liste", !body.includes("P118 Chambre Active"));
  await ctx.close();
}

console.log("\n=== E2 : réservations — détail direct par URL ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif2", TEST_PASSWORD);
  const response = await page.goto(`${BASE_URL}/reservations/${reservationId}`);
  const bodyText = await page.locator("body").textContent();
  check(`page "introuvable" affichée (statut HTTP réel observé : ${response?.status()})`, Boolean(bodyText?.includes("404")));
  check("aucune donnée réelle de la réservation étrangère n'apparaît", !bodyText?.includes(clientName) && !bodyText?.includes("P118 Chambre Active"));
  await ctx.close();
}

console.log("\n=== E3 : locations — liste, depuis un établissement étranger ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif2", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/locations`);
  const body = await waitForBodyText(page, (t) => t.length > 0);
  check("le client réel de la location étrangère n'apparaît jamais dans la liste", !body.includes(clientName));
  check("le logement réel de l'établissement étranger n'apparaît jamais dans la liste", !body.includes("P118 Chambre Active"));
  await ctx.close();
}

console.log("\n=== E4 : locations — détail direct par URL ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif2", TEST_PASSWORD);
  const response = await page.goto(`${BASE_URL}/locations/${rentalId}`);
  const bodyText = await page.locator("body").textContent();
  check(`page "introuvable" affichée (statut HTTP réel observé : ${response?.status()})`, Boolean(bodyText?.includes("404")));
  check("aucune donnée réelle de la location étrangère n'apparaît", !bodyText?.includes(clientName) && !bodyText?.includes("P118 Chambre Active"));
  await ctx.close();
}

console.log("\n=== E5 : contrôle positif — le propriétaire réel voit ses propres données ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/reservations/${reservationId}`);
  const body1 = await waitForBodyText(page, (t) => t.includes(clientName));
  check("le propriétaire réel voit correctement sa réservation", body1.includes(clientName));

  await page.goto(`${BASE_URL}/locations/${rentalId}`);
  const body2 = await waitForBodyText(page, (t) => t.includes(clientName));
  check("le propriétaire réel voit correctement sa location", body2.includes(clientName));
  await ctx.close();
}

console.log("\n=== E6 : modification par un utilisateur étranger — aucun chemin d'interface atteignable ===");
console.log(
  "   Non testé via un appel direct de Server Action (protocole non fiable/non supporté, conclusion établie en D12-P75)." +
    " La page de détail elle-même étant inaccessible (E2/E4 : contenu 404 réel), aucun chemin d'interface réel ne permet" +
    " à cet utilisateur d'atteindre un formulaire de modification — cohérent avec l'audit statique de D12-P119 montrant" +
    " que updateReservation()/checkInReservation() appliquent le même filtre establishmentId que les lectures.",
);

await browser.close();
console.log(`\n=== Résultat global : ${failures === 0 ? "TOUS LES CONTRÔLES PASSENT" : `${failures} ÉCHEC(S)`} ===`);
process.exit(failures === 0 ? 0 : 1);
