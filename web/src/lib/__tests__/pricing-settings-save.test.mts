// Lot 3A (second correctif) — « Enregistrer les tarifs » : première sauvegarde des valeurs
// par défaut.
//
// Isolation : AUCUNE base, AUCUN réseau. `@/lib/prisma` est remplacé par une base en mémoire
// qui n'expose QUE `pricingSettings` et `auditLog` : toute tentative de toucher
// `subscription` ou `subscriptionPayment` lèverait une erreur et ferait échouer le test.
// Ces tests prouvent la logique applicative ; ils ne prouvent pas le comportement avec
// PostgreSQL réel.
import test from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";

type Row = { trialDurationMonths: number; periodMonths: number; periodPriceFcfa: number };
type Audit = {
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  reason: string | null;
  oldValue: unknown;
  newValue: unknown;
  establishmentId: string | null;
};

let row: Row | null = null;
const audits: Audit[] = [];
const writes: string[] = [];
const revalidated: string[] = [];
let platformUser: { id: string; isPlatformAdmin: boolean; permissions: string | null } = {
  id: "admin-plateforme",
  isPlatformAdmin: true,
  permissions: null,
};

const forbidden = (name: string) =>
  new Proxy(
    {},
    {
      get(_t, prop) {
        throw new Error(`accès interdit à ${name}.${String(prop)}`);
      },
    },
  );

const tx = {
  pricingSettings: {
    findUnique: async () => row,
    upsert: async (a: { create: Row; update: Row }) => {
      writes.push(row ? "update" : "create");
      const src = row ? a.update : a.create;
      row = {
        trialDurationMonths: src.trialDurationMonths,
        periodMonths: src.periodMonths,
        periodPriceFcfa: src.periodPriceFcfa,
      };
      return row;
    },
  },
  auditLog: {
    create: async (a: { data: Audit }) => {
      audits.push(a.data);
      return a.data;
    },
  },
  subscription: forbidden("subscription"),
  subscriptionPayment: forbidden("subscriptionPayment"),
};

const stubs: Record<string, unknown> = {
  "@/lib/prisma": {
    prisma: { $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx) },
  },
  "@/lib/dal": { requirePlatformAdmin: async () => platformUser },
  "@/lib/password": { hashPassword: async () => "hash" },
  "@/lib/session-token": { getSessionCookiePayload: async () => null },
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

const defaults = await import("../pricing-defaults");
const view = await import("../platform-settings-data");
const actions = await import("../../app/actions/platform-settings");

function form(trial: string, period: string, price: string): FormData {
  const f = new FormData();
  f.set("trialDurationMonths", trial);
  f.set("periodMonths", period);
  f.set("periodPriceFcfa", price);
  return f;
}

function reset(initial: Row | null) {
  row = initial ? { ...initial } : null;
  audits.length = 0;
  writes.length = 0;
  revalidated.length = 0;
  platformUser = { id: "admin-plateforme", isPlatformAdmin: true, permissions: null };
}

const DEFAULT_ROW: Row = {
  trialDurationMonths: defaults.DEFAULT_TRIAL_DURATION_MONTHS,
  periodMonths: defaults.DEFAULT_PERIOD_MONTHS,
  periodPriceFcfa: defaults.DEFAULT_PERIOD_PRICE_FCFA,
};
const DEFAULTS_FORM = () =>
  form(
    String(defaults.DEFAULT_TRIAL_DURATION_MONTHS),
    String(defaults.DEFAULT_PERIOD_MONTHS),
    String(defaults.DEFAULT_PERIOD_PRICE_FCFA),
  );

test("les valeurs par défaut du projet sont bien 1 mois, 3 mois, 9 900 FCFA", () => {
  assert.deepEqual(DEFAULT_ROW, { trialDurationMonths: 1, periodMonths: 3, periodPriceFcfa: 9900 });
});

test("première sauvegarde des valeurs par défaut : ligne créée, audit avec reason, statut configuré", async () => {
  reset(null);
  assert.equal(view.resolvePricingView(row).isConfigured, false);
  const result = await actions.setPricingSettings({}, DEFAULTS_FORM());
  assert.deepEqual(result, { success: true });
  assert.deepEqual(writes, ["create"]);
  assert.deepEqual(row, DEFAULT_ROW);
  assert.equal(audits.length, 1);
  assert.equal(audits[0].action, "PRICING_SETTINGS_UPDATED");
  assert.equal(audits[0].userId, "admin-plateforme");
  assert.equal(audits[0].reason, "Valeurs par défaut enregistrées explicitement");
  assert.deepEqual(audits[0].oldValue, DEFAULT_ROW);
  assert.deepEqual(audits[0].newValue, DEFAULT_ROW);
  assert.equal(audits[0].establishmentId, null);
  assert.equal(view.resolvePricingView(row).isConfigured, true, "la bannière « aucun tarif enregistré » disparaît");
  assert.deepEqual(revalidated, ["/register", "/plateforme/parametres"]);
});

