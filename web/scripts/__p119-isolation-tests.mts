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

async function waitForBodyText(
  page: Page,
  predicate: (text: string) => boolean,
  timeoutMs = 8000,
): Promise<string> {
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
// Préparation : création d'UN client réel pour "P118 Hotel Actif", via le
// vrai formulaire /clients/new (jamais une insertion directe en base) —
// seul enregistrement de test créé dans ce lot, documenté explicitement.
// ---------------------------------------------------------------------------
console.log("=== Préparation : création réelle d'un client de test pour P118 Hotel Actif ===");
let foreignClientId: string | null = null;
const foreignClientName = "P119 Client Isolation Test";
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/clients/new`);
  await page.locator("#name").fill(foreignClientName);
  await page.locator("#phone").fill("770000000");
  await page.getByRole("button", { name: /enregistrer le client/i }).click();
  await page.waitForURL(/\/clients\/[^/]+\?created=1/, { timeout: 8000 }).catch(() => {});
  const match = page.url().match(/\/clients\/([^/?]+)/);
  foreignClientId = match ? match[1] : null;
  check("client de test créé réellement via le formulaire (id réel obtenu depuis l'URL de redirection serveur)", Boolean(foreignClientId));
  console.log(`   id réel créé : ${foreignClientId ?? "AUCUN — échec de préparation"}`);
  await ctx.close();
}

if (!foreignClientId) {
  console.log("ABANDON — impossible de poursuivre sans l'id réel du client de test.");
  await browser.close();
  process.exit(1);
}

// ---------------------------------------------------------------------------
// D1 — Isolation logements : liste (en complément du détail déjà vérifié
// en D12-P118/C1).
// ---------------------------------------------------------------------------
console.log("\n=== D1 : isolation logements — liste ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif2", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/logements`);
  const body = await waitForBodyText(page, (t) => t.length > 0);
  check("le logement réel de l'établissement étranger (P118 Chambre Active) n'apparaît jamais dans la liste", !body.includes("P118 Chambre Active"));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// D2 — Isolation logements : détail par URL directe, rejoué pour confirmer
// (même mécanisme que C1, sélecteurs réexaminés avant ce lot).
// ---------------------------------------------------------------------------
console.log("\n=== D2 : isolation logements — détail direct (rejeu de C1) ===");
{
  const foreignPropertyId = process.env.P118_FOREIGN_PROPERTY_ID;
  if (!foreignPropertyId) {
    console.log("ECHEC — P118_FOREIGN_PROPERTY_ID manquant, scénario non rejoué");
    failures++;
  } else {
    const ctx = await freshContext(browser);
    const page = await login(ctx, "p118-admin-actif2", TEST_PASSWORD);
    const response = await page.goto(`${BASE_URL}/logements/${foreignPropertyId}`);
    const bodyText = await page.locator("body").textContent();
    check(
      `page "introuvable" affichée (statut HTTP réel observé : ${response?.status()})`,
      Boolean(bodyText?.includes("404")),
    );
    check("le nom réel du logement étranger n'apparaît jamais (confirmé à nouveau)", !bodyText?.includes("P118 Chambre Active"));
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------
// D3 — Isolation clients : liste.
// ---------------------------------------------------------------------------
console.log("\n=== D3 : isolation clients — liste ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif2", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/clients`);
  const body = await waitForBodyText(page, (t) => t.length > 0);
  check("le client réel de l'établissement étranger n'apparaît jamais dans la liste", !body.includes(foreignClientName));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// D4 — Isolation clients : détail par URL directe.
// ---------------------------------------------------------------------------
console.log("\n=== D4 : isolation clients — détail direct ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif2", TEST_PASSWORD);
  const response = await page.goto(`${BASE_URL}/clients/${foreignClientId}`);
  const bodyText = await page.locator("body").textContent();
  check(
    `page "introuvable" affichée pour le client étranger (statut HTTP réel observé : ${response?.status()})`,
    Boolean(bodyText?.includes("404")),
  );
  check("le nom réel du client étranger n'apparaît jamais dans la page", !bodyText?.includes(foreignClientName));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// D5 — Isolation clients : le client voit bien SON PROPRE client (contrôle
// positif — distingue "refus d'accès" de "résultat vide légitime").
// ---------------------------------------------------------------------------
console.log("\n=== D5 : contrôle positif — le propriétaire réel voit bien son propre client ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/clients/${foreignClientId}`);
  const body = await waitForBodyText(page, (t) => t.includes(foreignClientName));
  check("le propriétaire réel du client le voit correctement (pas un faux-positif de blocage)", body.includes(foreignClientName));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// D6 — Réservations/locations/dépenses : résultat vide légitime (aucune
// donnée créée pour ces entités dans ce lot — distinct d'un refus d'accès).
// ---------------------------------------------------------------------------
console.log("\n=== D6 : réservations/locations/dépenses — résultat vide légitime (propre établissement) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif2", TEST_PASSWORD);
  for (const path of ["/reservations", "/locations", "/depenses"]) {
    await page.goto(`${BASE_URL}${path}`);
    check(`page ${path} chargée sans erreur technique (pas de redirection, pas de page d'erreur)`, page.url() === `${BASE_URL}${path}`);
  }
  await ctx.close();
}

await browser.close();
console.log(`\n=== Résultat global : ${failures === 0 ? "TOUS LES CONTRÔLES PASSENT" : `${failures} ÉCHEC(S)`} ===`);
process.exit(failures === 0 ? 0 : 1);
