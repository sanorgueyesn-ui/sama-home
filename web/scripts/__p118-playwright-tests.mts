import { chromium, type Browser, type BrowserContext } from "playwright";

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

/**
 * Attente active (sondage) du texte réel de la page — plus fiable qu'une
 * seule lecture de `page.content()` juste après une navigation, en mode dev
 * Webpack où l'hydratation/le rendu peut prendre un instant de plus.
 */
async function waitForBodyText(
  page: import("playwright").Page,
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
  // Connexion réussie → redirection serveur réelle vers "/", pas seulement
  // networkidle (qui peut se résoudre avant la navigation elle-même).
  await page.waitForURL(`${BASE_URL}/`, { timeout: 8000 }).catch(() => {});
  return page;
}

async function attemptLogin(context: BrowserContext, username: string, password: string) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`);
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /se connecter/i }).click();
  // Échec attendu : reste sur /login, le message réel (role=alert) apparaît
  // après la réponse de la Server Action — attente explicite plutôt qu'un
  // networkidle fragile.
  await page.getByRole("alert").first().waitFor({ timeout: 8000 }).catch(() => {});
  return page;
}

const browser = await chromium.launch();

// ---------------------------------------------------------------------------
// A. Authentification — formulaire réel /login, aucun cookie fabriqué.
// ---------------------------------------------------------------------------
console.log("\n=== A1 : identifiants valides — connexion réussie et redirection ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  check("redirigé vers / après connexion réussie", page.url() === `${BASE_URL}/`);
  const bodyA1 = await waitForBodyText(page, (t) => t.includes("P118 Admin Actif"));
  check("page affiche le nom réel de l'utilisateur connecté", bodyA1.includes("P118 Admin Actif"));
  await ctx.close();
}

console.log("\n=== A2 : identifiants invalides — refus de connexion ===");
{
  const ctx = await freshContext(browser);
  const page = await attemptLogin(ctx, "p118-admin-actif", "mauvais-mot-de-passe");
  check("reste sur /login après échec", page.url() === `${BASE_URL}/login`);
  const bodyA2 = await waitForBodyText(page, (t) => t.includes("Identifiant ou mot de passe incorrect"));
  check("message d'erreur réel affiché", bodyA2.includes("Identifiant ou mot de passe incorrect"));
  await ctx.close();
}

console.log("\n=== A3 : déconnexion — session invalidée ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  check("connecté avant déconnexion", page.url() === `${BASE_URL}/`);
  // Déconnexion via le vrai formulaire (bouton réel de l'AppShell), jamais
  // en supprimant le cookie à la main. Attente explicite de l'URL réelle
  // (le POST renvoie 200 avec une redirection gérée côté client, pas une
  // redirection HTTP classique — networkidle seul peut se résoudre trop tôt,
  // confirmé par un débogage réel avant correction de ce script).
  await page.getByRole("button", { name: /déconnexion/i }).first().click();
  await page.waitForURL(`${BASE_URL}/login`, { timeout: 8000 }).catch(() => {});
  check("redirigé vers /login après déconnexion", page.url() === `${BASE_URL}/login`);
  // Tentative d'accès à une page protégée APRÈS déconnexion, même page/contexte.
  await page.goto(`${BASE_URL}/logements`);
  check("accès refusé après déconnexion (redirigé vers /login)", page.url() === `${BASE_URL}/login`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// B. Protections d'accès
// ---------------------------------------------------------------------------
console.log("\n=== B1 : établissement ACTIVE + abonnement valide — accès métier autorisé ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-actif", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/logements`);
  check("page /logements chargée (pas de redirection)", page.url() === `${BASE_URL}/logements`);
  check("le logement réel de cet établissement est visible", (await page.content()).includes("P118 Chambre Active"));

  // Action métier réelle gardée (createProperty) — doit réussir.
  await page.goto(`${BASE_URL}/logements/new`);
  await page.locator("#name").fill("P118 Nouveau Logement Actif");
  await page.locator("#capacity").fill("2");
  await page.getByRole("button", { name: /ajouter|enregistrer/i }).click();
  await page.waitForURL((u) => u.pathname !== "/logements/new", { timeout: 8000 }).catch(() => {});
  check("createProperty() réussit réellement (redirection hors /logements/new, jamais resté bloqué sur le formulaire)", page.url() !== `${BASE_URL}/logements/new`);
  await ctx.close();
}

console.log("\n=== B2 : établissement SUSPENDED — accès métier refusé ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-suspendu", TEST_PASSWORD);
  check("connexion réussie malgré la suspension (la connexion elle-même n'est jamais bloquée)", page.url() === `${BASE_URL}/`);
  await page.goto(`${BASE_URL}/logements/new`);
  await page.locator("#name").fill("Ne devrait jamais être créé (suspendu)");
  await page.locator("#capacity").fill("1");
  await page.getByRole("button", { name: /ajouter|enregistrer/i }).click();
  const bodyB2 = await waitForBodyText(page, (t) => t.includes("inactif"));
  check("message réel de blocage affiché (établissement inactif)", bodyB2.includes("inactif"));
  check("reste sur /logements/new (création refusée)", page.url() === `${BASE_URL}/logements/new`);
  await ctx.close();
}

