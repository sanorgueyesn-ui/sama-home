// Lot 3A — forfait payant perdu en approbation manuelle.
//
// Isolation : AUCUNE base, AUCUN réseau. `@/lib/prisma` est remplacé par une base en mémoire
// dont la transaction restaure l'état initial si la fonction lève une erreur (comportement
// d'annulation de PostgreSQL). La doublure n'expose AUCUNE méthode de modification ou de
// suppression de paiement : toute tentative ferait échouer le test. Ces tests prouvent la
// logique applicative ; ils ne prouvent pas le comportement avec PostgreSQL réel.
import test from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";

type Payment = { id: string; subscriptionId: string; amount: number; periodMonths: number; status: string; reference: string | null };
type Audit = {
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  newValue?: unknown;
  establishmentId?: string;
};
type Db = {
  establishments: Map<string, { id: string; status: string }>;
  subscriptions: { id: string; establishmentId: string }[];
  payments: Payment[];
  audits: Audit[];
  pricing: { trialDurationMonths: number; periodMonths: number; periodPriceFcfa: number } | null;
  expenseCategories: number;
};

let db: Db;
let failPaymentCreate = false;
let seq = 0;

function freshDb(): Db {
  return {
    establishments: new Map(),
    subscriptions: [],
    payments: [],
    audits: [],
    pricing: null,
    expenseCategories: 0,
  };
}

const tx = {
  establishment: {
    findUnique: async (a: { where: { id: string } }) => db.establishments.get(a.where.id) ?? null,
    updateMany: async (a: { where: { id: string; status: string }; data: { status: string } }) => {
      const e = db.establishments.get(a.where.id);
      if (!e || e.status !== a.where.status) return { count: 0 };
      e.status = a.data.status;
      return { count: 1 };
    },
  },
  pricingSettings: { findUnique: async () => db.pricing },
  subscription: {
    create: async (a: { data: { establishmentId: string } }) => {
      const row = { id: `sub-${++seq}`, establishmentId: a.data.establishmentId };
      db.subscriptions.push(row);
      return row;
    },
    findUnique: async (a: { where: { establishmentId: string } }) =>
      db.subscriptions.find((s) => s.establishmentId === a.where.establishmentId) ?? null,
  },
  subscriptionPayment: {
    findFirst: async (a: { where: { subscriptionId: string; status: string } }) =>
      db.payments.find((p) => p.subscriptionId === a.where.subscriptionId && p.status === a.where.status) ?? null,
    create: async (a: { data: Omit<Payment, "id" | "reference"> & { reference?: string | null } }) => {
      if (failPaymentCreate) throw new Error("échec simulé de la création du paiement");
      const row: Payment = { id: `pay-${++seq}`, reference: null, ...a.data };
      db.payments.push(row);
      return row;
    },
  },
  auditLog: {
    create: async (a: { data: Audit }) => {
      db.audits.push(a.data);
      return a.data;
    },
    findFirst: async (a: { where: { action: string; entityType: string; entityId: string; establishmentId: string } }) => {
      const w = a.where;
      const hit = db.audits.find(
        (x) =>
          x.action === w.action &&
          x.entityType === w.entityType &&
          x.entityId === w.entityId &&
          x.establishmentId === w.establishmentId,
      );
      return hit ? { newValue: hit.newValue ?? null } : null;
    },
  },
  expenseCategory: {
    createMany: async (a: { data: unknown[] }) => {
      db.expenseCategories += a.data.length;
      return { count: a.data.length };
    },
  },
};

const prismaDouble = {
  $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => {
    const snapshot = structuredClone(db);
    try {
      return await fn(tx);
    } catch (error) {
      db = snapshot; // annulation complète, comme PostgreSQL
      throw error;
    }
  },
};

