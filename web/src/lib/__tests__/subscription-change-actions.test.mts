// Lot 3B (B2.13-A et B2.13-B) — actions de CRÉATION puis de DÉCISION (approbation, rejet, annulation)
// des demandes de paiement manuel et de prolongation.
//
// Isolation : AUCUNE base, AUCUN réseau. `@/lib/prisma` est remplacé par une base en mémoire :
// - la transaction restaure l'état initial (demandes, audits, règlements, abonnements) si la fonction
//   lève une erreur (comme PostgreSQL) ;
// - la contrainte d'unicité (demandeur, clé) lève une erreur de code "P2002" ;
// - après une erreur dans une transaction, celle-ci est « abandonnée » : tout nouvel appel via `tx`
//   lève une erreur (comportement de PostgreSQL, SQLSTATE 25P02), ce qui prouve que le code ne
//   réutilise jamais une transaction échouée ;
// - les mises à jour de demandes appliquent les MÊMES conditions que SQL (dont `<>` jamais vrai pour
//   NULL) et vérifient, après écriture, les 7 contraintes CHECK de la migration (erreur 23514) ;
// - `subscription` n'expose que `findUnique` et `updateMany` (jamais de création) ; `subscriptionPayment`
//   n'expose que `create` et tout autre accès (modification, suppression…) est un piège qui consigne
//   l'appel et fait échouer les tests.
//
// COURSES CONCURRENTES : la doublure ne fait PAS tourner deux transactions en parallèle. Une course est
// SIMULÉE de façon contrôlée : un « crochet » exécute, juste avant l'écriture conditionnelle testée,
// l'effet d'une autre transaction déjà validée (par exemple une annulation), exactement comme si elle
// avait gagné la course après notre lecture. Cela prouve que le code vérifie `count === 1`, annule tout et
// qu'une seule décision subsiste. Cela ne remplace PAS un test avec deux connexions PostgreSQL réelles
// (verrous de ligne, réévaluation des conditions), prévu à une étape ultérieure.
import test from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type RequestRow = {
  id: string;
  establishmentId: string;
  kind: string;
  status: string;
  amountFcfa: number | null;
  periodMonths: number | null;
  days: number | null;
  reference: string | null;
  reason: string | null;
  idempotencyKey: string;
  requestedByUserId: string | null;
  decidedByUserId: string | null;
  decidedAt: Date | null;
  decisionReason: string | null;
  appliedPaymentId: string | null;
};
type PaymentRow = Record<string, unknown> & { id: string };
type SubscriptionRow = { id: string; establishmentId: string; currentPeriodEnd?: Date };
type AuditRow = Record<string, unknown> & { action: string; userId: string | null; entityId: string; establishmentId: string };
type Db = {
  establishments: Map<string, { id: string; status: string }>;
  subscriptions: Map<string, SubscriptionRow>;
  requests: RequestRow[];
  payments: PaymentRow[];
  audits: AuditRow[];
};
type RequesterCondition = string | null | { not: string };
type RequestWhere = { id?: string; status?: string; requestedByUserId?: RequesterCondition; OR?: { requestedByUserId?: RequesterCondition }[] };

let db: Db;
let seq = 0;
let currentUser: { id: string; isPlatformAdmin: boolean; permissions?: string | null };
let txCalls = 0;
let forbiddenAccess: string[] = [];
let revalidated: string[] = [];
let failAuditCreate = false;
let failAuditAction: string | null = null;
let failPaymentCreate = false;
let failOnCreate: Error | null = null;
let pendingRace: RequestRow | null = null;
let raceTriggered = false;
let abortedTx = false;
let beforeRequestUpdate: (() => void) | null = null;
let beforeSubscriptionUpdate: (() => void) | null = null;
let externalCommits: (() => void)[] = [];

function freshDb(): Db {
  return { establishments: new Map(), subscriptions: new Map(), requests: [], payments: [], audits: [] };
}

class UniqueViolation extends Error {
  code = "P2002";
}
class CheckViolation extends Error {
  code = "23514";
}

const guard = () => {
  if (abortedTx) throw new Error("25P02 : la transaction courante est abandonnée, les commandes sont ignorées");
};

/** Effet d'une AUTRE transaction déjà validée : appliqué maintenant et ré-appliqué si la nôtre est annulée. */
function externalCommit(fn: () => void) {
  fn();
  externalCommits.push(fn);
}

const findByKey = (userId: string, key: string) =>
  db.requests.find((r) => r.requestedByUserId === userId && r.idempotencyKey === key) ?? null;

/** Comparaison SQL : `<> x` n'est jamais vrai pour NULL ; `= NULL` s'écrit `IS NULL`. */
function matchRequester(value: string | null, condition: RequesterCondition | undefined): boolean {
  if (condition === undefined) return true;
  if (condition === null) return value === null;
  if (typeof condition === "string") return value === condition;
  return value !== null && value !== condition.not;
}

/** Les 7 contraintes CHECK de la migration, appliquées à une ligne après écriture. */
function checkViolation(row: RequestRow): string | null {
  const pending = row.status === "PENDING_SECOND_APPROVAL";
  if (pending && (row.decidedAt !== null || row.decidedByUserId !== null || row.decisionReason !== null || row.appliedPaymentId !== null)) {
    return "status_fields_check";
  }
  if (!pending && row.decidedAt === null) return "status_fields_check";
  if (row.status === "REJECTED" && !(row.decisionReason !== null && row.decisionReason.replace(/[ \t\r\n]/g, "").length > 0)) {
    return "reject_reason_check";
  }
  const manualApproved = row.status === "APPROVED" && row.kind === "MANUAL_PAYMENT";
  if (manualApproved !== (row.appliedPaymentId !== null)) return "applied_payment_check";
  const decidedByOther = row.requestedByUserId !== null && row.decidedByUserId !== null;
  if ((row.status === "APPROVED" || row.status === "REJECTED") && decidedByOther && row.requestedByUserId === row.decidedByUserId) {
    return "no_self_decision_check";
  }
  if (row.status === "CANCELLED" && decidedByOther && row.requestedByUserId !== row.decidedByUserId) {
    return "cancel_by_requester_check";
  }
  return null;
}

const requestsApi = {
  findUnique: async (args: {
    where: { id?: string; requestedByUserId_idempotencyKey?: { requestedByUserId: string; idempotencyKey: string } };
  }) => {
    const compound = args.where.requestedByUserId_idempotencyKey;
    const row = compound ? findByKey(compound.requestedByUserId, compound.idempotencyKey) : db.requests.find((r) => r.id === args.where.id) ?? null;
    return row ? { ...row } : null;
  },
  create: async (args: { data: Partial<RequestRow> & { requestedByUserId: string; idempotencyKey: string } }) => {
    if (failOnCreate) throw failOnCreate;
    if (pendingRace) {
      raceTriggered = true;
      abortedTx = true;
      throw new UniqueViolation("Unique constraint failed on the fields: (`requestedByUserId`,`idempotencyKey`)");
    }
    if (findByKey(args.data.requestedByUserId, args.data.idempotencyKey)) {
      abortedTx = true;
      throw new UniqueViolation("Unique constraint failed");
    }
    const row: RequestRow = {
      id: `req-${++seq}`,
      status: "PENDING_SECOND_APPROVAL",
      decidedByUserId: null,
      decidedAt: null,
      decisionReason: null,
      appliedPaymentId: null,
      establishmentId: "",
      kind: "",
      amountFcfa: null,
      periodMonths: null,
      days: null,
      reference: null,
      reason: null,
      ...args.data,
    };
    db.requests.push(row);
    return { id: row.id };
  },
  updateMany: async (args: { where: RequestWhere; data: Partial<RequestRow> }) => {
    if (beforeRequestUpdate) {
      const hook = beforeRequestUpdate;
      beforeRequestUpdate = null;
      hook();
    }
    const w = args.where;
    const matches = db.requests.filter(
      (r) =>
        (w.id === undefined || r.id === w.id) &&
        (w.status === undefined || r.status === w.status) &&
        matchRequester(r.requestedByUserId, w.requestedByUserId) &&
        (w.OR === undefined || w.OR.some((c) => matchRequester(r.requestedByUserId, c.requestedByUserId))),
    );
    for (const row of matches) {
      const candidate = { ...row, ...args.data };
      const violated = checkViolation(candidate);
      if (violated) {
        abortedTx = true;
        throw new CheckViolation(`new row violates check constraint "SubscriptionChangeRequest_${violated}"`);
      }
    }
    for (const row of matches) Object.assign(row, args.data);
    return { count: matches.length };
  },
};

const paymentsApi = {
  create: async (args: { data: Record<string, unknown> }) => {
    if (failPaymentCreate) throw new Error("échec simulé de la création du règlement");
    const row: PaymentRow = { id: `pay-${++seq}`, ...args.data };
    db.payments.push(row);
    return { id: row.id };
  },
};

