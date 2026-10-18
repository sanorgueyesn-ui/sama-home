import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const BASE_URL = "http://localhost:3001";
const TEST_PASSWORD = "PlaywrightTest!2026";
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
// I14/I16 — Autorisations réelles : GESTIONNAIRE peut créer une dépense
// (aucun contrôle de rôle dans createExpense), mais est redirigé hors de la
// gestion des catégories (requireAdmin).
// ---------------------------------------------------------------------------
console.log("=== I14/I16 : autorisations réelles — rôle GESTIONNAIRE ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p123-gestionnaire", TEST_PASSWORD);

  await page.goto(`${BASE_URL}/settings/expense-categories`);
  await page.waitForURL(`${BASE_URL}/`, { timeout: 8000 }).catch(() => {});
  check("GESTIONNAIRE redirigé réellement hors de la gestion des catégories (requireAdmin)", page.url() === `${BASE_URL}/`);

  await page.goto(`${BASE_URL}/settings/expense-categories/new`);
  await page.waitForURL(`${BASE_URL}/`, { timeout: 8000 }).catch(() => {});
  check("GESTIONNAIRE redirigé réellement hors de la création de catégorie (requireAdmin)", page.url() === `${BASE_URL}/`);

  await page.goto(`${BASE_URL}/depenses/new`);
  check("GESTIONNAIRE accède bien à la création de dépense (aucun contrôle de rôle dans createExpense)", page.url() === `${BASE_URL}/depenses/new`);

  // Catégorie réelle réactivée temporairement par l'ADMIN n'est pas
  // nécessaire ici : on vérifie seulement l'accès à la page, pas une
  // soumission complète (déjà couverte par I8 avec l'ADMIN).
  await ctx.close();
}

// ---------------------------------------------------------------------------
// I15 — Isolation réelle inter-établissements.
// ---------------------------------------------------------------------------
console.log("\n=== I15 : isolation — établissement étranger (« P118 Hotel Actif 2 ») ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif2", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/depenses`);
  const body1 = await waitForBodyText(page, (t) => t.length > 0);
  check("aucune dépense réelle de l'établissement étranger n'apparaît", !body1.includes(CATEGORY_NAME_RENAMED) && !body1.includes("P126-TEST"));
  await page.goto(`${BASE_URL}/settings/expense-categories`);
  const body2 = await waitForBodyText(page, (t) => t.length > 0);
  check("aucune catégorie réelle de l'établissement étranger n'apparaît", !body2.includes(CATEGORY_NAME_RENAMED));
  await ctx.close();
}

// ---------------------------------------------------------------------------
// I17 — Établissement suspendu : création de dépense/catégorie bloquée.
// ---------------------------------------------------------------------------
console.log("\n=== I17 : établissement suspendu — créations bloquées ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-suspendu", TEST_PASSWORD);
  check("connexion acceptée malgré la suspension", page.url() === `${BASE_URL}/`);

  await page.goto(`${BASE_URL}/depenses/new`);
  const bodyNoCat = await waitForBodyText(page, (t) => t.length > 0);
  // Aucune catégorie active n'existe pour cet établissement (jamais créée) —
  // le formulaire n'a donc aucune catégorie réelle à proposer. Le blocage
  // réel de requireActiveEstablishment() est vérifié directement via
  // createExpenseCategory ci-dessous, dont le formulaire ne dépend d'aucune
  // donnée préexistante.
  console.log(`   (note : /depenses/new sans catégorie existante pour cet établissement — menu vide réel, body length=${bodyNoCat.length})`);

  await page.goto(`${BASE_URL}/settings/expense-categories/new`);
  await page.locator("#name").fill("Ne devrait jamais être créée");
  await page.getByRole("button", { name: /^créer$/i }).click();
  const body = await waitForBodyText(page, (t) => t.includes("inactif"));
  check("message réel de blocage affiché pour la création de catégorie (établissement inactif)", body.includes("inactif"));
  await ctx.close();
}

await browser.close();
console.log(`\n=== Résultat global (partie 2) : ${failures === 0 ? "TOUS LES CONTRÔLES PASSENT" : `${failures} ÉCHEC(S)`} ===`);
process.exit(failures === 0 ? 0 : 1);
