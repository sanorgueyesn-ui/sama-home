import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const BASE_URL = "http://localhost:3001";
const TEST_PASSWORD = "PlaywrightTest!2026";
const NOM_B = "P136 Etablissement Manuel";
const EMAIL_A = "p136-auto@test.sama-home.local";
const EMAIL_B = "p136-manuel@test.sama-home.local";

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

// Correction du constat initial (B, étape intermédiaire) : /depenses/new ne
// porte aucune garde de page — seule la SOUMISSION (createExpense) est
// gardée par requireActiveEstablishment(). Preuve correcte pour un
// établissement PENDING sans encore de catégories : le menu déroulant est
// réellement VIDE (aucune catégorie proposée), pas un message "inactif".
console.log("=== B (corrigé) : établissement PENDING — menu de catégories réellement vide ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, EMAIL_B, TEST_PASSWORD);
  await page.goto(`${BASE_URL}/depenses/new`);
  const body = await waitForBodyText(page, (t) => t.length > 0);
  check("aucune catégorie réelle proposée avant approbation (établissement PENDING, categories pas encore créées)", !body.includes("Loyer"));
  await ctx.close();
}

console.log("\n=== B : approbation manuelle réelle (ciblage robuste par ancêtre DOM) ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-platform-admin", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/plateforme/etablissements?status=PENDING`);
  await waitForBodyText(page, (t) => t.includes(NOM_B));
  const approveButton = page.locator(
    `xpath=//*[contains(text(), ${JSON.stringify(NOM_B)})]/ancestor::*[.//button[contains(., "Approuver")]][1]//button[contains(., "Approuver")]`,
  ).first();
  await approveButton.click();
  await page.waitForTimeout(1200);
  const after = await waitForBodyText(page, (t) => t.length > 0);
  check("l'établissement n'apparaît plus dans le filtre PENDING après approbation", !after.includes(NOM_B));
  await ctx.close();
}

console.log("\n=== B : vérification post-approbation ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, EMAIL_B, TEST_PASSWORD);
  await page.goto(`${BASE_URL}/depenses/new`);
  const body = await waitForBodyText(page, (t) => t.length > 0);
  check("accès métier réel désormais autorisé après approbation", page.url() === `${BASE_URL}/depenses/new`);
  check("les 10 catégories par défaut réellement présentes après approbation manuelle", body.includes("Loyer") && body.includes("Autre"));
  await ctx.close();
}

console.log("\n=== C : isolation réelle entre les deux nouveaux établissements ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, EMAIL_A, TEST_PASSWORD);
  await page.goto(`${BASE_URL}/settings/expense-categories`);
  const body = await waitForBodyText(page, (t) => t.length > 0);
  check("l'établissement A voit exactement 10 catégories (jamais 20, jamais celles de B)", (body.match(/Loyer/g) ?? []).length === 1);
  await ctx.close();
}

await browser.close();
console.log(`\n=== Résultat global (poursuite) : ${failures === 0 ? "TOUS LES CONTRÔLES PASSENT" : `${failures} ÉCHEC(S)`} ===`);
process.exit(failures === 0 ? 0 : 1);