const tx = {
  subscriptionChangeRequest: {
    findUnique: async (a: Parameters<typeof requestsApi.findUnique>[0]) => {
      guard();
      return requestsApi.findUnique(a);
    },
    create: async (a: Parameters<typeof requestsApi.create>[0]) => {
      guard();
      return requestsApi.create(a);
    },
    updateMany: async (a: Parameters<typeof requestsApi.updateMany>[0]) => {
      guard();
      return requestsApi.updateMany(a);
    },
  },
  establishment: {
    findUnique: async (a: { where: { id: string } }) => {
      guard();
      return db.establishments.get(a.where.id) ?? null;
    },
  },
  subscription: {
    findUnique: async (a: { where: { establishmentId: string } }) => {
      guard();
      const row = db.subscriptions.get(a.where.establishmentId);
      return row ? { ...row } : null;
    },
    updateMany: async (a: { where: { id: string; currentPeriodEnd: Date }; data: { currentPeriodEnd: Date } }) => {
      guard();
      if (beforeSubscriptionUpdate) {
        const hook = beforeSubscriptionUpdate;
        beforeSubscriptionUpdate = null;
        hook();
      }
      const matches = [...db.subscriptions.values()].filter(
        (s) => s.id === a.where.id && s.currentPeriodEnd !== undefined && s.currentPeriodEnd.getTime() === a.where.currentPeriodEnd.getTime(),
      );
      for (const s of matches) s.currentPeriodEnd = a.data.currentPeriodEnd;
      return { count: matches.length };
    },
  },
  // Seule la CRÉATION d'un règlement est possible ; toute autre opération (modifier, supprimer…) est un piège.
  subscriptionPayment: new Proxy(paymentsApi as Record<string, unknown>, {
    get(target, prop) {
      if (typeof prop === "string" && prop in target) {
        const member = target[prop] as (...args: never[]) => Promise<unknown>;
        return async (...args: never[]) => {
          guard();
          return member(...args);
        };
      }
      forbiddenAccess.push(`subscriptionPayment.${String(prop)}`);
      throw new Error(`accès interdit à subscriptionPayment.${String(prop)}`);
    },
  }),
  auditLog: {
    create: async (a: { data: AuditRow }) => {
      guard();
      if (failAuditCreate || (failAuditAction !== null && a.data.action === failAuditAction)) {
        throw new Error("échec simulé de l'écriture d'audit");
      }
      db.audits.push(a.data);
      return a.data;
    },
  },
};

const prismaDouble = {
  $transaction: async <T,>(fn: (t: typeof tx) => Promise<T>): Promise<T> => {
    txCalls++;
    const snapshot = {
      requests: db.requests.map((r) => ({ ...r })),
      audits: [...db.audits],
      payments: db.payments.map((p) => ({ ...p })),
      subscriptions: new Map([...db.subscriptions].map(([k, v]) => [k, { ...v }] as const)),
    };
    abortedTx = false;
    try {
      return await fn(tx);
    } catch (error) {
      // Annulation complète, comme PostgreSQL.
      db.requests = snapshot.requests;
      db.audits = snapshot.audits;
      db.payments = snapshot.payments;
      db.subscriptions = snapshot.subscriptions;
      // Les effets des AUTRES transactions déjà validées ne sont pas annulés par notre échec.
      for (const commit of externalCommits) commit();
      if (raceTriggered && pendingRace) {
        // L'autre transaction concurrente, elle, a validé sa ligne.
        db.requests.push(pendingRace);
      }
      throw error;
    } finally {
      externalCommits = [];
      pendingRace = null;
      raceTriggered = false;
      abortedTx = false;
    }
  },
  // Lecture INDÉPENDANTE (hors transaction), utilisée après une collision d'unicité.
  subscriptionChangeRequest: { findUnique: requestsApi.findUnique },
};

const stubs: Record<string, unknown> = {
  "@/lib/prisma": { prisma: prismaDouble },
  "@/lib/dal": { getCurrentUser: async () => currentUser },
  "next/cache": { revalidatePath: (p: string) => revalidated.push(p) },
  "server-only": {},
};
type ModuleInternals = { _load: (request: string, parent: unknown, isMain: boolean) => unknown };
const moduleInternals = Module as unknown as ModuleInternals;
const originalLoad = moduleInternals._load;
moduleInternals._load = function (request: string, parent: unknown, isMain: boolean) {
  if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
  return originalLoad.call(this, request, parent, isMain);
};

const actions = await import("../../app/actions/subscription-change");
const { computeDepartureTime } = await import("../duration");

// --- Aides ------------------------------------------------------------------------------------

const ADMIN = "admin-1";
const OTHER_ADMIN = "admin-2";
const THIRD_ADMIN = "admin-3";
const EST = "etab-actif";
const DAY_MS = 24 * 60 * 60 * 1000;
let keyCounter = 0;
const key = () => `cle_${String(++keyCounter).padStart(12, "0")}`;

function reset(user?: Partial<typeof currentUser>) {
  db = freshDb();
  db.establishments.set(EST, { id: EST, status: "ACTIVE" });
  db.subscriptions.set(EST, { id: "sub-1", establishmentId: EST, currentPeriodEnd: new Date(Date.now() + 10 * DAY_MS) });
  currentUser = { id: ADMIN, isPlatformAdmin: true, permissions: null, ...user };
  txCalls = 0;
  forbiddenAccess = [];
  revalidated = [];
  failAuditCreate = false;
  failAuditAction = null;
  failPaymentCreate = false;
  failOnCreate = null;
  pendingRace = null;
  raceTriggered = false;
  abortedTx = false;
  beforeRequestUpdate = null;
  beforeSubscriptionUpdate = null;
  externalCommits = [];
}

const mpInput = (o: Record<string, unknown> = {}) => ({
  establishmentId: EST,
  amountFcfa: 5000,
  periodMonths: 3,
  reference: "Wave TX-892183",
  reason: "Règlement reçu en agence",
  idempotencyKey: key(),
  ...o,
});
const prInput = (o: Record<string, unknown> = {}) => ({
  establishmentId: EST,
  days: 30,
  reason: "Geste commercial",
  idempotencyKey: key(),
  ...o,
});

async function silently<T>(fn: () => Promise<T>): Promise<T> {
  const original = console.error;
  console.error = () => undefined;
  try {
    return await fn();
  } finally {
    console.error = original;
  }
}

function assertNothingWritten() {
  assert.equal(db.requests.length, 0, "aucune demande créée");
  assert.equal(db.audits.length, 0, "aucun audit écrit");
  assert.deepEqual(forbiddenAccess, [], "aucun accès interdit aux règlements");
  assert.equal(db.payments.length, 0, "aucun règlement créé");
  assert.equal(db.subscriptions.size, 1, "aucun abonnement créé");
}

// --- Permissions ------------------------------------------------------------------------------

test("permissions : compte non administrateur de plateforme refusé, sans aucun accès à la base", async () => {
  reset({ isPlatformAdmin: false, permissions: null });
  for (const run of [() => actions.requestManualPayment(mpInput()), () => actions.requestProlongation(prInput())]) {
    const result = await run();
    assert.match(result.error ?? "", /Action refusée/);
    assert.equal(result.requestId, undefined);
  }
  assert.equal(txCalls, 0);
  assertNothingWritten();
});

test("permissions : listes vides, vides en apparence, insuffisantes ou absentes refusées", async () => {
  for (const permissions of [undefined, "", " ", "[]", ",", " , ", '["PLATFORM_DASHBOARD"]', "PLATFORM_USERS", '["PLATFORM_SUBSCRIPTION"]', "[1]"]) {
    reset({ permissions });
    const a = await actions.requestManualPayment(mpInput());
    const b = await actions.requestProlongation(prInput());
    assert.match(a.error ?? "", /Action refusée/, JSON.stringify(permissions));
    assert.match(b.error ?? "", /Action refusée/, JSON.stringify(permissions));
    assert.equal(txCalls, 0, JSON.stringify(permissions));
    assertNothingWritten();
  }
});

test("permissions explicites autorisées et NULL canonique acceptés", async () => {
  for (const permissions of [null, '["PLATFORM_SUBSCRIPTION' + 'S"]', '["PLATFORM_ALL"]', '["ALL"]', "PLATFORM_SUBSCRIPTIONS", '["PLATFORM_DASHBOARD","PLATFORM_SUBSCRIPTIONS"]']) {
    reset({ permissions });
    const a = await actions.requestManualPayment(mpInput());
    assert.ok(a.requestId, `paiement manuel avec ${JSON.stringify(permissions)}`);
    const b = await actions.requestProlongation(prInput());
    assert.ok(b.requestId, `prolongation avec ${JSON.stringify(permissions)}`);
  }
});

test("le demandeur est l'identité de la session : les champs d'identité envoyés par le client sont ignorés", async () => {
  reset();
  const input = mpInput({
    requestedByUserId: "intrus",
    userId: "intrus",
    status: "APPROVED",
    decidedByUserId: "intrus",
    decidedAt: new Date(),
    appliedPaymentId: "pay-x",
    isPlatformAdmin: true,
    permissions: "ALL",
  });
  const result = await actions.requestManualPayment(input);
  assert.ok(result.requestId);
  const row = db.requests[0];
  assert.equal(row.requestedByUserId, ADMIN);
  assert.equal(row.status, "PENDING_SECOND_APPROVAL");
  assert.equal(row.decidedByUserId, null);
  assert.equal(row.decidedAt, null);
  assert.equal(row.appliedPaymentId, null);
  assert.equal(db.audits[0].userId, ADMIN);
});

// --- Validation -------------------------------------------------------------------------------

test("paiement manuel : entrées invalides refusées avant tout accès à la base", async () => {
  const bad: Record<string, unknown>[] = [
    { amountFcfa: 99 }, { amountFcfa: 10_000_001 }, { amountFcfa: 0 }, { amountFcfa: -100 }, { amountFcfa: 5000.5 },
    { amountFcfa: "5000" }, { amountFcfa: NaN }, { amountFcfa: null }, { amountFcfa: undefined }, { amountFcfa: Infinity },
    { periodMonths: 0 }, { periodMonths: 37 }, { periodMonths: 1.5 }, { periodMonths: "3" }, { periodMonths: null },
    { reference: "x".repeat(201) }, { reference: 123 }, { reference: {} }, { reference: "a\u0000b" },
    { reason: "x".repeat(501) }, { reason: ["x"] }, { reason: "a\u0000b" },
    { idempotencyKey: "court" }, { idempotencyKey: "a".repeat(65) }, { idempotencyKey: "cle avec espace 1234" }, { idempotencyKey: 123456789012345678 },
    { idempotencyKey: undefined }, { idempotencyKey: null },
    { establishmentId: "" }, { establishmentId: "   " }, { establishmentId: 12 }, { establishmentId: null }, { establishmentId: "e".repeat(65) },
    { establishmentId: undefined },
  ];
  for (const o of bad) {
    reset();
    const result = await actions.requestManualPayment(mpInput(o));
    assert.ok(result.error, `refus attendu pour ${JSON.stringify(o)}`);
    assert.equal(result.requestId, undefined);
    assert.equal(txCalls, 0, `aucune transaction pour ${JSON.stringify(o)}`);
    assertNothingWritten();
  }
  for (const input of [null, undefined, "texte", 42, [], [mpInput()]]) {
    reset();
    const result = await actions.requestManualPayment(input);
    assert.ok(result.error, `refus attendu pour ${JSON.stringify(input)}`);
    assert.equal(txCalls, 0);
  }
});