console.log("\n=== B3 : établissement PENDING — accès métier refusé ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-attente", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/logements/new`);
  await page.locator("#name").fill("Ne devrait jamais être créé (en attente)");
  await page.locator("#capacity").fill("1");
  await page.getByRole("button", { name: /ajouter|enregistrer/i }).click();
  const bodyB3 = await waitForBodyText(page, (t) => t.includes("inactif"));
  check("message réel de blocage affiché (établissement inactif)", bodyB3.includes("inactif"));
  await ctx.close();
}

console.log("\n=== B4 : abonnement expiré — fonctions bloquées, page de statut accessible ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-admin-expire", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/logements/new`);
  await page.locator("#name").fill("Ne devrait jamais être créé (expiré)");
  await page.locator("#capacity").fill("1");
  await page.getByRole("button", { name: /ajouter|enregistrer/i }).click();
  const bodyB4 = await waitForBodyText(page, (t) => t.includes("expiré"));
  check("message réel de blocage affiché (abonnement expiré)", bodyB4.includes("expiré"));
  await page.goto(`${BASE_URL}/abonnement`);
  check("page /abonnement reste accessible (pas de redirection ni de blocage)", page.url() === `${BASE_URL}/abonnement`);
  const bodyAbonnement = await waitForBodyText(page, (t) => t.includes("Actif") || t.includes("actif"));
  check("le statut réel affiché mentionne bien l'établissement actif", bodyAbonnement.includes("Actif") || bodyAbonnement.includes("actif"));
  await ctx.close();
}

console.log("\n=== B5 : administrateur de plateforme — accès plateforme, aucun privilège métier implicite ===");
{
  const ctx = await freshContext(browser);
  const page = await login(ctx, "p118-platform-admin", TEST_PASSWORD);
  await page.goto(`${BASE_URL}/plateforme`);
  check("accès réel à la console de plateforme", page.url() === `${BASE_URL}/plateforme`);
  // Visite de la page métier "/" — ne doit jamais hériter d'un établissement.
  await page.goto(`${BASE_URL}/`);
  check("aucune redirection anormale sur la page métier", page.url() === `${BASE_URL}/`);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1000); // laisse le temps à l'hydratation, avant une assertion négative
  check("aucun logement affiché par défaut (pas de privilège métier implicite)", !(await page.content()).includes("P118 Chambre Active"));
  await ctx.close();
}

console.log("\n=== B6 : accès direct sans session — refus/redirection ===");
{
  const ctx = await freshContext(browser); // jamais connecté
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/logements`);
  check("redirigé vers /login sans session", page.url() === `${BASE_URL}/login`);
  await ctx.close();
}

// ---------------------------------------------------------------------------
// Phase 4 — contrôles négatifs et isolation inter-établissements
// ---------------------------------------------------------------------------
console.log("\n=== C1 : isolation — un établissement ne peut pas accéder aux données d'un autre ===");
{
  // L'id réel du logement de "P118 Hotel Actif" est injecté via variable
  // d'environnement par le script appelant (jamais codé en dur ici).
  const foreignPropertyId = process.env.P118_FOREIGN_PROPERTY_ID;
  if (!foreignPropertyId) {
    console.log("ECHEC — P118_FOREIGN_PROPERTY_ID manquant, scénario non exécuté");
    failures++;
  } else {
    const ctx = await freshContext(browser);
    const page = await login(ctx, "p118-admin-actif2", TEST_PASSWORD);
    const response = await page.goto(`${BASE_URL}/logements/${foreignPropertyId}`);
    // Constat réel (vérifié par débogage avant ce lot) : dans cet
    // environnement de développement (webpack), notFound() affiche bien le
    // contenu "404" standard de Next.js, mais le code HTTP du document
    // renvoyé est 200, pas 404 — particularité de ce mode dev, jamais
    // présentée comme un 404 réel. La propriété de sécurité qui compte
    // (aucune donnée de l'établissement étranger n'apparaît) est vérifiée
    // séparément ci-dessous.
    const bodyText = await page.locator("body").textContent();
    check(
      `page "introuvable" affichée (statut HTTP réel observé : ${response?.status()} — particularité du mode dev/webpack, pas un vrai 404)`,
      Boolean(bodyText?.includes("404")),
    );
    check("le nom réel du logement étranger n'apparaît jamais dans la page (isolation effective)", !bodyText?.includes("P118 Chambre Active"));
    await ctx.close();
  }
}

await browser.close();
console.log(`\n=== Résultat global : ${failures === 0 ? "TOUS LES CONTRÔLES PASSENT" : `${failures} ÉCHEC(S)`} ===`);
process.exit(failures === 0 ? 0 : 1);
