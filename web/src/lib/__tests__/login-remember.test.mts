// Lot 2 / étape 2b — « Se souvenir de moi » : case décochée par défaut et transmission de la valeur.
//
// Isolation : AUCUNE base, AUCUN réseau, AUCUN .env. `@/lib/prisma`, `@/lib/password`,
// `@/lib/session`, `@/lib/rate-limit`, `next/navigation` et `next/headers` sont remplacés par des
// doublures. Le rendu React complet n'est pas possible sous la condition `react-server` de la suite
// (pas de hooks) : la case est donc vérifiée au niveau du SOURCE de la balise, pas dans un DOM rendu.
import test from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";
import fs from "node:fs";

type User = {
  id: string;
  passwordHash: string | null;
  establishmentId: string | null;
  isPlatformAdmin: boolean;
  permissions: string | null;
};
const USER: User = { id: "u1", passwordHash: "hash", establishmentId: null, isPlatformAdmin: false, permissions: null };

let foundUser: User | null = USER;
let passwordOk = true;
let establishmentStatus: string | null = null;
let rateAllowed = true;
let googlePayload: { email: string; purpose: string } | null = { email: "g@exemple.invalid", purpose: "login" };
const createSessionCalls: Array<[string, boolean]> = [];

class NextRedirect extends Error {
  digest: string;
  constructor(url: string) {
    super("NEXT_REDIRECT");
    this.digest = `NEXT_REDIRECT;replace;${url};307;`;
  }
}

const stubs: Record<string, unknown> = {
  "@/lib/prisma": {
    prisma: {
      user: {
        findFirst: async () => foundUser,
        update: async () => ({}),
      },
      // Socle multi-espaces : le statut se lit via les appartenances du compte (src/lib/login-gate.ts).
      membership: {
        findMany: async () => (establishmentStatus ? [{ establishment: { status: establishmentStatus } }] : []),
      },
    },
  },
  "@/lib/password": {
    verifyPassword: async () => passwordOk,
    hashPassword: async () => "nouveau-hash",
  },
  "@/lib/session": {
    createSession: async (userId: string, remember: boolean) => {
      createSessionCalls.push([userId, remember]);
      return { token: "t", expiresAt: new Date(), sessionId: "s" };
    },
    deleteSession: async () => undefined,
  },
  "@/lib/rate-limit": {
    checkRateLimit: () => ({ allowed: rateAllowed, remaining: 1, retryAfterSeconds: 7 }),
    resetRateLimit: () => undefined,
    getClientIp: async () => "203.0.113.9",
  },
  "@/lib/session-token": {
    verifyGoogleAuthToken: async () => googlePayload,
  },
  "next/navigation": {
    redirect: (url: string) => {
      throw new NextRedirect(url);
    },
  },
  "next/headers": {
    cookies: async () => ({ get: () => undefined, delete: () => undefined, set: () => undefined }),
  },
  "server-only": {},
};
type ModuleInternals = { _load: (request: string, parent: unknown, isMain: boolean) => unknown };
const moduleInternals = Module as unknown as ModuleInternals;
const originalLoad = moduleInternals._load;
moduleInternals._load = function (request: string, parent: unknown, isMain: boolean) {
  if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
  return originalLoad.call(this, request, parent, isMain);
};

const auth = await import("../../app/actions/auth");

function reset() {
  createSessionCalls.length = 0;
  foundUser = USER;
  passwordOk = true;
  establishmentStatus = null;
  rateAllowed = true;
  googlePayload = { email: "g@exemple.invalid", purpose: "login" };
}
function loginForm(extra: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("username", "utilisateur");
  fd.set("password", "mot-de-passe-fictif");
  for (const [k, v] of Object.entries(extra)) fd.set(k, v);
  return fd;
}
async function runLogin(fd: FormData) {
  try {
    const result = await auth.login(undefined, fd);
    return { redirected: null as string | null, result };
  } catch (e) {
    const digest = (e as { digest?: string }).digest;
    if (digest?.startsWith("NEXT_REDIRECT;")) return { redirected: digest.split(";")[2], result: undefined };
    throw e;
  }
}

// --- La case dans l'interface (niveau source) ---------------------------------------------------------

const formSource = fs.readFileSync(new URL("../../app/login/login-form.tsx", import.meta.url), "utf8");
const rememberInputs = [...formSource.matchAll(/<input\b[^>]*name="remember"[^>]*\/?>/g)].map((m) => m[0]);

test("la case « Se souvenir de moi » existe une seule fois, de type checkbox, avec le nom remember", () => {
  assert.equal(rememberInputs.length, 1, "exactement un champ remember dans le formulaire de connexion");
  assert.match(rememberInputs[0], /type="checkbox"/);
  assert.match(formSource, /Se souvenir de moi/);
});

