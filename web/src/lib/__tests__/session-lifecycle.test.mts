// Lot 2 / étape 2a — cycle de vie des sessions (30 min d'inactivité, 12 h absolues, prolongation
// au plus toutes les 60 s).
//
// Isolation : AUCUNE base, AUCUN réseau, AUCUN .env. `@/lib/prisma` est une table de sessions en
// mémoire (avec la même sémantique conditionnelle que `updateMany`), `next/headers` un jar de
// cookies, `Date.now` une horloge injectée. `SESSION_SECRET` est une valeur FICTIVE posée ici.
// Ces tests prouvent la logique ; ils ne prouvent pas le comportement avec PostgreSQL.
import test from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";
import fs from "node:fs";
import { jwtVerify } from "jose";

const SECRET = "secret-fictif-uniquement-pour-les-tests-0123456789";
process.env.SESSION_SECRET = SECRET;

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
// Instant de référence = l'heure réelle au lancement (arrondie à la seconde). Il ne peut pas être une
// date figée : `jose` vérifie l'expiration du cookie signé avec la vraie horloge (pas `Date.now`
// injecté ci-dessous), donc un T0 passé rend le cookie « déjà expiré » et fait échouer verifySession.
const T0 = Math.floor(Date.now() / 1000) * 1000;

// --- Horloge injectée ----------------------------------------------------------------------
const realNow = Date.now;
let fakeNow = T0;
Date.now = () => fakeNow;
test.after(() => {
  Date.now = realNow;
});
const at = (ms: number) => {
  fakeNow = ms;
};

// --- Doublures -----------------------------------------------------------------------------
type Row = { id: string; userId: string; createdAt: Date; expiresAt: Date };
const table = new Map<string, Row>();
let idSeq = 0;
const writes: Array<{ where: { id: string; expiresAt: Date }; data: { expiresAt: Date } }> = [];
let failNextUpdate = false;
const writeCounts: number[] = [];
let readBarrier: { arrive: () => Promise<void> } | null = null;
function makeBarrier(parties: number) {
  let arrived = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  return {
    arrive: async () => {
      if (++arrived >= parties) release();
      await gate;
    },
  };
}

const jar = new Map<string, string>();
const cookieSets: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

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
      session: {
        create: async ({ data }: { data: { userId: string; createdAt: Date; expiresAt: Date } }) => {
          const row = { id: `s${++idSeq}`, ...data };
          table.set(row.id, row);
          return row;
        },
        findUnique: async ({ where }: { where: { id: string } }) => {
          const row = table.get(where.id);
          const snapshot = row ? { ...row } : null;
          if (readBarrier) await readBarrier.arrive(); // force une VRAIE course : toutes les lectures avant toute écriture
          return snapshot;
        },
        updateMany: async (args: { where: { id: string; expiresAt: Date }; data: { expiresAt: Date } }) => {
          writes.push(args);
          if (failNextUpdate) {
            failNextUpdate = false;
            throw Object.assign(new Error("connexion perdue"), { name: "PrismaClientInitializationError" });
          }
          const row = table.get(args.where.id);
          if (!row || row.expiresAt.getTime() !== args.where.expiresAt.getTime()) {
            writeCounts.push(0);
            return { count: 0 };
          }
          row.expiresAt = args.data.expiresAt;
          writeCounts.push(1);
          return { count: 1 };
        },
        update: async () => {
          throw new Error("update interdit : doit être updateMany (P2025 si la ligne a disparu)");
        },
        delete: async ({ where }: { where: { id: string } }) => {
          table.delete(where.id);
        },
      },
    },
  },
  "@/generated/prisma/client": { Prisma: { PrismaClientKnownRequestError: class extends Error {} } },
  "next/headers": {
    cookies: async () => ({
      get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
      set: (name: string, value: string, options: Record<string, unknown>) => {
        jar.set(name, value);
        cookieSets.push({ name, value, options });
      },
      delete: (name: string) => {
        jar.delete(name);
      },
    }),
  },
  "next/navigation": {
    redirect: (url: string) => {
      throw new NextRedirect(url);
    },
  },
  // `cache()` de React mémoïse par requête ; hors requête (tests) on l'neutralise pour que chaque
  // appel relise la table. La mémoïsation par rendu n'est donc PAS couverte par ces tests.
  react: { cache: <T extends (...args: never[]) => unknown>(fn: T) => fn },
  "server-only": {},
};
type ModuleInternals = { _load: (request: string, parent: unknown, isMain: boolean) => unknown };
const moduleInternals = Module as unknown as ModuleInternals;
const originalLoad = moduleInternals._load;
moduleInternals._load = function (request: string, parent: unknown, isMain: boolean) {
  if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
  return originalLoad.call(this, request, parent, isMain);
};

const policy = await import("../session-policy");
const { createSession } = await import("../session");
const dal = await import("../dal");

