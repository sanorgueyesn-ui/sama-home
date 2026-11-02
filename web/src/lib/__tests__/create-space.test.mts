// Socle multi-espaces, lot D — action « créer un espace » (src/app/actions/space.ts).
// Aucune base, aucun réseau : `@/lib/prisma`, `@/lib/dal` & co sont des doublures qui enregistrent
// les écritures. On prouve ce qui est écrit, et surtout ce qui ne l'est PAS.
import test from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";

type User = { id: string; isPlatformAdmin: boolean; role: string | null };

let user: User = { id: "u1", isPlatformAdmin: false, role: "ADMIN" };
let membershipCount = 1;
let autoApprove = false;
let rateAllowed = true;

const created: Array<{ data: Record<string, unknown> }> = [];
const memberships: Array<{ data: Record<string, unknown> }> = [];
const audits: Array<{ data: Record<string, unknown> }> = [];
const trials: Array<{ establishmentId: string; actor: string | null }> = [];
const sessionWrites: Array<{ where: unknown; data: unknown }> = [];

class NextRedirect extends Error {
  url: string;
  constructor(url: string) {
    super("NEXT_REDIRECT");
    this.url = url;
  }
}

const tx = {
  membership: {
    count: async () => membershipCount,
    create: async (args: { data: Record<string, unknown> }) => void memberships.push(args),
  },
  platformSettings: { findUnique: async () => ({ autoApproveEstablishments: autoApprove }) },
  establishment: {
    create: async (args: { data: Record<string, unknown> }) => {
      created.push(args);
      return { id: "new-space" };
    },
  },
  auditLog: { create: async (args: { data: Record<string, unknown> }) => void audits.push(args) },
};

const stubs: Record<string, unknown> = {
  "@/lib/prisma": {
    prisma: {
      $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
      session: {
        updateMany: async (args: { where: unknown; data: unknown }) => {
          sessionWrites.push(args);
          return { count: 1 };
        },
      },
    },
  },
  "@/lib/dal": { verifySession: async () => ({ userId: user.id, sessionId: "sess-1" }), getCurrentUser: async () => user },
  "@/lib/rate-limit": { checkRateLimit: () => ({ allowed: rateAllowed, remaining: 1, retryAfterSeconds: 0 }) },
  "@/lib/establishment-activation": {
    createTrialSubscriptionAndAudit: async (_tx: unknown, establishmentId: string, actor: string | null) => {
      trials.push({ establishmentId, actor });
    },
  },
  "next/navigation": {
    redirect: (url: string) => {
      throw new NextRedirect(url);
    },
  },
  "next/cache": { revalidatePath: () => undefined },
  "server-only": {},
};
type ModuleInternals = { _load: (request: string, parent: unknown, isMain: boolean) => unknown };
const moduleInternals = Module as unknown as ModuleInternals;
const originalLoad = moduleInternals._load;
moduleInternals._load = function (request: string, parent: unknown, isMain: boolean) {
  if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
  return originalLoad.call(this, request, parent, isMain);
};

const { createSpace } = await import("../../app/actions/space");

function reset() {
  user = { id: "u1", isPlatformAdmin: false, role: "ADMIN" };
  membershipCount = 1;
  autoApprove = false;
  rateAllowed = true;
  for (const list of [created, memberships, audits, trials, sessionWrites] as unknown[][]) list.length = 0;
}

/** Renvoie soit l'état retourné, soit `{ redirect }` si l'action a redirigé. */
async function run(entries: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(entries)) form.set(key, value);
  try {
    return { state: await createSpace(undefined, form) };
  } catch (error) {
    if (error instanceof NextRedirect) return { redirect: error.url };
    throw error;
  }
}

test("modération manuelle : espace PENDING, appartenance ADMIN du compte de la SESSION, aucune bascule", async () => {
  reset();
  const result = await run({ name: "Mon Hôtel", businessMode: "HOTEL" });
  assert.deepEqual(result, { state: { pendingName: "Mon Hôtel" } });
  assert.deepEqual(created[0].data, { name: "Mon Hôtel", businessMode: "HOTEL", status: "PENDING" });
  assert.deepEqual(memberships[0].data, { userId: "u1", establishmentId: "new-space", role: "ADMIN" });
  assert.equal(audits.length, 1);
  assert.equal(trials.length, 0);
  assert.equal(sessionWrites.length, 0);
});