test("la case n'est PAS sélectionnée par défaut (ni defaultChecked, ni checked)", () => {
  assert.doesNotMatch(rememberInputs[0], /defaultChecked/);
  assert.doesNotMatch(rememberInputs[0], /\bchecked\b/);
  // Aucun autre mécanisme de pré-sélection n'existe dans le fichier.
  assert.doesNotMatch(formSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""), /defaultChecked|setRemember|useState\(\s*true\s*\)/);
});

// --- Transmission de la valeur jusqu'à createSession --------------------------------------------------

test("case absente (décochée) → createSession(userId, false)", async () => {
  reset();
  const { redirected } = await runLogin(loginForm());
  assert.deepEqual(createSessionCalls, [["u1", false]]);
  assert.equal(redirected, "/dashboard");
});

test("remember=on (cochée) → createSession(userId, true)", async () => {
  reset();
  await runLogin(loginForm({ remember: "on" }));
  assert.deepEqual(createSessionCalls, [["u1", true]]);
});

test("toute valeur autre que « on » est traitée comme décochée", async () => {
  for (const value of ["off", "true", "1", "ON", ""]) {
    reset();
    await runLogin(loginForm({ remember: value }));
    assert.deepEqual(createSessionCalls, [["u1", false]], `valeur « ${value} »`);
  }
});

// --- Aucune session quand la connexion échoue --------------------------------------------------------

test("connexion refusée → createSession n'est jamais appelé, même avec remember=on", async () => {
  const cases: Array<[string, () => void, Record<string, string>]> = [
    ["compte inconnu", () => void (foundUser = null), {}],
    ["mot de passe incorrect", () => void (passwordOk = false), {}],
    ["trop de tentatives", () => void (rateAllowed = false), {}],
    ["champs vides", () => undefined, { username: "", password: "" }],
    ["établissement en attente", () => void ((foundUser = { ...USER, establishmentId: "e1" }), (establishmentStatus = "PENDING")), {}],
    ["établissement refusé", () => void ((foundUser = { ...USER, establishmentId: "e1" }), (establishmentStatus = "REJECTED")), {}],
    ["établissement suspendu", () => void ((foundUser = { ...USER, establishmentId: "e1" }), (establishmentStatus = "SUSPENDED")), {}],
  ];
  for (const [label, arrange, overrides] of cases) {
    reset();
    arrange();
    const { redirected, result } = await runLogin(loginForm({ remember: "on", ...overrides }));
    assert.equal(redirected, null, `${label} : aucune redirection de succès`);
    assert.ok(result && "error" in result && result.error, `${label} : message d'erreur attendu`);
    assert.deepEqual(createSessionCalls, [], `${label} : createSession ne doit pas être appelé`);
  }
});

// --- Parcours Google -------------------------------------------------------------------------------------

function googleForm(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("token", "jeton-fictif");
  fd.set("password", "nouveau-mot-de-passe");
  fd.set("confirmPassword", "nouveau-mot-de-passe");
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}
async function runGoogle(fd: FormData) {
  try {
    const result = await auth.setPasswordWithGoogleToken(undefined, fd);
    return { redirected: null as string | null, result };
  } catch (e) {
    const digest = (e as { digest?: string }).digest;
    if (digest?.startsWith("NEXT_REDIRECT;")) return { redirected: digest.split(";")[2], result: undefined };
    throw e;
  }
}

test("parcours Google réussi → createSession(userId, false), jamais persistant, même si un champ remember est envoyé", async () => {
  reset();
  const { redirected } = await runGoogle(googleForm({ remember: "on" }));
  assert.deepEqual(createSessionCalls, [["u1", false]]);
  assert.equal(redirected, "/dashboard");
});

test("parcours Google en échec → aucune session créée", async () => {
  const failures: Array<[string, () => void, Record<string, string>]> = [
    ["jeton invalide", () => void (googlePayload = null), {}],
    ["mot de passe trop court", () => undefined, { password: "court", confirmPassword: "court" }],
    ["confirmation différente", () => undefined, { confirmPassword: "autre-valeur-x" }],
    ["utilisateur introuvable", () => void (foundUser = null), {}],
  ];
  for (const [label, arrange, overrides] of failures) {
    reset();
    arrange();
    const { redirected, result } = await runGoogle(googleForm(overrides));
    assert.equal(redirected, null, `${label} : pas de succès`);
    assert.ok(result && result.error, `${label} : message d'erreur attendu`);
    assert.deepEqual(createSessionCalls, [], `${label} : createSession ne doit pas être appelé`);
  }
});