const stubs: Record<string, unknown> = {
  "@/lib/prisma": { prisma: prismaDouble },
  "@/lib/dal": { requirePlatformAdmin: async () => ({ id: "admin-plateforme", isPlatformAdmin: true, permissions: null }) },
  "@/lib/password": { verifyPassword: async () => true },
  "@/lib/user-purge": { purgeUserFromDatabase: async () => undefined },
  "server-only": {},
};
type ModuleInternals = { _load: (request: string, parent: unknown, isMain: boolean) => unknown };
const moduleInternals = Module as unknown as ModuleInternals;
const originalLoad = moduleInternals._load;
moduleInternals._load = function (request: string, parent: unknown, isMain: boolean) {
  if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
  return originalLoad.call(this, request, parent, isMain);
};

const defaults = await import("../pricing-defaults");
const activation = await import("../establishment-activation");
const actions = await import("../../app/actions/establishment-approval");

const EST = "etab-1";

function seedPending(registeredNewValue: unknown | "NO_AUDIT") {
  db = freshDb();
  failPaymentCreate = false;
  db.establishments.set(EST, { id: EST, status: "PENDING" });
  if (registeredNewValue !== "NO_AUDIT") {
    db.audits.push({
      userId: null,
      action: "ESTABLISHMENT_REGISTERED",
      entityType: "Establishment",
      entityId: EST,
      newValue: registeredNewValue,
      establishmentId: EST,
    });
  }
}

const paymentRequestAudits = () => db.audits.filter((a) => a.action === "SUBSCRIPTION_PAYMENT_REQUESTED");

test("PAID_9900 + PricingSettings : demande PENDING créée avec montant et durée gelés, dans la transaction d'activation", async () => {
  seedPending({ plan: "PAID_9900" });
  db.pricing = { trialDurationMonths: 1, periodMonths: 6, periodPriceFcfa: 15000 };
  const result = await actions.approveEstablishment(EST);
  assert.deepEqual(result, {});
  assert.equal(db.establishments.get(EST)?.status, "ACTIVE");
  assert.equal(db.subscriptions.length, 1);
  assert.equal(db.payments.length, 1);
  const p = db.payments[0];
  assert.equal(p.subscriptionId, db.subscriptions[0].id);
  assert.equal(p.status, "PENDING");
  assert.equal(p.amount, 15000);
  assert.equal(p.periodMonths, 6);
  assert.equal(p.reference, null, "la référence SH-… n'est pas inventée");
  const audits = paymentRequestAudits();
  assert.equal(audits.length, 1);
  assert.equal(audits[0].userId, "admin-plateforme");
  assert.equal(audits[0].establishmentId, EST);
});

test("PAID_9900 sans ligne PricingSettings : repli sur les valeurs par défaut du projet", async () => {
  seedPending({ plan: "PAID_9900" });
  db.pricing = null;
  assert.deepEqual(await actions.approveEstablishment(EST), {});
  assert.equal(db.payments.length, 1);
  assert.equal(db.payments[0].amount, defaults.DEFAULT_PERIOD_PRICE_FCFA);
  assert.equal(db.payments[0].periodMonths, defaults.DEFAULT_PERIOD_MONTHS);
});

test("FREE_TRIAL : approbation réussie, aucune demande de paiement", async () => {
  seedPending({ plan: "FREE_TRIAL" });
  assert.deepEqual(await actions.approveEstablishment(EST), {});
  assert.equal(db.establishments.get(EST)?.status, "ACTIVE");
  assert.equal(db.subscriptions.length, 1);
  assert.equal(db.payments.length, 0);
  assert.equal(paymentRequestAudits().length, 0);
});

test("audit ESTABLISHMENT_REGISTERED absent : approbation réussie, aucune demande", async () => {
  seedPending("NO_AUDIT");
  assert.deepEqual(await actions.approveEstablishment(EST), {});
  assert.equal(db.establishments.get(EST)?.status, "ACTIVE");
  assert.equal(db.payments.length, 0);
});

test("audit d'un AUTRE établissement : ignoré", async () => {
  seedPending("NO_AUDIT");
  db.audits.push({
    userId: null,
    action: "ESTABLISHMENT_REGISTERED",
    entityType: "Establishment",
    entityId: "autre",
    newValue: { plan: "PAID_9900" },
    establishmentId: "autre",
  });
  assert.deepEqual(await actions.approveEstablishment(EST), {});
  assert.equal(db.payments.length, 0);
});