test("prolongation : entrées invalides refusées avant tout accès à la base", async () => {
  const bad: Record<string, unknown>[] = [
    { days: 0 }, { days: 367 }, { days: -1 }, { days: 1.5 }, { days: "30" }, { days: NaN }, { days: null }, { days: undefined }, { days: Infinity },
    { reason: "x".repeat(501) }, { reason: 5 }, { idempotencyKey: "court" }, { idempotencyKey: "a".repeat(65) }, { idempotencyKey: "é".repeat(20) },
    { establishmentId: "" }, { establishmentId: 7 }, { establishmentId: undefined },
  ];
  for (const o of bad) {
    reset();
    const result = await actions.requestProlongation(prInput(o));
    assert.ok(result.error, `refus attendu pour ${JSON.stringify(o)}`);
    assert.equal(txCalls, 0, `aucune transaction pour ${JSON.stringify(o)}`);
    assertNothingWritten();
  }
  for (const input of [null, undefined, "texte", [], 3]) {
    reset();
    assert.ok((await actions.requestProlongation(input)).error);
    assert.equal(txCalls, 0);
  }
});

test("bornes valides acceptées et valeurs normalisées", async () => {
  for (const [amountFcfa, periodMonths] of [[100, 1], [10_000_000, 36]] as const) {
    reset();
    assert.ok((await actions.requestManualPayment(mpInput({ amountFcfa, periodMonths }))).requestId, `${amountFcfa}/${periodMonths}`);
  }
  for (const days of [1, 366]) {
    reset();
    assert.ok((await actions.requestProlongation(prInput({ days }))).requestId, `${days} jours`);
  }
  reset();
  await actions.requestManualPayment(mpInput({ reference: "  Wave TX-1  ", reason: "   " }));
  assert.equal(db.requests[0].reference, "Wave TX-1", "référence nettoyée");
  assert.equal(db.requests[0].reason, null, "motif de seuls espaces devient NULL");
  reset();
  await actions.requestManualPayment(mpInput({ reference: undefined, reason: null }));
  assert.equal(db.requests[0].reference, null);
  assert.equal(db.requests[0].reason, null);
  reset();
  await actions.requestManualPayment(mpInput({ reference: "x".repeat(200), reason: "y".repeat(500) }));
  assert.equal(db.requests.length, 1, "limites 200 et 500 incluses");
});

// --- Règles d'état ------------------------------------------------------------------------------