test("première sauvegarde de valeurs personnalisées : création et audit sans reason", async () => {
  reset(null);
  const result = await actions.setPricingSettings({}, form("1", "6", "15000"));
  assert.deepEqual(result, { success: true });
  assert.deepEqual(writes, ["create"]);
  assert.deepEqual(row, { trialDurationMonths: 1, periodMonths: 6, periodPriceFcfa: 15000 });
  assert.equal(audits.length, 1);
  assert.equal(audits[0].reason, null);
  assert.deepEqual(audits[0].oldValue, DEFAULT_ROW);
  assert.deepEqual(audits[0].newValue, { trialDurationMonths: 1, periodMonths: 6, periodPriceFcfa: 15000 });
});

test("ligne existante avec valeurs identiques : aucune écriture ni nouvel audit", async () => {
  reset({ trialDurationMonths: 1, periodMonths: 6, periodPriceFcfa: 15000 });
  const result = await actions.setPricingSettings({}, form("1", "6", "15000"));
  assert.deepEqual(result, { success: true });
  assert.deepEqual(writes, []);
  assert.equal(audits.length, 0);
});

test("ligne existante égale aux valeurs par défaut, mêmes valeurs soumises : aucune écriture", async () => {
  reset({ ...DEFAULT_ROW });
  assert.deepEqual(await actions.setPricingSettings({}, DEFAULTS_FORM()), { success: true });
  assert.deepEqual(writes, []);
  assert.equal(audits.length, 0);
});

test("ligne existante avec valeurs différentes : mise à jour et audit ancien/nouveau, sans reason", async () => {
  reset({ trialDurationMonths: 1, periodMonths: 6, periodPriceFcfa: 15000 });
  const result = await actions.setPricingSettings({}, form("3", "6", "20000"));
  assert.deepEqual(result, { success: true });
  assert.deepEqual(writes, ["update"]);
  assert.deepEqual(row, { trialDurationMonths: 3, periodMonths: 6, periodPriceFcfa: 20000 });
  assert.equal(audits.length, 1);
  assert.equal(audits[0].reason, null);
  assert.deepEqual(audits[0].oldValue, { trialDurationMonths: 1, periodMonths: 6, periodPriceFcfa: 15000 });
  assert.deepEqual(audits[0].newValue, { trialDurationMonths: 3, periodMonths: 6, periodPriceFcfa: 20000 });
});

test("permissions insuffisantes : refus sans écriture", async () => {
  reset(null);
  platformUser = { id: "admin-limite", isPlatformAdmin: true, permissions: JSON.stringify(["PLATFORM_DASHBOARD"]) };
  const result = await actions.setPricingSettings({}, DEFAULTS_FORM());
  assert.match(result.message ?? "", /Action refusée/);
  assert.equal(result.success, undefined);
  assert.deepEqual(writes, []);
  assert.equal(audits.length, 0);
  assert.equal(row, null);
});

test("compte qui n'est pas administrateur de plateforme : refus sans écriture", async () => {
  reset(null);
  platformUser = { id: "intrus", isPlatformAdmin: false, permissions: null };
  const result = await actions.setPricingSettings({}, DEFAULTS_FORM());
  assert.match(result.message ?? "", /Action refusée/);
  assert.deepEqual(writes, []);
  assert.equal(audits.length, 0);
});

test("valeurs invalides : rejet avec erreurs de champ, sans écriture", async () => {
  const invalid: [string, string, string][] = [
    ["0", "3", "9900"],
    ["13", "3", "9900"],
    ["2", "0", "9900"],
    ["2", "13", "9900"],
    ["2", "3", "499"],
    ["2", "3", "1000001"],
    ["2.5", "3", "9900"],
    ["2", "3", "9900.5"],
    ["", "3", "9900"],
    ["abc", "3", "9900"],
    ["2", "3", ""],
  ];
  for (const [t, p, price] of invalid) {
    reset(null);
    const result = await actions.setPricingSettings({}, form(t, p, price));
    assert.ok(result.errors, `erreurs attendues pour ${t}/${p}/${price}`);
    assert.equal(result.success, undefined);
    assert.deepEqual(writes, [], `aucune écriture pour ${t}/${p}/${price}`);
    assert.equal(audits.length, 0);
    assert.equal(row, null);
  }
});

test("Subscription et SubscriptionPayment ne sont jamais touchés (doublure qui lève à tout accès)", async () => {
  reset(null);
  await actions.setPricingSettings({}, DEFAULTS_FORM());
  reset({ trialDurationMonths: 1, periodMonths: 6, periodPriceFcfa: 15000 });
  await actions.setPricingSettings({}, form("3", "6", "20000"));
  // Un accès aurait levé « accès interdit à subscription… » et fait renvoyer une erreur générique.
  assert.deepEqual(writes, ["update"]);
});