test("approbation automatique : ACTIVE avec essai, bascule vers le nouvel espace, redirection", async () => {
  reset();
  autoApprove = true;
  const result = await run({ name: "Hôtel Nord", businessMode: "HOTEL" });
  assert.deepEqual(result, { redirect: "/dashboard" });
  assert.equal(created[0].data.status, "ACTIVE");
  assert.equal(created[0].data.businessMode, "HOTEL");
  assert.deepEqual(trials, [{ establishmentId: "new-space", actor: "u1" }]);
  assert.deepEqual(sessionWrites, [{ where: { id: "sess-1", userId: "u1" }, data: { activeEstablishmentId: "new-space" } }]);
});

test("agence immobilière suspendue : refusée côté serveur même si la demande est forgée, rien n'est écrit", async () => {
  reset();
  autoApprove = true;
  const result = await run({ name: "Agence Nord", businessMode: "REAL_ESTATE" });
  assert.ok("state" in result && result.state?.errors?.businessMode, "erreur de champ attendue sur le type d'activité");
  assert.match(String(result.state?.errors?.businessMode), /pas disponibles pour le moment/);
  assert.equal(created.length, 0);
  assert.equal(memberships.length, 0);
  assert.equal(trials.length, 0);
  assert.equal(sessionWrites.length, 0);
});

test("résidence : toujours acceptée", async () => {
  reset();
  autoApprove = true;
  const result = await run({ name: "Résidence Nord", businessMode: "RESIDENCE" });
  assert.deepEqual(result, { redirect: "/dashboard" });
  assert.equal(created[0].data.businessMode, "RESIDENCE");
});

test("gestionnaire : refusé, rien n'est créé", async () => {
  reset();
  user = { id: "u1", isPlatformAdmin: false, role: "GESTIONNAIRE" };
  const result = await run({ name: "Mon Hôtel", businessMode: "HOTEL" });
  assert.ok("state" in result && result.state?.message);
  assert.equal(created.length, 0);
  assert.equal(memberships.length, 0);
});

test("compte de plateforme : refusé", async () => {
  reset();
  user = { id: "p1", isPlatformAdmin: true, role: "ADMIN" };
  const result = await run({ name: "Mon Hôtel", businessMode: "HOTEL" });
  assert.ok("state" in result && result.state?.message);
  assert.equal(created.length, 0);
});

test("plafond d'espaces atteint (relu dans la transaction) : refusé", async () => {
  reset();
  membershipCount = 3;
  const result = await run({ name: "Quatrième", businessMode: "HOTEL" });
  assert.ok("state" in result && result.state?.message);
  assert.equal(created.length, 0);
});

test("champs invalides : erreurs de champ, aucune écriture", async () => {
  reset();
  assert.ok("state" in (await run({ name: "x", businessMode: "HOTEL" })));
  const bad = await run({ name: "Nom valide", businessMode: "AGENCY" });
  assert.ok("state" in bad && bad.state?.errors?.businessMode);
  assert.equal(created.length, 0);
});

test("limite de débit dépassée : rien n'est créé", async () => {
  reset();
  rateAllowed = false;
  const result = await run({ name: "Mon Hôtel", businessMode: "HOTEL" });
  assert.ok("state" in result && result.state?.message);
  assert.equal(created.length, 0);
});

test("userId, rôle, statut ou espace envoyés par le formulaire sont ignorés", async () => {
  reset();
  await run({
    name: "Mon Hôtel",
    businessMode: "HOTEL",
    userId: "autre",
    role: "ADMIN",
    status: "ACTIVE",
    establishmentId: "autre-espace",
  });
  assert.deepEqual(created[0].data, { name: "Mon Hôtel", businessMode: "HOTEL", status: "PENDING" });
  assert.deepEqual(memberships[0].data, { userId: "u1", establishmentId: "new-space", role: "ADMIN" });
});