test("établissement absent, non actif ou sans abonnement : refus, aucune création d'abonnement ni de règlement", async () => {
  for (const status of ["PENDING", "SUSPENDED", "REJECTED"]) {
    reset();
    db.establishments.set("etab-x", { id: "etab-x", status });
    db.subscriptions.set("etab-x", { id: "sub-x", establishmentId: "etab-x" });
    const result = await actions.requestManualPayment(mpInput({ establishmentId: "etab-x" }));
    assert.match(result.error ?? "", /pas actif/, status);
    const result2 = await actions.requestProlongation(prInput({ establishmentId: "etab-x" }));
    assert.match(result2.error ?? "", /pas actif/, status);
    assert.equal(db.requests.length, 0, status);
    assert.equal(db.audits.length, 0, status);
    assert.deepEqual(forbiddenAccess, [], status);
    assert.equal(db.subscriptions.size, 2, "aucun abonnement créé");
  }
  reset();
  assert.match((await actions.requestManualPayment(mpInput({ establishmentId: "inexistant" }))).error ?? "", /introuvable/);
  assert.match((await actions.requestProlongation(prInput({ establishmentId: "inexistant" }))).error ?? "", /introuvable/);
  assertNothingWritten();

  reset();
  db.establishments.set("etab-sans-abo", { id: "etab-sans-abo", status: "ACTIVE" });
  const a = await actions.requestManualPayment(mpInput({ establishmentId: "etab-sans-abo" }));
  const b = await actions.requestProlongation(prInput({ establishmentId: "etab-sans-abo" }));
  assert.match(a.error ?? "", /pas d'abonnement/);
  assert.match(b.error ?? "", /pas d'abonnement/);
  assert.equal(db.subscriptions.has("etab-sans-abo"), false, "aucun abonnement créé automatiquement");
  assert.equal(db.requests.length, 0);
  assert.deepEqual(forbiddenAccess, []);
});

// --- Création correcte ---------------------------------------------------------------------------

test("paiement manuel : demande créée en attente, demandeur = session, audit dans la transaction, aucun effet", async () => {
  reset();
  const input = mpInput({ amountFcfa: 12_500, periodMonths: 6, reference: "OM-77", reason: "Espèces reçues" });
  const result = await actions.requestManualPayment(input);
  assert.deepEqual(Object.keys(result).sort(), ["replayed", "requestId"]);
  assert.equal(result.replayed, false);
  assert.equal(db.requests.length, 1);
  const row = db.requests[0];
  assert.equal(row.id, result.requestId);
  assert.deepEqual(
    {
      kind: row.kind, status: row.status, establishmentId: row.establishmentId, amountFcfa: row.amountFcfa,
      periodMonths: row.periodMonths, days: row.days, reference: row.reference, reason: row.reason,
      idempotencyKey: row.idempotencyKey, requestedByUserId: row.requestedByUserId,
      decidedByUserId: row.decidedByUserId, decidedAt: row.decidedAt, decisionReason: row.decisionReason, appliedPaymentId: row.appliedPaymentId,
    },
    {
      kind: "MANUAL_PAYMENT", status: "PENDING_SECOND_APPROVAL", establishmentId: EST, amountFcfa: 12_500,
      periodMonths: 6, days: null, reference: "OM-77", reason: "Espèces reçues",
      idempotencyKey: input.idempotencyKey, requestedByUserId: ADMIN,
      decidedByUserId: null, decidedAt: null, decisionReason: null, appliedPaymentId: null,
    },
  );
  assert.equal(db.audits.length, 1);
  const audit = db.audits[0];
  assert.equal(audit.action, "SUBSCRIPTION_CHANGE_REQUESTED");
  assert.equal(audit.entityType, "SubscriptionChangeRequest");
  assert.equal(audit.entityId, row.id);
  assert.equal(audit.userId, ADMIN);
  assert.equal(audit.establishmentId, EST);
  assert.deepEqual(audit.newValue, { kind: "MANUAL_PAYMENT", status: "PENDING_SECOND_APPROVAL", amountFcfa: 12_500, periodMonths: 6 });
  assert.ok(!JSON.stringify(audit).includes("OM-77") && !JSON.stringify(audit).includes("Espèces"), "ni référence ni motif libres dans l'audit");
  assert.deepEqual(forbiddenAccess, []);
  assert.equal(db.subscriptions.size, 1);
  assert.deepEqual(revalidated, ["/plateforme/abonnements"]);
});

test("prolongation : demande créée en jours, référence toujours NULL (champ client ignoré)", async () => {
  reset();
  const input = prInput({ days: 90, reference: "ne doit pas être conservée", amountFcfa: 9999, periodMonths: 12 });
  const result = await actions.requestProlongation(input);
  assert.equal(result.replayed, false);
  const row = db.requests[0];
  assert.deepEqual(
    { kind: row.kind, days: row.days, amountFcfa: row.amountFcfa, periodMonths: row.periodMonths, reference: row.reference, requestedByUserId: row.requestedByUserId, status: row.status },
    { kind: "PROLONGATION", days: 90, amountFcfa: null, periodMonths: null, reference: null, requestedByUserId: ADMIN, status: "PENDING_SECOND_APPROVAL" },
  );
  assert.deepEqual(db.audits[0].newValue, { kind: "PROLONGATION", status: "PENDING_SECOND_APPROVAL", days: 90 });
  assert.deepEqual(forbiddenAccess, []);
});

// --- Idempotence ---------------------------------------------------------------------------------

test("idempotence : même clé et même contenu → demande existante renvoyée, aucune nouvelle ligne ni audit", async () => {
  reset();
  const input = mpInput();
  const first = await actions.requestManualPayment(input);
  const second = await actions.requestManualPayment({ ...input });
  assert.equal(first.replayed, false);
  assert.equal(second.replayed, true);
  assert.equal(second.requestId, first.requestId);
  assert.equal(db.requests.length, 1);
  assert.equal(db.audits.length, 1);
  // Contenu égal une fois normalisé (espaces autour des textes).
  const third = await actions.requestManualPayment({ ...input, reference: `  ${input.reference}  `, reason: ` ${input.reason} ` });
  assert.equal(third.replayed, true);
  assert.equal(third.requestId, first.requestId);
  assert.equal(db.requests.length, 1);

  const p = prInput();
  const p1 = await actions.requestProlongation(p);
  const p2 = await actions.requestProlongation(p);
  assert.equal(p2.replayed, true);
  assert.equal(p2.requestId, p1.requestId);
  assert.equal(db.requests.length, 2);
});

test("idempotence : le rejeu renvoie la demande même si son statut a changé ou si l'établissement n'est plus actif", async () => {
  reset();
  const input = mpInput();
  const first = await actions.requestManualPayment(input);
  db.requests[0].status = "APPROVED";
  const establishment = db.establishments.get(EST);
  if (establishment) establishment.status = "SUSPENDED";
  const replay = await actions.requestManualPayment(input);
  assert.equal(replay.replayed, true);
  assert.equal(replay.requestId, first.requestId);
  assert.equal(db.requests.length, 1);
  assert.equal(db.requests[0].status, "APPROVED", "le statut n'est pas modifié par un rejeu");
});

test("idempotence : même clé avec un contenu différent → refus, aucune écriture", async () => {
  const variants: [string, Record<string, unknown>][] = [
    ["montant", { amountFcfa: 6000 }],
    ["mois", { periodMonths: 4 }],
    ["référence", { reference: "autre" }],
    ["référence retirée", { reference: null }],
    ["motif", { reason: "autre motif" }],
    ["établissement", { establishmentId: "etab-2" }],
  ];
  for (const [label, override] of variants) {
    reset();
    db.establishments.set("etab-2", { id: "etab-2", status: "ACTIVE" });
    db.subscriptions.set("etab-2", { id: "sub-2", establishmentId: "etab-2" });
    const input = mpInput();
    await actions.requestManualPayment(input);
    const conflict = await actions.requestManualPayment({ ...input, ...override });
    assert.match(conflict.error ?? "", /déjà été utilisée/, label);
    assert.equal(conflict.requestId, undefined, label);
    assert.equal(db.requests.length, 1, label);
    assert.equal(db.audits.length, 1, label);
  }
  // Même clé, type différent (paiement puis prolongation) → refus.
  reset();
  const k = key();
  await actions.requestManualPayment(mpInput({ idempotencyKey: k }));
  const crossKind = await actions.requestProlongation(prInput({ idempotencyKey: k }));
  assert.match(crossKind.error ?? "", /déjà été utilisée/);
  assert.equal(db.requests.length, 1);
  // Prolongation : jours différents.
  reset();
  const pr = prInput();
  await actions.requestProlongation(pr);
  assert.match((await actions.requestProlongation({ ...pr, days: 31 })).error ?? "", /déjà été utilisée/);
});

test("idempotence : la clé est propre au demandeur (même clé, autre administrateur → nouvelle demande)", async () => {
  reset();
  const input = mpInput();
  const first = await actions.requestManualPayment(input);
  currentUser = { id: OTHER_ADMIN, isPlatformAdmin: true, permissions: null };
  const second = await actions.requestManualPayment(input);
  assert.equal(second.replayed, false);
  assert.notEqual(second.requestId, first.requestId);
  assert.deepEqual(db.requests.map((r) => r.requestedByUserId).sort(), [ADMIN, OTHER_ADMIN]);
});

test("collision d'unicité P2002 : contenu identique → demande de l'autre transaction renvoyée par une lecture indépendante", async () => {
  reset();
  const input = mpInput();
  pendingRace = {
    id: "req-concurrent",
    establishmentId: EST,
    kind: "MANUAL_PAYMENT",
    status: "PENDING_SECOND_APPROVAL",
    amountFcfa: input.amountFcfa,
    periodMonths: input.periodMonths,
    days: null,
    reference: input.reference,
    reason: input.reason,
    idempotencyKey: input.idempotencyKey,
    requestedByUserId: ADMIN,
    decidedByUserId: null,
    decidedAt: null,
    decisionReason: null,
    appliedPaymentId: null,
  };
  const result = await actions.requestManualPayment(input);
  assert.deepEqual(result, { requestId: "req-concurrent", replayed: true });
  assert.equal(db.requests.length, 1, "une seule demande : celle de l'autre transaction");
  assert.equal(db.audits.length, 0, "l'audit de la transaction échouée est annulé");
  assert.equal(txCalls, 1, "la transaction échouée n'est pas rejouée ni réutilisée");
});

test("collision d'unicité P2002 : contenu différent → refus (conflit), pas d'écriture supplémentaire", async () => {
  reset();
  const input = mpInput();
  pendingRace = {
    id: "req-concurrent", establishmentId: EST, kind: "MANUAL_PAYMENT", status: "PENDING_SECOND_APPROVAL",
    amountFcfa: 7777, periodMonths: 3, days: null, reference: null, reason: null, idempotencyKey: input.idempotencyKey,
    requestedByUserId: ADMIN, decidedByUserId: null, decidedAt: null, decisionReason: null, appliedPaymentId: null,
  };
  const result = await actions.requestManualPayment(input);
  assert.match(result.error ?? "", /déjà été utilisée/);
  assert.equal(result.requestId, undefined);
  assert.equal(db.requests.length, 1);
  assert.equal(db.requests[0].id, "req-concurrent");
  assert.equal(db.audits.length, 0);
});

test("collision d'unicité P2002 sans demande retrouvée : l'erreur reste une erreur, jamais un succès", async () => {
  reset();
  failOnCreate = new UniqueViolation("collision sans ligne correspondante");
  const result = await silently(() => actions.requestManualPayment(mpInput()));
  assert.ok(result.error);
  assert.equal(result.requestId, undefined);
  assert.equal(result.replayed, undefined);
  assert.equal(db.requests.length, 0);
  assert.equal(db.audits.length, 0);
});

// --- Atomicité et erreurs inattendues ---------------------------------------------------------------

test("échec de l'audit : la demande n'est pas conservée (aucune écriture partielle)", async () => {
  reset();
  failAuditCreate = true;
  const result = await silently(() => actions.requestManualPayment(mpInput()));
  assert.match(result.error ?? "", /Une erreur est survenue/);
  assert.equal(result.requestId, undefined);
  assertNothingWritten();
  assert.deepEqual(revalidated, [], "aucune revalidation après un échec");
});

test("erreur inattendue à la création : message générique, aucune écriture, jamais présentée comme un succès", async () => {
  reset();
  failOnCreate = new Error("panne simulée");
  const a = await silently(() => actions.requestProlongation(prInput()));
  assert.match(a.error ?? "", /Une erreur est survenue/);
  assert.equal(a.requestId, undefined);
  assertNothingWritten();
  assert.deepEqual(revalidated, []);
});

// =================================================================================================
// B2.13-B — DÉCISIONS : approbation, rejet, annulation
// =================================================================================================

function seedRequest(o: Partial<RequestRow> = {}): RequestRow {
  const row: RequestRow = {
    id: `req-seed-${++seq}`,
    establishmentId: EST,
    kind: "MANUAL_PAYMENT",
    status: "PENDING_SECOND_APPROVAL",
    amountFcfa: 5000,
    periodMonths: 3,
    days: null,
    reference: "Wave TX-1",
    reason: "Règlement reçu en agence",
    idempotencyKey: key(),
    requestedByUserId: ADMIN,
    decidedByUserId: null,
    decidedAt: null,
    decisionReason: null,
    appliedPaymentId: null,
    ...o,
  };
  assert.equal(checkViolation(row), null, "la ligne de départ respecte les contraintes de la base");
  db.requests.push(row);
  return row;
}
const seedProlongation = (o: Partial<RequestRow> = {}) =>
  seedRequest({ kind: "PROLONGATION", amountFcfa: null, periodMonths: null, days: 30, reference: null, ...o });

const asUser = (id: string, permissions: string | null | undefined = null) => {
  currentUser = { id, isPlatformAdmin: true, permissions };
};
const requestById = (id: string) => db.requests.find((r) => r.id === id);
const subscriptionEnd = () => db.subscriptions.get(EST)?.currentPeriodEnd;
const auditActions = () => db.audits.map((a) => a.action);

function assertRequestUntouched(row: RequestRow, expected: RequestRow) {
  assert.deepEqual(requestById(row.id), expected, "la demande n'a pas été modifiée");
}

// --- Permissions communes aux trois décisions -----------------------------------------------------

const DECISIONS: [string, (id: string) => Promise<{ error?: string; requestId?: string }>][] = [
  ["approuver", (id) => actions.approveSubscriptionChange({ requestId: id })],
  ["rejeter", (id) => actions.rejectSubscriptionChange({ requestId: id, reason: "Motif valide" })],
  ["annuler", (id) => actions.cancelSubscriptionChange({ requestId: id })],
];

test("décisions : compte non administrateur de plateforme refusé, sans aucun accès à la base", async () => {
  for (const [label, run] of DECISIONS) {
    reset({ id: OTHER_ADMIN, isPlatformAdmin: false, permissions: null });
    const req = seedRequest();
    const before = { ...req };
    const result = await run(req.id);
    assert.match(result.error ?? "", /Action refusée/, label);
    assert.equal(txCalls, 0, label);
    assertRequestUntouched(req, before);
    assert.equal(db.payments.length, 0);
    assert.equal(db.audits.length, 0);
  }
});

test("décisions : permission absente, liste vide ou insuffisante refusée", async () => {
  for (const permissions of [undefined, "", " ", "[]", ",", '["PLATFORM_DASHBOARD"]', "PLATFORM_USERS", "[1]"]) {
    for (const [label, run] of DECISIONS) {
      reset();
      currentUser = { id: OTHER_ADMIN, isPlatformAdmin: true, permissions };
      const req = seedRequest();
      const before = { ...req };
      const result = await run(req.id);
      assert.match(result.error ?? "", /Action refusée/, `${label} ${JSON.stringify(permissions)}`);
      assert.equal(txCalls, 0);
      assertRequestUntouched(req, before);
    }
  }
});

test("décisions : permissions explicites autorisées et NULL canonique acceptés (approbation)", async () => {
  for (const permissions of [null, '["PLATFORM_SUBSCRIPTIONS"]', '["PLATFORM_ALL"]', '["ALL"]', "PLATFORM_SUBSCRIPTIONS"]) {
    reset();
    asUser(OTHER_ADMIN, permissions);
    const req = seedRequest();
    const result = await actions.approveSubscriptionChange({ requestId: req.id });
    assert.deepEqual(result, { requestId: req.id }, JSON.stringify(permissions));
  }
});

test("décisions : requestId invalide refusé avant tout accès à la base", async () => {
  for (const requestId of [undefined, null, "", "   ", 5, {}, [], "x".repeat(65)]) {
    for (const [label, run] of [
      ["approuver", () => actions.approveSubscriptionChange({ requestId })],
      ["rejeter", () => actions.rejectSubscriptionChange({ requestId, reason: "Motif valide" })],
      ["annuler", () => actions.cancelSubscriptionChange({ requestId })],
    ] as const) {
      reset();
      asUser(OTHER_ADMIN);
      const result = await run();
      assert.ok(result.error, `${label} ${JSON.stringify(requestId)}`);
      assert.equal(txCalls, 0);
    }
  }
  for (const input of [null, undefined, "texte", 3, [], ["a"]]) {
    reset();
    asUser(OTHER_ADMIN);
    assert.ok((await actions.approveSubscriptionChange(input)).error);
    assert.ok((await actions.rejectSubscriptionChange(input)).error);
    assert.ok((await actions.cancelSubscriptionChange(input)).error);
    assert.equal(txCalls, 0);
  }
});

test("décisions : demande inexistante", async () => {
  reset();
  asUser(OTHER_ADMIN);
  for (const [, run] of DECISIONS) {
    const result = await run("req-inconnue");
    assert.match(result.error ?? "", /Demande introuvable/);
  }
  assert.equal(db.audits.length, 0);
});

// --- Approbation ---------------------------------------------------------------------------------

test("approbation d'un paiement manuel : règlement confirmé créé, demande approuvée, échéance prolongée, audits écrits", async () => {
  reset();
  const req = seedRequest();
  const oldEnd = subscriptionEnd();
  assert.ok(oldEnd);
  asUser(OTHER_ADMIN);

  const result = await actions.approveSubscriptionChange({ requestId: req.id });
  assert.deepEqual(result, { requestId: req.id });

  const expectedEnd = computeDepartureTime(oldEnd, 3, "MONTH");
  assert.equal(db.payments.length, 1);
  const payment = db.payments[0];
  assert.deepEqual(
    {
      subscriptionId: payment.subscriptionId, amount: payment.amount, periodMonths: payment.periodMonths,
      reference: payment.reference, status: payment.status, confirmedByUserId: payment.confirmedByUserId,
    },
    { subscriptionId: "sub-1", amount: 5000, periodMonths: 3, reference: "Wave TX-1", status: "CONFIRMED", confirmedByUserId: OTHER_ADMIN },
  );
  assert.equal((payment.periodStartedAt as Date).getTime(), oldEnd.getTime(), "l'échéance future est le point de départ");
  assert.equal((payment.periodEndedAt as Date).getTime(), expectedEnd.getTime());
  assert.ok(payment.confirmedAt instanceof Date);
  assert.equal(subscriptionEnd()?.getTime(), expectedEnd.getTime());

  const row = requestById(req.id);
  assert.equal(row?.status, "APPROVED");
  assert.equal(row?.decidedByUserId, OTHER_ADMIN);
  assert.ok(row?.decidedAt instanceof Date);
  assert.equal(row?.appliedPaymentId, payment.id);
  assert.equal(row?.requestedByUserId, ADMIN, "le demandeur n'est pas modifié");

  assert.deepEqual(auditActions(), ["SUBSCRIPTION_PAYMENT_MANUAL_RECORDED", "SUBSCRIPTION_CHANGE_APPROVED"]);
  for (const audit of db.audits) {
    assert.equal(audit.userId, OTHER_ADMIN);
    assert.equal(audit.establishmentId, EST);
  }
  assert.match(String(db.audits[0].reason), /5000 FCFA \(3 mois\)/);
  assert.equal(db.audits[1].entityId, req.id);
  const text = JSON.stringify(db.audits);
  assert.ok(!text.includes("Wave TX-1") && !text.includes("Règlement reçu"), "ni référence ni motif libres dans les audits");
  assert.deepEqual(revalidated, ["/plateforme/abonnements"]);
  assert.deepEqual(forbiddenAccess, []);
  assert.equal(db.subscriptions.size, 1, "aucun abonnement créé");
});

test("approbation : abonnement expiré → point de départ = instant présent", async () => {
  reset();
  const expired = db.subscriptions.get(EST);
  if (expired) expired.currentPeriodEnd = new Date(Date.now() - 40 * DAY_MS);
  const req = seedRequest({ periodMonths: 6 });
  asUser(OTHER_ADMIN);
  const before = Date.now();
  const result = await actions.approveSubscriptionChange({ requestId: req.id });
  const after = Date.now();
  assert.deepEqual(result, { requestId: req.id });
  const payment = db.payments[0];
  const start = (payment.periodStartedAt as Date).getTime();
  assert.ok(start >= before && start <= after, "départ = maintenant");
  assert.equal((payment.periodEndedAt as Date).getTime(), computeDepartureTime(new Date(start), 6, "MONTH").getTime());
  assert.equal(subscriptionEnd()?.getTime(), (payment.periodEndedAt as Date).getTime());
});

test("approbation d'une prolongation : jours de 24 h ajoutés, aucun règlement créé", async () => {
  for (const days of [1, 30, 366]) {
    reset();
    const req = seedProlongation({ days, reason: "Geste commercial" });
    const oldEnd = subscriptionEnd();
    assert.ok(oldEnd);
    asUser(OTHER_ADMIN);
    const result = await actions.approveSubscriptionChange({ requestId: req.id });
    assert.deepEqual(result, { requestId: req.id }, `${days} jours`);
    assert.equal(subscriptionEnd()?.getTime(), oldEnd.getTime() + days * DAY_MS, `${days} jours`);
    assert.equal(db.payments.length, 0, "aucun règlement pour une prolongation");
    const row = requestById(req.id);
    assert.equal(row?.status, "APPROVED");
    assert.equal(row?.appliedPaymentId, null);
    assert.deepEqual(auditActions(), ["SUBSCRIPTION_PROLONGED", "SUBSCRIPTION_CHANGE_APPROVED"]);
    assert.equal(db.audits[0].entityType, "Subscription");
    assert.equal(db.audits[0].entityId, "sub-1");
    assert.equal((db.audits[0].newValue as { daysAdded: number }).daysAdded, days);
    assert.ok(!JSON.stringify(db.audits).includes("Geste commercial"), "pas de motif libre dans les audits");
  }
});

test("approbation : référence absente → référence historique du règlement", async () => {
  reset();
  const req = seedRequest({ reference: null });
  asUser(OTHER_ADMIN);
  await actions.approveSubscriptionChange({ requestId: req.id });
  assert.equal(db.payments[0].reference, "Paiement direct (Saisie Admin)");
});

test("approbation : l'identité et les champs envoyés par le client sont ignorés", async () => {
  reset();
  const req = seedRequest();
  asUser(OTHER_ADMIN);
  const result = await actions.approveSubscriptionChange({
    requestId: req.id,
    decidedByUserId: "intrus",
    userId: "intrus",
    status: "REJECTED",
    appliedPaymentId: "pay-x",
    amountFcfa: 1,
    periodMonths: 36,
  });
  assert.deepEqual(result, { requestId: req.id });
  const row = requestById(req.id);
  assert.equal(row?.status, "APPROVED");
  assert.equal(row?.decidedByUserId, OTHER_ADMIN);
  assert.equal(db.payments[0].amount, 5000, "le montant gelé de la demande est utilisé, pas celui du client");
  assert.equal(db.payments[0].periodMonths, 3);
});

test("approbation : auto-approbation refusée, demande intacte", async () => {
  reset();
  const req = seedRequest();
  const before = { ...req };
  const end = subscriptionEnd()?.getTime();
  asUser(ADMIN);
  const result = await actions.approveSubscriptionChange({ requestId: req.id });
  assert.match(result.error ?? "", /votre propre demande/);
  assertRequestUntouched(req, before);
  assert.equal(db.payments.length, 0);
  assert.equal(db.audits.length, 0);
  assert.equal(subscriptionEnd()?.getTime(), end);
});

test("approbation : demande sans demandeur (NULL) jamais approuvable, même par un administrateur autorisé", async () => {
  reset();
  const req = seedRequest({ requestedByUserId: null });
  const before = { ...req };
  asUser(OTHER_ADMIN);
  const result = await actions.approveSubscriptionChange({ requestId: req.id });
  assert.match(result.error ?? "", /n'a plus de demandeur/);
  assertRequestUntouched(req, before);
  assert.equal(db.payments.length, 0);
  assert.equal(db.audits.length, 0);
});

test("approbation : établissement absent ou non actif refusé, demande et abonnement intacts", async () => {
  for (const status of ["PENDING", "SUSPENDED", "REJECTED"]) {
    reset();
    const establishment = db.establishments.get(EST);
    if (establishment) establishment.status = status;
    const req = seedRequest();
    const before = { ...req };
    const end = subscriptionEnd()?.getTime();
    asUser(OTHER_ADMIN);
    const result = await actions.approveSubscriptionChange({ requestId: req.id });
    assert.match(result.error ?? "", /pas actif/, status);
    assertRequestUntouched(req, before);
    assert.equal(db.payments.length, 0);
    assert.equal(subscriptionEnd()?.getTime(), end);
  }
  reset();
  const orphan = seedRequest({ establishmentId: "etab-disparu" });
  asUser(OTHER_ADMIN);
  assert.match((await actions.approveSubscriptionChange({ requestId: orphan.id })).error ?? "", /introuvable/);
  assert.equal(db.payments.length, 0);
});

test("approbation : abonnement absent refusé, AUCUN abonnement créé", async () => {
  reset();
  db.subscriptions.clear();
  const req = seedRequest();
  const before = { ...req };
  asUser(OTHER_ADMIN);
  const result = await actions.approveSubscriptionChange({ requestId: req.id });
  assert.match(result.error ?? "", /pas d'abonnement/);
  assert.equal(db.subscriptions.size, 0, "aucun abonnement créé automatiquement");
  assertRequestUntouched(req, before);
  assert.equal(db.payments.length, 0);
  assert.equal(db.audits.length, 0);
});

test("approbation : demande déjà traitée refusée (approuvée, rejetée, annulée), rien n'est modifié", async () => {
  const processed: [string, Partial<RequestRow>][] = [
    ["APPROVED", { status: "APPROVED", decidedByUserId: THIRD_ADMIN, decidedAt: new Date(), appliedPaymentId: "pay-ancien" }],
    ["REJECTED", { status: "REJECTED", decidedByUserId: THIRD_ADMIN, decidedAt: new Date(), decisionReason: "Refus" }],
    ["CANCELLED", { status: "CANCELLED", decidedByUserId: ADMIN, decidedAt: new Date() }],
  ];
  for (const [status, patch] of processed) {
    reset();
    const req = seedRequest(patch);
    const before = { ...req };
    const end = subscriptionEnd()?.getTime();
    asUser(OTHER_ADMIN);
    const result = await actions.approveSubscriptionChange({ requestId: req.id });
    assert.match(result.error ?? "", new RegExp(`déjà été traitée \\(statut actuel : ${status}\\)`), status);
    assertRequestUntouched(req, before);
    assert.equal(db.payments.length, 0);
    assert.equal(subscriptionEnd()?.getTime(), end);
  }
});

test("approbation : deux approbations successives → une seule application (aucun double règlement ni double prolongation)", async () => {
  reset();
  const req = seedRequest();
  asUser(OTHER_ADMIN);
  const first = await actions.approveSubscriptionChange({ requestId: req.id });
  const endAfterFirst = subscriptionEnd()?.getTime();
  asUser(THIRD_ADMIN);
  const second = await actions.approveSubscriptionChange({ requestId: req.id });
  assert.deepEqual(first, { requestId: req.id });
  assert.match(second.error ?? "", /déjà été traitée/);
  assert.equal(db.payments.length, 1);
  assert.equal(subscriptionEnd()?.getTime(), endAfterFirst);
  assert.equal(requestById(req.id)?.decidedByUserId, OTHER_ADMIN, "la première décision est conservée");
});

test("approbation : valeurs gelées invalides ou incohérentes refusées sans effet", async () => {
  const invalid: Partial<RequestRow>[] = [
    { amountFcfa: 99 },
    { amountFcfa: 10_000_001 },
    { amountFcfa: null },
    { periodMonths: 0 },
    { periodMonths: 37 },
    { days: 5 }, // un paiement manuel ne porte pas de jours
    { kind: "AUTRE" },
  ];
  for (const patch of invalid) {
    reset();
    const req = seedRequest(patch);
    const before = { ...req };
    asUser(OTHER_ADMIN);
    const result = await actions.approveSubscriptionChange({ requestId: req.id });
    assert.match(result.error ?? "", /valeurs invalides/, JSON.stringify(patch));
    assertRequestUntouched(req, before);
    assert.equal(db.payments.length, 0);
    assert.equal(db.audits.length, 0);
  }
  for (const patch of [{ days: 0 }, { days: 367 }, { days: null }, { amountFcfa: 5000 }, { periodMonths: 3 }] as Partial<RequestRow>[]) {
    reset();
    const req = seedProlongation(patch);
    const before = { ...req };
    asUser(OTHER_ADMIN);
    const result = await actions.approveSubscriptionChange({ requestId: req.id });
    assert.match(result.error ?? "", /valeurs invalides/, JSON.stringify(patch));
    assertRequestUntouched(req, before);
    assert.equal(db.audits.length, 0);
  }
});

test("approbation : les règlements historiques ne sont ni modifiés ni supprimés", async () => {
  reset();
  const historical: PaymentRow[] = [
    { id: "pay-h1", subscriptionId: "sub-1", amount: 9900, periodMonths: 3, status: "CONFIRMED", reference: "H1" },
    { id: "pay-h2", subscriptionId: "sub-1", amount: 9900, periodMonths: 3, status: "PENDING", reference: null },
  ];
  db.payments.push(...historical.map((p) => ({ ...p })));
  const req = seedRequest();
  asUser(OTHER_ADMIN);
  await actions.approveSubscriptionChange({ requestId: req.id });
  assert.deepEqual(db.payments.slice(0, 2), historical);
  assert.equal(db.payments.length, 3);
  assert.deepEqual(forbiddenAccess, [], "aucune modification ni suppression de règlement tentée");
});

test("approbation : mise à jour conditionnelle perdue (annulation validée entre-temps) → tout est annulé", async () => {
  reset();
  const req = seedRequest();
  const end = subscriptionEnd()?.getTime();
  asUser(OTHER_ADMIN);
  beforeRequestUpdate = () =>
    externalCommit(() => {
      const row = requestById(req.id);
      if (row) Object.assign(row, { status: "CANCELLED", decidedByUserId: ADMIN, decidedAt: new Date() });
    });
  const result = await actions.approveSubscriptionChange({ requestId: req.id });
  assert.match(result.error ?? "", /traitée par quelqu'un d'autre/);
  assert.equal(requestById(req.id)?.status, "CANCELLED", "seule l'autre décision subsiste");
  assert.equal(db.payments.length, 0, "le règlement créé dans la transaction est annulé");
  assert.equal(subscriptionEnd()?.getTime(), end);
  assert.equal(db.audits.length, 0);
  assert.deepEqual(revalidated, []);
});

test("approbation : rejet validé entre-temps → l'approbation échoue, le rejet subsiste", async () => {
  reset();
  const req = seedProlongation();
  const end = subscriptionEnd()?.getTime();
  asUser(OTHER_ADMIN);
  beforeRequestUpdate = () =>
    externalCommit(() => {
      const row = requestById(req.id);
      if (row) Object.assign(row, { status: "REJECTED", decidedByUserId: THIRD_ADMIN, decidedAt: new Date(), decisionReason: "Refus" });
    });
  const result = await actions.approveSubscriptionChange({ requestId: req.id });
  assert.match(result.error ?? "", /traitée par quelqu'un d'autre/);
  assert.equal(requestById(req.id)?.status, "REJECTED");
  assert.equal(subscriptionEnd()?.getTime(), end);
  assert.equal(db.audits.length, 0);
});

test("approbation : demandeur supprimé entre la lecture et l'écriture → refusé (NULL jamais approuvable)", async () => {
  reset();
  const req = seedRequest();
  asUser(OTHER_ADMIN);
  beforeRequestUpdate = () =>
    externalCommit(() => {
      const row = requestById(req.id);
      if (row) row.requestedByUserId = null;
    });
  const result = await actions.approveSubscriptionChange({ requestId: req.id });
  assert.match(result.error ?? "", /traitée par quelqu'un d'autre/);
  assert.equal(requestById(req.id)?.status, "PENDING_SECOND_APPROVAL");
  assert.equal(db.payments.length, 0);
  assert.equal(db.audits.length, 0);
});

test("approbation : conflit de verrou optimiste sur l'abonnement → demande, règlement et audits annulés", async () => {
  for (const make of [() => seedRequest(), () => seedProlongation()]) {
    reset();
    const req = make();
    const oldEnd = subscriptionEnd();
    assert.ok(oldEnd);
    const concurrentEnd = new Date(oldEnd.getTime() + 5 * DAY_MS);
    asUser(OTHER_ADMIN);
    beforeSubscriptionUpdate = () =>
      externalCommit(() => {
        const sub = db.subscriptions.get(EST);
        if (sub) sub.currentPeriodEnd = concurrentEnd;
      });
    const result = await actions.approveSubscriptionChange({ requestId: req.id });
    assert.match(result.error ?? "", /modifié entre-temps/, req.kind);
    assert.equal(requestById(req.id)?.status, "PENDING_SECOND_APPROVAL", "la demande redevient en attente");
    assert.equal(requestById(req.id)?.appliedPaymentId, null);
    assert.equal(db.payments.length, 0);
    assert.equal(db.audits.length, 0);
    assert.equal(subscriptionEnd()?.getTime(), concurrentEnd.getTime(), "l'autre modification est conservée, jamais écrasée");
  }
});

test("approbation : échec d'une écriture ou d'un audit → aucune modification partielle persistante", async () => {
  const scenarios: [string, () => void][] = [
    ["audit de décision", () => (failAuditAction = "SUBSCRIPTION_CHANGE_APPROVED")],
    ["audit métier du règlement", () => (failAuditAction = "SUBSCRIPTION_PAYMENT_MANUAL_RECORDED")],
    ["création du règlement", () => (failPaymentCreate = true)],
  ];
  for (const [label, arm] of scenarios) {
    reset();
    const req = seedRequest();
    const before = { ...req };
    const end = subscriptionEnd()?.getTime();
    asUser(OTHER_ADMIN);
    arm();
    const result = await silently(() => actions.approveSubscriptionChange({ requestId: req.id }));
    assert.match(result.error ?? "", /Une erreur est survenue pendant l'approbation/, label);
    assert.equal(result.requestId, undefined, label);
    assertRequestUntouched(req, before);
    assert.equal(db.payments.length, 0, label);
    assert.equal(db.audits.length, 0, label);
    assert.equal(subscriptionEnd()?.getTime(), end, label);
    assert.deepEqual(revalidated, [], label);
  }
  reset();
  const pr = seedProlongation();
  const prBefore = { ...pr };
  const prEnd = subscriptionEnd()?.getTime();
  asUser(OTHER_ADMIN);
  failAuditAction = "SUBSCRIPTION_PROLONGED";
  const result = await silently(() => actions.approveSubscriptionChange({ requestId: pr.id }));
  assert.match(result.error ?? "", /Une erreur est survenue/);
  assertRequestUntouched(pr, prBefore);
  assert.equal(subscriptionEnd()?.getTime(), prEnd);
  assert.equal(db.audits.length, 0);
});

// --- Rejet ---------------------------------------------------------------------------------------

test("rejet : motif valide accepté, décideur et date enregistrés, motif dans la demande et pas dans l'audit", async () => {
  reset();
  const req = seedRequest();
  const end = subscriptionEnd()?.getTime();
  asUser(OTHER_ADMIN);
  const result = await actions.rejectSubscriptionChange({ requestId: req.id, reason: "  Paiement non reçu sur le compte  " });
  assert.deepEqual(result, { requestId: req.id });
  const row = requestById(req.id);
  assert.equal(row?.status, "REJECTED");
  assert.equal(row?.decidedByUserId, OTHER_ADMIN);
  assert.ok(row?.decidedAt instanceof Date);
  assert.equal(row?.decisionReason, "Paiement non reçu sur le compte");
  assert.equal(row?.appliedPaymentId, null);
  assert.deepEqual(auditActions(), ["SUBSCRIPTION_CHANGE_REJECTED"]);
  assert.equal(db.audits[0].userId, OTHER_ADMIN);
  assert.equal(db.audits[0].reason, null);
  assert.ok(!JSON.stringify(db.audits).includes("Paiement non reçu"), "motif libre absent de l'audit");
  assert.equal(db.payments.length, 0);
  assert.equal(subscriptionEnd()?.getTime(), end, "un rejet ne prolonge rien");
  assert.deepEqual(revalidated, ["/plateforme/abonnements"]);
});

test("rejet : motif absent, vide, composé d'espaces, trop long ou non textuel refusé avant tout accès à la base", async () => {
  const invalid: unknown[] = [undefined, null, "", "   ", "\t\n", "   ", 5, {}, ["x"], "x".repeat(501), "a\u0000b"];
  for (const reason of invalid) {
    reset();
    const req = seedRequest();
    const before = { ...req };
    asUser(OTHER_ADMIN);
    const result = await actions.rejectSubscriptionChange({ requestId: req.id, reason });
    assert.ok(result.error, JSON.stringify(reason));
    assert.equal(txCalls, 0, JSON.stringify(reason));
    assertRequestUntouched(req, before);
  }
  reset();
  const ok = seedRequest();
  asUser(OTHER_ADMIN);
  assert.deepEqual(await actions.rejectSubscriptionChange({ requestId: ok.id, reason: "x".repeat(500) }), { requestId: ok.id });
});

test("rejet : auto-rejet refusé (le demandeur peut annuler)", async () => {
  reset();
  const req = seedRequest();
  const before = { ...req };
  asUser(ADMIN);
  const result = await actions.rejectSubscriptionChange({ requestId: req.id, reason: "Motif valide" });
  assert.match(result.error ?? "", /votre propre demande/);
  assert.match(result.error ?? "", /annuler/);
  assertRequestUntouched(req, before);
  assert.equal(db.audits.length, 0);
});

test("rejet : demande sans demandeur (NULL) rejetable par un administrateur autorisé avec motif, jamais approuvable ni annulable", async () => {
  reset();
  const req = seedRequest({ requestedByUserId: null });
  const before = { ...req };
  asUser(OTHER_ADMIN, '["PLATFORM_DASHBOARD"]');
  assert.match((await actions.rejectSubscriptionChange({ requestId: req.id, reason: "Motif valide" })).error ?? "", /Action refusée/, "sans permission explicite");
  assertRequestUntouched(req, before);

  asUser(OTHER_ADMIN, '["PLATFORM_SUBSCRIPTIONS"]');
  assert.match((await actions.rejectSubscriptionChange({ requestId: req.id, reason: "   " })).error ?? "", /motif/i, "motif obligatoire");
  assertRequestUntouched(req, before);

  assert.match((await actions.approveSubscriptionChange({ requestId: req.id })).error ?? "", /n'a plus de demandeur/);
  assert.match((await actions.cancelSubscriptionChange({ requestId: req.id })).error ?? "", /n'a plus de demandeur/);
  assertRequestUntouched(req, before);
  assert.equal(db.audits.length, 0);

  const rejected = await actions.rejectSubscriptionChange({ requestId: req.id, reason: "Demandeur supprimé : demande close" });
  assert.deepEqual(rejected, { requestId: req.id });
  const row = requestById(req.id);
  assert.equal(row?.status, "REJECTED");
  assert.equal(row?.requestedByUserId, null);
  assert.equal(row?.decidedByUserId, OTHER_ADMIN);
  assert.equal(db.payments.length, 0);
});

test("rejet : demande déjà traitée refusée", async () => {
  for (const patch of [
    { status: "APPROVED", decidedByUserId: THIRD_ADMIN, decidedAt: new Date(), appliedPaymentId: "pay-ancien" },
    { status: "REJECTED", decidedByUserId: THIRD_ADMIN, decidedAt: new Date(), decisionReason: "Refus" },
    { status: "CANCELLED", decidedByUserId: ADMIN, decidedAt: new Date() },
  ] as Partial<RequestRow>[]) {
    reset();
    const req = seedRequest(patch);
    const before = { ...req };
    asUser(OTHER_ADMIN);
    const result = await actions.rejectSubscriptionChange({ requestId: req.id, reason: "Motif valide" });
    assert.match(result.error ?? "", /déjà été traitée/);
    assertRequestUntouched(req, before);
    assert.equal(db.audits.length, 0);
  }
});

test("rejet : deux décisions → une seule gagne (rejet puis rejet, rejet après approbation validée entre-temps)", async () => {
  reset();
  const req = seedRequest();
  asUser(OTHER_ADMIN);
  const first = await actions.rejectSubscriptionChange({ requestId: req.id, reason: "Premier motif" });
  asUser(THIRD_ADMIN);
  const second = await actions.rejectSubscriptionChange({ requestId: req.id, reason: "Second motif" });
  assert.deepEqual(first, { requestId: req.id });
  assert.match(second.error ?? "", /déjà été traitée/);
  assert.equal(requestById(req.id)?.decisionReason, "Premier motif");
  assert.equal(db.audits.length, 1);

  // Course contrôlée : une approbation est validée juste après notre lecture.
  reset();
  const raced = seedRequest();
  const end = subscriptionEnd()?.getTime();
  asUser(OTHER_ADMIN);
  beforeRequestUpdate = () =>
    externalCommit(() => {
      const row = requestById(raced.id);
      if (row) Object.assign(row, { status: "APPROVED", decidedByUserId: THIRD_ADMIN, decidedAt: new Date(), appliedPaymentId: "pay-externe" });
    });
  const lost = await actions.rejectSubscriptionChange({ requestId: raced.id, reason: "Motif valide" });
  assert.match(lost.error ?? "", /traitée par quelqu'un d'autre/);
  assert.equal(requestById(raced.id)?.status, "APPROVED");
  assert.equal(requestById(raced.id)?.decidedByUserId, THIRD_ADMIN);
  assert.equal(db.audits.length, 0);
  assert.equal(subscriptionEnd()?.getTime(), end);
});

test("rejet : échec de l'audit → demande inchangée", async () => {
  reset();
  const req = seedRequest();
  const before = { ...req };
  asUser(OTHER_ADMIN);
  failAuditAction = "SUBSCRIPTION_CHANGE_REJECTED";
  const result = await silently(() => actions.rejectSubscriptionChange({ requestId: req.id, reason: "Motif valide" }));
  assert.match(result.error ?? "", /Une erreur est survenue pendant le rejet/);
  assertRequestUntouched(req, before);
  assert.equal(db.audits.length, 0);
});

// --- Annulation ----------------------------------------------------------------------------------

test("annulation par le demandeur : acceptée, acteur et date enregistrés, motif facultatif normalisé", async () => {
  reset();
  const noReason = seedRequest();
  asUser(ADMIN);
  assert.deepEqual(await actions.cancelSubscriptionChange({ requestId: noReason.id }), { requestId: noReason.id });
  const row = requestById(noReason.id);
  assert.equal(row?.status, "CANCELLED");
  assert.equal(row?.decidedByUserId, ADMIN);
  assert.ok(row?.decidedAt instanceof Date);
  assert.equal(row?.decisionReason, null);
  assert.deepEqual(auditActions(), ["SUBSCRIPTION_CHANGE_CANCELLED"]);
  assert.equal(db.audits[0].userId, ADMIN);
  assert.equal(db.audits[0].reason, null);
  assert.equal(db.payments.length, 0);

  const withReason = seedRequest();
  assert.deepEqual(await actions.cancelSubscriptionChange({ requestId: withReason.id, reason: "  erreur de saisie  " }), { requestId: withReason.id });
  assert.equal(requestById(withReason.id)?.decisionReason, "erreur de saisie");
  assert.ok(!JSON.stringify(db.audits).includes("erreur de saisie"), "motif libre absent de l'audit");

  const blankReason = seedRequest();
  await actions.cancelSubscriptionChange({ requestId: blankReason.id, reason: "   " });
  assert.equal(requestById(blankReason.id)?.decisionReason, null, "motif d'espaces = absence de motif");
});

test("annulation : motif trop long ou non textuel refusé avant tout accès à la base", async () => {
  for (const reason of ["x".repeat(501), 5, {}, "a\u0000b"]) {
    reset();
    const req = seedRequest();
    const before = { ...req };
    asUser(ADMIN);
    const result = await actions.cancelSubscriptionChange({ requestId: req.id, reason });
    assert.ok(result.error, JSON.stringify(reason));
    assert.equal(txCalls, 0);
    assertRequestUntouched(req, before);
  }
});

test("annulation par un tiers refusée, y compris par un administrateur autorisé", async () => {
  reset();
  const req = seedRequest();
  const before = { ...req };
  for (const id of [OTHER_ADMIN, THIRD_ADMIN]) {
    asUser(id);
    const result = await actions.cancelSubscriptionChange({ requestId: req.id });
    assert.match(result.error ?? "", /Seul le demandeur/);
    assertRequestUntouched(req, before);
  }
  assert.equal(db.audits.length, 0);
});

test("annulation : demande sans demandeur (NULL) annulable par personne", async () => {
  reset();
  const req = seedRequest({ requestedByUserId: null });
  const before = { ...req };
  for (const id of [ADMIN, OTHER_ADMIN]) {
    asUser(id);
    assert.match((await actions.cancelSubscriptionChange({ requestId: req.id })).error ?? "", /n'a plus de demandeur/);
  }
  assertRequestUntouched(req, before);
  assert.equal(db.audits.length, 0);
});

test("annulation : demande déjà traitée refusée", async () => {
  for (const patch of [
    { status: "APPROVED", decidedByUserId: OTHER_ADMIN, decidedAt: new Date(), appliedPaymentId: "pay-ancien" },
    { status: "REJECTED", decidedByUserId: OTHER_ADMIN, decidedAt: new Date(), decisionReason: "Refus" },
    { status: "CANCELLED", decidedByUserId: ADMIN, decidedAt: new Date() },
  ] as Partial<RequestRow>[]) {
    reset();
    const req = seedRequest(patch);
    const before = { ...req };
    asUser(ADMIN);
    const result = await actions.cancelSubscriptionChange({ requestId: req.id });
    assert.match(result.error ?? "", /déjà été traitée/);
    assertRequestUntouched(req, before);
    assert.equal(db.audits.length, 0);
  }
});

test("annulation concurrente avec approbation ou rejet : une seule décision gagne (course contrôlée)", async () => {
  // L'approbation est validée juste après notre lecture : l'annulation perd.
  reset();
  const a = seedRequest();
  const end = subscriptionEnd()?.getTime();
  asUser(ADMIN);
  beforeRequestUpdate = () =>
    externalCommit(() => {
      const row = requestById(a.id);
      if (row) Object.assign(row, { status: "APPROVED", decidedByUserId: OTHER_ADMIN, decidedAt: new Date(), appliedPaymentId: "pay-externe" });
    });
  const lost = await actions.cancelSubscriptionChange({ requestId: a.id });
  assert.match(lost.error ?? "", /traitée par quelqu'un d'autre/);
  assert.equal(requestById(a.id)?.status, "APPROVED");
  assert.equal(requestById(a.id)?.decidedByUserId, OTHER_ADMIN);
  assert.equal(db.audits.length, 0);
  assert.equal(subscriptionEnd()?.getTime(), end);

  // Le rejet est validé juste après notre lecture : l'annulation perd.
  reset();
  const b = seedRequest();
  asUser(ADMIN);
  beforeRequestUpdate = () =>
    externalCommit(() => {
      const row = requestById(b.id);
      if (row) Object.assign(row, { status: "REJECTED", decidedByUserId: OTHER_ADMIN, decidedAt: new Date(), decisionReason: "Refus" });
    });
  const lost2 = await actions.cancelSubscriptionChange({ requestId: b.id });
  assert.match(lost2.error ?? "", /traitée par quelqu'un d'autre/);
  assert.equal(requestById(b.id)?.status, "REJECTED");
  assert.equal(db.audits.length, 0);

  // Et dans l'autre sens : l'annulation est validée avant l'approbation (déjà couvert plus haut) ; ici
  // une annulation puis une approbation successives → l'approbation est refusée, aucune application.
  reset();
  const c = seedRequest();
  asUser(ADMIN);
  assert.deepEqual(await actions.cancelSubscriptionChange({ requestId: c.id }), { requestId: c.id });
  asUser(OTHER_ADMIN);
  assert.match((await actions.approveSubscriptionChange({ requestId: c.id })).error ?? "", /déjà été traitée/);
  assert.equal(db.payments.length, 0);
  assert.equal(requestById(c.id)?.status, "CANCELLED");
});

test("annulation : échec de l'audit → demande inchangée", async () => {
  reset();
  const req = seedRequest();
  const before = { ...req };
  asUser(ADMIN);
  failAuditAction = "SUBSCRIPTION_CHANGE_CANCELLED";
  const result = await silently(() => actions.cancelSubscriptionChange({ requestId: req.id }));
  assert.match(result.error ?? "", /Une erreur est survenue pendant l'annulation/);
  assertRequestUntouched(req, before);
  assert.equal(db.audits.length, 0);
});

test("la doublure applique bien les contraintes CHECK : une écriture incohérente est refusée et annulée", async () => {
  // Garde de la doublure elle-même : sans elle, les tests précédents ne prouveraient pas la cohérence des écritures.
  reset();
  const req = seedRequest();
  const before = { ...req };
  await assert.rejects(
    prismaDouble.$transaction(async (t) => {
      // APPROVED sans date de décision : viole status_fields_check.
      await t.subscriptionChangeRequest.updateMany({ where: { id: req.id }, data: { status: "APPROVED" } });
    }),
    (error: unknown) => (error as { code?: string }).code === "23514",
  );
  assertRequestUntouched(req, before);
});

// =================================================================================================
// Garde de régression sur le code source
// =================================================================================================

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const actionSource = fs.readFileSync(path.join(SRC, "app/actions/subscription-change.ts"), "utf8");
const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const code = strip(actionSource);
const creationRegion = code.slice(0, code.indexOf("export async function requestManualPayment"));

test("source : fichier \"use server\" qui n'exporte que les cinq actions (création et décisions)", () => {
  assert.ok(actionSource.startsWith('"use server";'));
  const exported = [...code.matchAll(/^export\s+(.*)$/gm)].map((m) => m[1].replace(/\(.*$/, "").trim());
  assert.deepEqual(exported.sort(), [
    "async function approveSubscriptionChange",
    "async function cancelSubscriptionChange",
    "async function rejectSubscriptionChange",
    "async function requestManualPayment",
    "async function requestProlongation",
  ]);
});

test("source : permission explicite appelée par chaque action, jamais hasPlatformPermission", () => {
  const calls = code.match(/hasExplicitPlatformPermission\(user, "PLATFORM_SUBSCRIPTIONS"\)/g) ?? [];
  assert.equal(calls.length, 5);
  assert.doesNotMatch(code, /\bhasPlatformPermission\b/);
  assert.equal((code.match(/await getCurrentUser\(\)/g) ?? []).length, 5);
});

test("source : la création n'écrit que des lignes nouvelles et ne touche ni abonnement ni règlement", () => {
  assert.doesNotMatch(creationRegion, /\.subscription\s*\.\s*(create|createMany|upsert|delete|deleteMany|update|updateMany)\b/);
  assert.doesNotMatch(creationRegion, /subscriptionPayment/);
  assert.doesNotMatch(creationRegion, /\.(delete|deleteMany|updateMany|update)\(/);
  const afterCatch = creationRegion.slice(creationRegion.indexOf("catch (error)"));
  assert.ok(creationRegion.indexOf("catch (error)") > 0);
  assert.doesNotMatch(afterCatch, /\btx\b/, "aucun usage de tx après l'échec de la transaction");
  assert.match(afterCatch, /prisma\.subscriptionChangeRequest\.findUnique/);
});

test("source : jamais de création, suppression ou modification libre d'abonnement ; règlements en création seule", () => {
  assert.doesNotMatch(code, /\.subscription\s*\.\s*(create|createMany|upsert|delete|deleteMany|update)\b/);
  const subscriptionOps = new Set([...code.matchAll(/\.subscription\s*\.\s*(\w+)/g)].map((m) => m[1]));
  assert.deepEqual([...subscriptionOps].sort(), ["findUnique", "updateMany"]);
  const paymentOps = new Set([...code.matchAll(/subscriptionPayment\s*\.\s*(\w+)/g)].map((m) => m[1]));
  assert.deepEqual([...paymentOps], ["create"], "un règlement n'est jamais modifié ni supprimé");
  const requestOps = new Set([...code.matchAll(/\.subscriptionChangeRequest\s*\.\s*(\w+)/g)].map((m) => m[1]));
  assert.deepEqual([...requestOps].sort(), ["create", "findUnique", "updateMany"], "aucune suppression de demande");
  assert.doesNotMatch(code, /:\s*any\b|\bas any\b|<any>/);
});

test("source : conditions des mises à jour conditionnelles (statut en attente, demandeur présent et différent, rejet d'un demandeur NULL)", () => {
  assert.match(code, /status: PENDING_STATUS, requestedByUserId: \{ not: user\.id \}/, "approbation");
  assert.match(code, /OR: \[\{ requestedByUserId: null \}, \{ requestedByUserId: \{ not: user\.id \} \}\]/, "rejet");
  assert.match(code, /status: PENDING_STATUS, requestedByUserId: user\.id/, "annulation");
  assert.match(code, /decided\.count !== 1/);
  assert.match(code, /extended\.count !== 1/);
  const decisionRegion = code.slice(code.indexOf("type SubscriptionChangeDecisionResult"));
  assert.ok(decisionRegion.length > 0 && code.includes("type SubscriptionChangeDecisionResult"));
  const fieldsRead = new Set([...decisionRegion.matchAll(/fields\.(\w+)/g)].map((m) => m[1]));
  assert.deepEqual([...fieldsRead].sort(), ["reason", "requestId"], "les décisions ne lisent que requestId et reason chez le client");
});

test("source : les anciennes actions et le renouvellement existants ne sont pas touchés par cette étape", () => {
  const legacy = fs.readFileSync(path.join(SRC, "app/actions/subscription.ts"), "utf8");
  for (const name of [
    "createSubscriptionPaymentRequest",
    "confirmSubscriptionPayment",
    "prolongSubscriptionAction",
    "recordManualSubscriptionPaymentAction",
  ]) {
    assert.match(legacy, new RegExp(`export async function ${name}\\b`), `${name} doit rester présente jusqu'à B2.14`);
  }
});