test("forfait absent ou invalide : aucune demande, approbation réussie", async () => {
  const invalid: unknown[] = [
    {},
    { plan: null },
    { plan: "" },
    { plan: "PAID_9900 " },
    { plan: "paid_9900" },
    { plan: "PAID_99000" },
    { plan: 9900 },
    { plan: ["PAID_9900"] },
    { plan: { value: "PAID_9900" } },
    null,
    "PAID_9900",
    ["PAID_9900"],
    42,
  ];
  for (const value of invalid) {
    seedPending(value);
    assert.deepEqual(await actions.approveEstablishment(EST), {}, JSON.stringify(value));
    assert.equal(db.establishments.get(EST)?.status, "ACTIVE");
    assert.equal(db.payments.length, 0, `aucune demande pour ${JSON.stringify(value)}`);
  }
});

test("demande déjà en attente : jamais de doublon, paiement existant intact", async () => {
  seedPending({ plan: "PAID_9900" });
  db.subscriptions.push({ id: "sub-existante", establishmentId: EST });
  db.payments.push({ id: "pay-existant", subscriptionId: "sub-existante", amount: 1234, periodMonths: 2, status: "PENDING", reference: "REF-X" });
  const before = structuredClone(db.payments);
  const created = await tx.subscriptionPayment.findFirst({ where: { subscriptionId: "sub-existante", status: "PENDING" } });
  assert.ok(created);
  const result = await activation.createPaidPlanRequestOnApproval(tx as never, EST, "admin-plateforme");
  assert.equal(result, false);
  assert.deepEqual(db.payments, before);
  assert.equal(paymentRequestAudits().length, 0);
});

test("échec de la création du paiement : l'approbation est annulée en entier", async () => {
  seedPending({ plan: "PAID_9900" });
  failPaymentCreate = true;
  const originalError = console.error;
  console.error = () => undefined;
  let result;
  try {
    result = await actions.approveEstablishment(EST);
  } finally {
    console.error = originalError;
  }
  assert.ok(result.error, "une erreur est renvoyée");
  assert.equal(db.establishments.get(EST)?.status, "PENDING", "l'établissement reste PENDING");
  assert.equal(db.subscriptions.length, 0, "aucun abonnement créé");
  assert.equal(db.payments.length, 0);
  assert.equal(db.expenseCategories, 0);
  assert.equal(db.audits.filter((a) => a.action === "ESTABLISHMENT_APPROVED").length, 0);
});

test("paiements déjà enregistrés (autres établissements) : ni modifiés ni supprimés", async () => {
  seedPending({ plan: "PAID_9900" });
  db.subscriptions.push({ id: "sub-autre", establishmentId: "autre" });
  db.payments.push(
    { id: "pay-a", subscriptionId: "sub-autre", amount: 9900, periodMonths: 3, status: "CONFIRMED", reference: "A" },
    { id: "pay-b", subscriptionId: "sub-autre", amount: 5000, periodMonths: 1, status: "PENDING", reference: null },
  );
  const before = structuredClone(db.payments);
  assert.deepEqual(await actions.approveEstablishment(EST), {});
  assert.deepEqual(db.payments.slice(0, 2), before);
  assert.equal(db.payments.length, 3);
});

test("double approbation : une seule demande, la seconde est refusée", async () => {
  seedPending({ plan: "PAID_9900" });
  assert.deepEqual(await actions.approveEstablishment(EST), {});
  const second = await actions.approveEstablishment(EST);
  assert.match(second.error ?? "", /déjà été traité/);
  assert.equal(db.payments.length, 1);
  assert.equal(db.subscriptions.length, 1);
});

test("auto-approbation (createTrialSubscriptionAndAudit seule) : aucune demande créée par l'activation", async () => {
  seedPending({ plan: "PAID_9900" });
  await activation.createTrialSubscriptionAndAudit(tx as never, EST, null, "ESTABLISHMENT_AUTO_APPROVED");
  assert.equal(db.subscriptions.length, 1);
  assert.equal(db.payments.length, 0, "la demande de l'auto-approbation reste créée par l'inscription, pas ici");
});
