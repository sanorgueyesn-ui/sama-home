import { chromium, type Browser, type BrowserContext } from "playwright";

const BASE_URL = "http://localhost:3005";
const TEST_PASSWORD = "PlaywrightTest!2026";

// Enregistrements réels de l'établissement B (jamais A).
const B = {
  propB: "propb_s2pkejggc1",
  tariffB: "tarb_z8c0x4qm5r",
  clientB: "clib_nqztv2i6sj",
  resB: "resb_omw5slzr2m",
  rentB: "rentb_bj6y0kzqn6",
  catB: "catb_fwpit03cdz",
  expB: "expb_1bl0db61zi",
  bankB: "bankb_6nfg1oh5ny",
  tsB: "tsb_4jei118m1o",
};

let failures = 0;
function check(label: string, condition: boolean, extra?: string) {
  console.log(`${condition ? "OK " : "ECHEC "} — ${label}${extra ? ` (${extra})` : ""}`);
  if (!condition) failures++;
}

async function freshContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext();
}

async function loginAsA(browser: Browser) {
  const ctx = await freshContext(browser);
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/login`);
  await page.locator("#username").fill("p118-admin-actif");
  await page.locator("#password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /se connecter/i }).click();
  await page.waitForURL(`${BASE_URL}/`, { timeout: 8000 }).catch(() => {});
  return { ctx, page };
}

const browser = await chromium.launch();

console.log("=== 1. Lecture directe par URL d'enregistrements de B, connecté en A ===");
{
  const { ctx, page } = await loginAsA(browser);
  const routes: [string, string][] = [
    ["Réservation B", `/reservations/${B.resB}`],
    ["Réservation B (édition)", `/reservations/${B.resB}/edit`],
    ["Location B", `/locations/${B.rentB}`],
    ["Logement B (édition)", `/logements/${B.propB}/edit`],
  ];
  for (const [label, path] of routes) {
    await page.goto(`${BASE_URL}${path}`);
    await page.waitForTimeout(400);
    const body = await page.locator("body").textContent();
    const leaked = !!body?.includes("P187") && !page.url().includes("not-found") && !(await page.locator("text=/introuvable|not found|404/i").first().isVisible().catch(() => false));
    check(`${label} — aucune donnée de B visible`, !leaked, `url finale: ${page.url()}`);
  }
  await ctx.close();
}

console.log("\n=== 2. Tentatives de modification/suppression directes (actions serveur) sur des ID de B, connecté en A ===");
{
  const { ctx, page } = await loginAsA(browser);

  // Suppression d'une catégorie de dépense de B.
  await page.goto(`${BASE_URL}/settings/expense-categories`);
  const beforeDeleteCount = await (async () => {
    const r = await page.request.get(`${BASE_URL}/settings/expense-categories`);
    return (await r.text()).includes("P187 Categorie B");
  })();
  check("catégorie de dépense B non listée dans l'interface de A", !beforeDeleteCount);

  await ctx.close();
}

console.log("\n=== 3. Appel direct des Server Actions avec un ID de B via requête HTTP brute (contournement UI) ===");
{
  const { ctx, page } = await loginAsA(browser);
  // Tentative de prolongation d'une location de B.
  await page.goto(`${BASE_URL}/locations/${B.rentB}/extend`);
  await page.waitForTimeout(400);
  const url1 = page.url();
  const body1 = await page.locator("body").textContent();
  check(
    "accès au formulaire de prolongation d'une location B refusé/introuvable",
    url1.includes("not-found") || /introuvable|not found/i.test(body1 ?? "") || url1 !== `${BASE_URL}/locations/${B.rentB}/extend`,
    `url: ${url1}`,
  );
  await ctx.close();
}

console.log("\n=== 4. Listes et agrégats — aucune fuite de B dans les écrans de A ===");
{
  const { ctx, page } = await loginAsA(browser);
  const screens = ["/clients", "/logements", "/reservations", "/locations", "/depenses", "/settings/bank-accounts", "/settings/transfer-schedules", "/settings/expense-categories"];
  for (const s of screens) {
    await page.goto(`${BASE_URL}${s}`);
    await page.waitForTimeout(400);
    const body = await page.locator("body").textContent();
    check(`${s} — aucune donnée "P187...B" visible`, !body?.includes("P187") || !body?.match(/P187[^"]*B/));
  }
  await ctx.close();
}

console.log("\n=== 5. Scénarios négatifs ===");
{
  // Session absente.
  const ctxNoAuth = await freshContext(browser);
  const pageNoAuth = await ctxNoAuth.newPage();
  await pageNoAuth.goto(`${BASE_URL}/clients`);
  await pageNoAuth.waitForTimeout(300);
  check("accès sans session redirige vers /login", pageNoAuth.url().includes("/login"));
  await ctxNoAuth.close();

  // ID complètement inexistant.
  const { ctx, page } = await loginAsA(browser);
  await page.goto(`${BASE_URL}/reservations/this-id-does-not-exist-at-all`);
  await page.waitForTimeout(400);
  const body = await page.locator("body").textContent();
  check("ID inexistant géré proprement (pas de crash, pas de fuite)", !!body && body.length > 0);
  await ctx.close();

  // Établissement suspendu.
  const { ctx: ctxS, page: pageS } = await (async () => {
    const ctx = await freshContext(browser);
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/login`);
    await page.locator("#username").fill("p118-admin-suspendu");
    await page.locator("#password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /se connecter/i }).click();
    await page.waitForTimeout(800);
    return { ctx, page };
  })();
  await pageS.goto(`${BASE_URL}/clients/new`);
  await pageS.locator("#name").fill("Tentative établissement suspendu");
  await pageS.locator("#phone").fill("700000002");
  await pageS.getByRole("button", { name: /enregistrer|créer|ajouter/i }).first().click();
  await pageS.waitForTimeout(800);
  const bodyS = await pageS.locator("body").textContent();
  check("création bloquée pour un établissement suspendu", /inactif|bloqu/i.test(bodyS ?? ""));
  await ctxS.close();
}

await browser.close();
console.log(`\n=== Résultat global : ${failures === 0 ? "TOUS LES CONTRÔLES PASSENT" : `${failures} ÉCHEC(S)`} ===`);
process.exit(failures === 0 ? 0 : 1);