function reset() {
  idSeq = 0;
  table.clear();
  jar.clear();
  writes.length = 0;
  writeCounts.length = 0;
  readBarrier = null;
  cookieSets.length = 0;
  failNextUpdate = false;
  at(T0);
}
async function newSession(remember = false) {
  reset();
  return createSession("utilisateur-1", remember);
}
async function expectRedirect(promise: Promise<unknown>) {
  await assert.rejects(promise, (e: unknown) => (e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT;") === true);
}

// --- Politique pure : limites exactes ---------------------------------------------------------

test("constantes : 30 min, 12 h, 60 s", () => {
  assert.equal(policy.SESSION_IDLE_MS, 30 * MIN);
  assert.equal(policy.SESSION_MAX_MS, 12 * HOUR);
  assert.equal(policy.SESSION_TOUCH_MIN_GAIN_MS, 60 * 1000);
});

test("inactivité : valide à 30 min − 1 ms, invalide à 30 min exactement (comparaison stricte)", () => {
  const s = { createdAt: new Date(T0), expiresAt: new Date(T0 + 30 * MIN) };
  assert.equal(policy.evaluateSession(s, T0 + 30 * MIN - 1).valid, true);
  assert.deepEqual(policy.evaluateSession(s, T0 + 30 * MIN), { valid: false, reason: "IDLE" });
  assert.deepEqual(policy.evaluateSession(s, T0 + 30 * MIN + 1), { valid: false, reason: "IDLE" });
});

test("durée absolue : valide à 12 h − 1 ms, invalide à 12 h exactement, même avec une échéance d'inactivité lointaine", () => {
  const s = { createdAt: new Date(T0), expiresAt: new Date(T0 + 30 * 24 * HOUR) };
  assert.equal(policy.evaluateSession(s, T0 + 12 * HOUR - 1).valid, true);
  assert.deepEqual(policy.evaluateSession(s, T0 + 12 * HOUR), { valid: false, reason: "MAX_LIFETIME" });
  assert.deepEqual(policy.evaluateSession(s, T0 + 13 * HOUR), { valid: false, reason: "MAX_LIFETIME" });
});

test("la cible ne dépasse jamais createdAt + 12 h", () => {
  const s = { createdAt: new Date(T0), expiresAt: new Date(T0 + 12 * HOUR - 1 * MIN) };
  const e = policy.evaluateSession(s, T0 + 12 * HOUR - 2 * MIN);
  assert.equal(e.valid, true);
  if (e.valid) assert.equal(e.nextExpiresAt.getTime(), T0 + 12 * HOUR);
});

test("prolongation : pas d'écriture sous 60 s de gain, écriture à 60 s exactement", () => {
  const s = { createdAt: new Date(T0), expiresAt: new Date(T0 + 30 * MIN) };
  const early = policy.evaluateSession(s, T0 + 59_999);
  assert.ok(early.valid && early.shouldWrite === false);
  const exact = policy.evaluateSession(s, T0 + 60_000);
  assert.ok(exact.valid && exact.shouldWrite === true);
  if (exact.valid) assert.equal(exact.nextExpiresAt.getTime(), T0 + 60_000 + 30 * MIN);
});

test("pas de gain à écrire quand l'échéance est déjà la fin absolue", () => {
  const s = { createdAt: new Date(T0), expiresAt: new Date(T0 + 12 * HOUR) };
  const e = policy.evaluateSession(s, T0 + 11 * HOUR + 50 * MIN);
  assert.ok(e.valid && e.shouldWrite === false);
});

test("session héritée de 30 jours : réduite à min(now + 30 min, createdAt + 12 h), écriture demandée", () => {
  const legacy = { createdAt: new Date(T0), expiresAt: new Date(T0 + 30 * 24 * HOUR) };
  const young = policy.evaluateSession(legacy, T0 + 1 * HOUR);
  assert.ok(young.valid && young.shouldWrite === true);
  if (young.valid) assert.equal(young.nextExpiresAt.getTime(), T0 + 1 * HOUR + 30 * MIN);
  const nearEnd = policy.evaluateSession(legacy, T0 + 11 * HOUR + 50 * MIN);
  assert.ok(nearEnd.valid && nearEnd.shouldWrite === true);
  if (nearEnd.valid) assert.equal(nearEnd.nextExpiresAt.getTime(), T0 + 12 * HOUR);
});

test("pas de renouvellement illimité : 100 requêtes espacées de 20 min s'arrêtent à 12 h", () => {
  let s = { createdAt: new Date(T0), expiresAt: new Date(T0 + 30 * MIN) };
  let t = T0;
  let lastValidAt = T0;
  for (let i = 0; i < 100; i++) {
    t += 20 * MIN;
    const e = policy.evaluateSession(s, t);
    if (!e.valid) {
      assert.equal(e.reason, "MAX_LIFETIME");
      break;
    }
    lastValidAt = t;
    if (e.shouldWrite) s = { ...s, expiresAt: e.nextExpiresAt };
  }
  assert.ok(lastValidAt < T0 + 12 * HOUR);
  assert.ok(lastValidAt >= T0 + 12 * HOUR - 20 * MIN);
  assert.deepEqual(policy.evaluateSession(s, T0 + 12 * HOUR), { valid: false, reason: "MAX_LIFETIME" });
});

// --- createSession --------------------------------------------------------------------------

test("createSession : createdAt explicite, inactivité 30 min, JWT borné à createdAt + 12 h", async () => {
  const { sessionId } = await newSession(false);
  const row = table.get(sessionId)!;
  assert.equal(row.createdAt.getTime(), T0);
  assert.equal(row.expiresAt.getTime(), T0 + 30 * MIN);

  const { payload } = await jwtVerify(jar.get("sama_session")!, new TextEncoder().encode(SECRET), { algorithms: ["HS256"], currentDate: new Date(T0) });
  assert.equal(payload.sessionId, sessionId);
  assert.equal(payload.exp, Math.floor((T0 + 12 * HOUR) / 1000));
});

test("createSession : cookie de session si remember=false, persistant borné à 12 h si remember=true, attributs de sécurité conservés", async () => {
  await newSession(false);
  const a = cookieSets[0].options;
  assert.equal(a.httpOnly, true);
  assert.equal(a.sameSite, "lax");
  assert.equal(a.path, "/");
  assert.ok(!("expires" in a), "pas d'expires : cookie de session de navigateur");

  await newSession(true);
  const b = cookieSets[0].options;
  assert.equal((b.expires as Date).getTime(), T0 + 12 * HOUR);
  assert.equal(b.httpOnly, true);
});

test("remember n'influence plus aucune durée en base", async () => {
  const a = table.get((await newSession(false)).sessionId)!;
  const durA = [a.createdAt.getTime(), a.expiresAt.getTime()];
  const b = table.get((await newSession(true)).sessionId)!;
  assert.deepEqual([b.createdAt.getTime(), b.expiresAt.getTime()], durA);
});

// --- verifySession / getVerifiedSessionOrNull ---------------------------------------------------

test("verifySession : prolonge (écriture ≥ 60 s), pas d'écriture avant 60 s", async () => {
  const { sessionId } = await newSession();
  at(T0 + 30_000);
  assert.equal((await dal.verifySession()).userId, "utilisateur-1");
  assert.equal(writes.length, 0, "moins de 60 s : aucune écriture");

  at(T0 + 5 * MIN);
  await dal.verifySession();
  assert.equal(writes.length, 1);
  assert.equal(table.get(sessionId)!.expiresAt.getTime(), T0 + 5 * MIN + 30 * MIN);
});

test("verifySession : refuse après 30 min sans activité (redirection /login)", async () => {
  await newSession();
  at(T0 + 30 * MIN);
  await expectRedirect(dal.verifySession());
});

test("verifySession : une activité régulière maintient la session mais jamais au-delà de 12 h", async () => {
  await newSession();
  let t = T0;
  for (let i = 0; i < 35; i++) {
    t += 20 * MIN; // 11 h 40 min au total
    at(t);
    await dal.verifySession();
  }
  at(T0 + 12 * HOUR - 1);
  await dal.verifySession();
  at(T0 + 12 * HOUR);
  await expectRedirect(dal.verifySession());
});

test("getVerifiedSessionOrNull : valide → identifiant ; n'écrit JAMAIS, même quand une prolongation serait due", async () => {
  await newSession();
  at(T0 + 10 * MIN);
  const before = table.get("s1")!.expiresAt.getTime();
  assert.deepEqual(await dal.getVerifiedSessionOrNull(), { isAuth: true, userId: "utilisateur-1", sessionId: "s1", activeEstablishmentId: null });
  assert.equal(writes.length, 0);
  assert.equal(table.get("s1")!.expiresAt.getTime(), before);
});

test("getVerifiedSessionOrNull : expirée (inactivité ou 12 h), cookie absent ou session supprimée → null, sans redirection ni écriture", async () => {
  await newSession();
  at(T0 + 31 * MIN);
  assert.equal(await dal.getVerifiedSessionOrNull(), null);
  const row = table.get("s1")!;
  row.expiresAt = new Date(T0 + 30 * 24 * HOUR);
  at(T0 + 12 * HOUR);
  assert.equal(await dal.getVerifiedSessionOrNull(), null);
  table.delete("s1");
  at(T0 + 1 * MIN);
  assert.equal(await dal.getVerifiedSessionOrNull(), null);
  jar.clear();
  assert.equal(await dal.getVerifiedSessionOrNull(), null);
  assert.equal(writes.length, 0);
});

test("session héritée de 30 jours créée il y a < 12 h : réduite à la première requête de verifySession", async () => {
  await newSession();
  const row = table.get("s1")!;
  row.expiresAt = new Date(T0 + 30 * 24 * HOUR);
  at(T0 + 2 * HOUR);
  await dal.verifySession();
  assert.equal(writes.length, 1);
  assert.equal(row.expiresAt.getTime(), T0 + 2 * HOUR + 30 * MIN);
});

test("session héritée de plus de 12 h : refusée à la prochaine requête", async () => {
  await newSession();
  table.get("s1")!.expiresAt = new Date(T0 + 30 * 24 * HOUR);
  at(T0 + 12 * HOUR + 1);
  await expectRedirect(dal.verifySession());
  assert.equal(writes.length, 0);
});

test("concurrence : deux requêtes parallèles → une seule écriture aboutit, état final cohérent", async () => {
  await newSession();
  at(T0 + 10 * MIN);
  readBarrier = makeBarrier(3);
  await Promise.all([dal.verifySession(), dal.verifySession(), dal.verifySession()]);
  readBarrier = null;
  assert.equal(writes.length, 3, "chaque requête tente l'écriture conditionnelle");
  assert.deepEqual([...writeCounts].sort(), [0, 0, 1], "une seule écriture aboutit, les deux autres ne modifient rien");
  assert.equal(table.get("s1")!.expiresAt.getTime(), T0 + 10 * MIN + 30 * MIN);
  for (const w of writes) assert.equal(w.where.expiresAt.getTime(), T0 + 30 * MIN, "garde sur la valeur lue");
});

test("suppression concurrente (déconnexion / changement de mot de passe) : aucune erreur, la page n'échoue pas", async () => {
  await newSession();
  const real = (stubs["@/lib/prisma"] as { prisma: { session: { findUnique: (a: { where: { id: string } }) => Promise<unknown> } } }).prisma.session;
  const originalFind = real.findUnique;
  real.findUnique = async (a) => {
    const row = await originalFind(a);
    table.delete("s1"); // la ligne disparaît juste après la lecture
    return row;
  };
  try {
    at(T0 + 10 * MIN);
    assert.deepEqual(await dal.verifySession(), { isAuth: true, userId: "utilisateur-1", sessionId: "s1", activeEstablishmentId: null });
  } finally {
    real.findUnique = originalFind;
  }
});

test("échec de l'écriture : journalisé sans données sensibles, la requête réussit", async () => {
  await newSession();
  at(T0 + 10 * MIN);
  failNextUpdate = true;
  const logged: unknown[][] = [];
  const realError = console.error;
  console.error = (...args: unknown[]) => void logged.push(args);
  try {
    assert.equal((await dal.verifySession()).userId, "utilisateur-1");
  } finally {
    console.error = realError;
  }
  assert.equal(logged.length, 1);
  assert.equal(logged[0][1], "PrismaClientInitializationError", "seul le nom de l'erreur est journalisé");
});

test("deux sessions du même compte restent indépendantes", async () => {
  reset();
  const a = await createSession("utilisateur-1", false);
  const tokenA = jar.get("sama_session")!;
  at(T0 + 20 * MIN);
  const b = await createSession("utilisateur-1", false);
  const tokenB = jar.get("sama_session")!;

  jar.set("sama_session", tokenA);
  at(T0 + 35 * MIN); // A inactive depuis 35 min ; B depuis 15 min
  await expectRedirect(dal.verifySession());
  jar.set("sama_session", tokenB);
  assert.equal((await dal.verifySession()).userId, "utilisateur-1");
  assert.notEqual(a.sessionId, b.sessionId);
});

// --- Garde de source ------------------------------------------------------------------------------

test("seul verifySession() demande la prolongation ; aucun autre appelant d'écriture de session dans dal.ts", () => {
  const raw = fs.readFileSync(new URL("../dal.ts", import.meta.url), "utf8");
  const source = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.equal((source.match(/extend:\s*true/g) ?? []).length, 1);
  assert.equal((source.match(/extend:\s*false/g) ?? []).length, 1);
  assert.equal((source.match(/session\.updateMany/g) ?? []).length, 1);
  assert.doesNotMatch(source, /session\.update\(/);
});

test("voie Google : la session n'est plus persistante (createSession(..., false))", () => {
  const source = fs.readFileSync(new URL("../../app/actions/auth.ts", import.meta.url), "utf8");
  const start = source.indexOf("export async function setPasswordWithGoogleToken");
  const end = source.indexOf("export async function logout");
  assert.match(source.slice(start, end), /createSession\(user\.id, false\)/);
  assert.doesNotMatch(source.slice(start, end), /createSession\(user\.id, true\)/);
});
