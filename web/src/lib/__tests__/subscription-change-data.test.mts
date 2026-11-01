// Lot 3B (B2.13-C) — LECTURE des demandes de changement d'abonnement et intégration des audits.
//
// Isolation : AUCUNE base, AUCUN réseau. `@/lib/prisma` est remplacé par une base en mémoire qui :
// - n'expose que des LECTURES (findMany, count) : toute autre méthode est un piège qui fait échouer le test ;
// - applique `where`, `orderBy`, `take` ET la projection `select` (un champ non sélectionné n'est jamais
//   renvoyé) : les lignes d'utilisateurs contiennent volontairement un hachage de mot de passe, un e-mail et
//   des permissions, qui ne doivent jamais apparaître dans le résultat.
// Ces tests prouvent la logique applicative ; ils ne prouvent pas le comportement avec PostgreSQL.
import test from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Row = Record<string, unknown>;
type Cond = { not: string };

const SENSITIVE_PASSWORD_HASH = "HASH_SECRET_NE_DOIT_JAMAIS_SORTIR";
const SENSITIVE_EMAIL_SUFFIX = "@secret.invalid";

let users: Map<string, Row>;
let establishments: Map<string, Row>;
let requests: Row[];
let currentUser: { id: string; isPlatformAdmin: boolean; permissions?: string | null };
let calls: string[] = [];
let selects: unknown[] = [];
let auditFindManyArgs: { where?: { action?: { in?: string[] } | string } } | null = null;
let seq = 0;

function project(row: Row, select: Record<string, unknown>): Row {
  const out: Row = {};
  for (const [key, spec] of Object.entries(select)) {
    if (spec === true) {
      out[key] = row[key];
    } else if (typeof spec === "object" && spec !== null && "select" in spec) {
      const related = row[key] as Row | null | undefined;
      out[key] = related === null || related === undefined ? null : project(related, (spec as { select: Record<string, unknown> }).select);
    }
  }
  return out;
}

function statusMatches(value: unknown, cond: unknown): boolean {
  if (typeof cond === "string") return value === cond;
  const not = (cond as Cond).not;
  return value !== not;
}

function sortRows(rows: Row[], orderBy: unknown): Row[] {
  const specs = (Array.isArray(orderBy) ? orderBy : [orderBy]) as Record<string, "asc" | "desc">[];
  return [...rows].sort((a, b) => {
    for (const spec of specs) {
      const [field, dir] = Object.entries(spec)[0];
      const av = a[field] as Date | null;
      const bv = b[field] as Date | null;
      const at = av ? av.getTime() : Number.NEGATIVE_INFINITY;
      const bt = bv ? bv.getTime() : Number.NEGATIVE_INFINITY;
      if (at !== bt) return dir === "asc" ? at - bt : bt - at;
    }
    return 0;
  });
}

const trap = (name: string) =>
  new Proxy(
    {},
    {
      get(_t, prop) {
        calls.push(`${name}.${String(prop)} (interdit)`);
        throw new Error(`accès interdit à ${name}.${String(prop)}`);
      },
    },
  );

function readOnly(name: string, methods: Record<string, (args: never) => Promise<unknown>>) {
  return new Proxy(methods, {
    get(target, prop) {
      if (typeof prop === "string" && prop in target) return target[prop];
      calls.push(`${name}.${String(prop)} (interdit)`);
      throw new Error(`accès interdit à ${name}.${String(prop)}`);
    },
  });
}

const prismaDouble = {
  subscriptionChangeRequest: readOnly("subscriptionChangeRequest", {
    findMany: async (args: { where: { status: string | Cond }; orderBy: unknown; take: number; select: Record<string, unknown> }) => {
      calls.push("subscriptionChangeRequest.findMany");
      selects.push(args.select);
      const filtered = requests.filter((r) => statusMatches(r.status, args.where.status));
      return sortRows(filtered, args.orderBy)
        .slice(0, args.take)
        .map((r) =>
          project(
            {
              ...r,
              establishment: establishments.get(r.establishmentId as string) ?? null,
              requestedBy: r.requestedByUserId ? users.get(r.requestedByUserId as string) ?? null : null,
              decidedBy: r.decidedByUserId ? users.get(r.decidedByUserId as string) ?? null : null,
            },
            args.select,
          ),
        );
    },
  }),
  user: readOnly("user", {
    findMany: async (args: { where: { isPlatformAdmin: boolean }; select: Record<string, unknown> }) => {
      calls.push("user.findMany");
      selects.push(args.select);
      return [...users.values()].filter((u) => u.isPlatformAdmin === args.where.isPlatformAdmin).map((u) => project(u, args.select));
    },
  }),
  auditLog: readOnly("auditLog", {
    findMany: async (args: typeof auditFindManyArgs) => {
      auditFindManyArgs = args;
      return [];
    },
    count: async () => 0,
  }),
  subscriptionPayment: trap("subscriptionPayment"),
  subscription: trap("subscription"),
};

class RedirectError extends Error {}
const stubs: Record<string, unknown> = {
  "@/lib/prisma": { prisma: prismaDouble },
  "@/lib/dal": {
    requirePlatformAdmin: async () => {
      if (!currentUser.isPlatformAdmin) throw new RedirectError("NEXT_REDIRECT /dashboard");
      return currentUser;
    },
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

const data = await import("../subscription-change-data");
const auditData = await import("../audit-log-data");
const { ACTION_LABELS } = await import("../../app/plateforme/historique/action-labels");

// --- Jeu de données ------------------------------------------------------------------------------

const ADMIN = "admin-1";
const OTHER = "admin-2";
const THIRD = "admin-3";
const EST = "etab-1";
const T0 = new Date("2026-10-01T10:00:00Z").getTime();

function addUser(id: string, name: string, permissions: string | null, isPlatformAdmin = true) {
  users.set(id, {
    id,
    name,
    email: `${id}${SENSITIVE_EMAIL_SUFFIX}`,
    username: `login-${id}`,
    passwordHash: SENSITIVE_PASSWORD_HASH,
    permissions,
    isPlatformAdmin,
  });
}

function reset(user?: Partial<typeof currentUser>) {
  users = new Map();
  establishments = new Map([[EST, { id: EST, name: "Résidence Teranga", status: "ACTIVE", ownerEmail: `proprio${SENSITIVE_EMAIL_SUFFIX}` }]]);
  requests = [];
  addUser(ADMIN, "Aïssatou Admin", null);
  addUser(OTHER, "Boubacar Second", null);
  addUser(THIRD, "Coumba Troisième", '["PLATFORM_DASHBOARD"]');
  addUser("user-etab", "Employé d'établissement", null, false);
  currentUser = { id: ADMIN, isPlatformAdmin: true, permissions: null, ...user };
  calls = [];
  selects = [];
  auditFindManyArgs = null;
}

function request(o: Row = {}): Row {
  const n = ++seq;
  const row: Row = {
    id: `req-${n}`,
    establishmentId: EST,
    kind: "MANUAL_PAYMENT",
    status: "PENDING_SECOND_APPROVAL",
    amountFcfa: 5000,
    periodMonths: 3,
    days: null,
    reference: "Wave TX-1",
    reason: "Règlement reçu",
    idempotencyKey: `cle_secrete_${n}`,
    requestedByUserId: ADMIN,
    decidedByUserId: null,
    decidedAt: null,
    decisionReason: null,
    appliedPaymentId: null,
    createdAt: new Date(T0 + n * 60_000),
    updatedAt: new Date(T0 + n * 60_000),
    ...o,
  };
  requests.push(row);
  return row;
}
const closed = (status: "APPROVED" | "REJECTED" | "CANCELLED", minutes: number, o: Row = {}) =>
  request({
    status,
    decidedByUserId: status === "CANCELLED" ? ADMIN : OTHER,
    decidedAt: new Date(T0 + minutes * 60_000),
    decisionReason: status === "REJECTED" ? "Paiement non reçu" : null,
    appliedPaymentId: status === "APPROVED" ? "pay-1" : null,
    ...o,
  });

const VIEW_KEYS = [
  "amountFcfa", "canApprove", "canCancel", "canReject", "createdAt", "days", "decidedAt", "decidedByName", "decisionReason",
  "establishment", "id", "isOwnRequest", "kind", "periodMonths", "reason", "reference", "requesterMissing", "requesterName",
  "status", "waitingForSecondAdministrator",
];

// --- Autorisation --------------------------------------------------------------------------------

test("lecture : un compte qui n'est pas administrateur de plateforme est redirigé, sans aucune lecture", async () => {
  reset({ id: "user-etab", isPlatformAdmin: false, permissions: null });
  request();
  await assert.rejects(data.getSubscriptionChangeOverview(), RedirectError);
  assert.deepEqual(calls, []);
});

test("lecture : permission absente, liste vide ou insuffisante → null, et AUCUNE donnée n'est lue", async () => {
  for (const permissions of [undefined, "", " ", "[]", ",", " , ", '["PLATFORM_DASHBOARD"]', "PLATFORM_USERS", '["PLATFORM_SUBSCRIPTION"]', "[1]", "[[\"PLATFORM_SUBSCRIPTIONS\"]]"]) {
    reset();
    request();
    currentUser = { id: ADMIN, isPlatformAdmin: true, permissions };
    const result = await data.getSubscriptionChangeOverview();
    assert.equal(result, null, JSON.stringify(permissions));
    assert.deepEqual(calls, [], `aucune lecture pour ${JSON.stringify(permissions)}`);
  }
});

test("lecture : NULL canonique et permissions explicites autorisées acceptés", async () => {
  for (const permissions of [null, '["PLATFORM_SUBSCRIPTIONS"]', '["PLATFORM_ALL"]', '["ALL"]', "PLATFORM_SUBSCRIPTIONS", '["PLATFORM_DASHBOARD","PLATFORM_SUBSCRIPTIONS"]']) {
    reset();
    request();
    currentUser = { id: ADMIN, isPlatformAdmin: true, permissions };
    const result = await data.getSubscriptionChangeOverview();
    assert.ok(result, JSON.stringify(permissions));
    assert.equal(result.pending.length, 1);
  }
});

test("lecture : l'identité vient de la session, la fonction n'accepte aucun paramètre", async () => {
  assert.equal(data.getSubscriptionChangeOverview.length, 0);
  reset();
  request({ requestedByUserId: ADMIN });
  const asAdmin = await data.getSubscriptionChangeOverview();
  currentUser = { id: OTHER, isPlatformAdmin: true, permissions: null };
  const asOther = await data.getSubscriptionChangeOverview();
  assert.equal(asAdmin?.pending[0].isOwnRequest, true);
  assert.equal(asOther?.pending[0].isOwnRequest, false);
});

// --- Contenu et données sensibles ------------------------------------------------------------------

test("lecture : seuls les champs nécessaires sont renvoyés, jamais d'identifiant de personne ni de donnée sensible", async () => {
  reset();
  request({ requestedByUserId: ADMIN });
  closed("APPROVED", 5);
  const result = await data.getSubscriptionChangeOverview();
  assert.ok(result);
  assert.deepEqual(Object.keys(result).sort(), ["eligibleAdministratorCount", "pending", "pendingTruncated", "recentClosed"]);
  for (const view of [...result.pending, ...result.recentClosed]) {
    assert.deepEqual(Object.keys(view).sort(), VIEW_KEYS);
    assert.deepEqual(Object.keys(view.establishment).sort(), ["id", "name"]);
  }
  const text = JSON.stringify(result);
  for (const secret of [SENSITIVE_PASSWORD_HASH, SENSITIVE_EMAIL_SUFFIX, "login-", "passwordHash", "permissions", "idempotencyKey", "cle_secrete", "ownerEmail", "appliedPaymentId", "updatedAt", ADMIN, OTHER, THIRD, "user-etab"]) {
    assert.ok(!text.includes(secret), `la sortie ne doit pas contenir « ${secret} »`);
  }
  assert.equal(result.pending[0].requesterName, "Aïssatou Admin");
  assert.equal(result.recentClosed[0].decidedByName, "Boubacar Second");
});

test("lecture : les sélections demandées à la base sont minimales (aucun champ de User autre que name, id et permissions pour compter les décideurs)", async () => {
  reset();
  request();
  await data.getSubscriptionChangeOverview();
  const forbiddenKeys = ["passwordHash", "email", "username", "sessions", "idempotencyKey", "appliedPaymentId", "decidedByUserId", "ownerEmail"];
  const keysOf = (value: unknown): string[] =>
    typeof value === "object" && value !== null
      ? Object.entries(value).flatMap(([k, v]) => [k, ...keysOf(v)])
      : [];
  const requestSelects = selects.filter((s) => "kind" in (s as object));
  assert.equal(requestSelects.length, 2, "une sélection pour les demandes en attente, une pour les clôturées");
  for (const select of requestSelects) {
    const keys = keysOf(select);
    for (const forbidden of forbiddenKeys) assert.ok(!keys.includes(forbidden), `sélection de demande : ${forbidden} interdit`);
    assert.deepEqual((select as { requestedBy: unknown }).requestedBy, { select: { name: true } });
    assert.deepEqual((select as { decidedBy: unknown }).decidedBy, { select: { name: true } });
    assert.deepEqual((select as { establishment: unknown }).establishment, { select: { id: true, name: true } });
  }
  const userSelect = selects.find((s) => "permissions" in (s as object)) as Record<string, unknown>;
  assert.deepEqual(Object.keys(userSelect).sort(), ["id", "isPlatformAdmin", "permissions"]);
});

test("lecture : uniquement des lectures, aucune écriture, aucun accès aux règlements ni aux abonnements", async () => {
  reset();
  request();
  closed("REJECTED", 4);
  await data.getSubscriptionChangeOverview();
  assert.deepEqual(
    [...new Set(calls)].sort(),
    ["subscriptionChangeRequest.findMany", "user.findMany"],
  );
  assert.ok(!calls.some((c) => c.includes("interdit")));
});

// --- Contenu : en attente et clôturées --------------------------------------------------------------

test("lecture : demandes en attente (tri par ancienneté) et 20 clôturées les plus récentes (tri par décision décroissante)", async () => {
  reset();
  for (let i = 0; i < 3; i++) request({ requestedByUserId: OTHER });
  const statuses = ["APPROVED", "REJECTED", "CANCELLED"] as const;
  for (let i = 0; i < 25; i++) closed(statuses[i % 3], 100 + i);
  const result = await data.getSubscriptionChangeOverview();
  assert.ok(result);
  assert.equal(result.pending.length, 3);
  assert.equal(result.pendingTruncated, false);
  assert.ok(result.pending.every((v) => v.status === "PENDING_SECOND_APPROVAL"));
  const created = result.pending.map((v) => v.createdAt.getTime());
  assert.deepEqual(created, [...created].sort((a, b) => a - b), "plus anciennes d'abord");

  assert.equal(result.recentClosed.length, 20);
  assert.ok(result.recentClosed.every((v) => v.status !== "PENDING_SECOND_APPROVAL"));
  const decided = result.recentClosed.map((v) => v.decidedAt?.getTime() ?? 0);
  assert.deepEqual(decided, [...decided].sort((a, b) => b - a), "plus récentes d'abord");
  assert.equal(decided[0], T0 + 124 * 60_000, "la décision la plus récente est la première");
  assert.equal(decided[19], T0 + 105 * 60_000, "les 5 plus anciennes sont exclues");
});

test("lecture : plus de 200 demandes en attente → liste plafonnée et signalée", async () => {
  reset();
  for (let i = 0; i < 201; i++) request({ requestedByUserId: OTHER });
  const result = await data.getSubscriptionChangeOverview();
  assert.ok(result);
  assert.equal(result.pending.length, 200);
  assert.equal(result.pendingTruncated, true);
  reset();
  for (let i = 0; i < 200; i++) request({ requestedByUserId: OTHER });
  const exact = await data.getSubscriptionChangeOverview();
  assert.equal(exact?.pending.length, 200);
  assert.equal(exact?.pendingTruncated, false);
});

test("lecture : valeurs gelées d'un paiement manuel et d'une prolongation", async () => {
  reset();
  request({ kind: "MANUAL_PAYMENT", amountFcfa: 12_500, periodMonths: 6, days: null, reference: "OM-77", reason: "Espèces" });
  request({ kind: "PROLONGATION", amountFcfa: null, periodMonths: null, days: 90, reference: null, reason: "Geste commercial" });
  const result = await data.getSubscriptionChangeOverview();
  assert.ok(result);
  const [mp, pr] = result.pending;
  assert.deepEqual(
    { kind: mp.kind, amountFcfa: mp.amountFcfa, periodMonths: mp.periodMonths, days: mp.days, reference: mp.reference, reason: mp.reason, establishment: mp.establishment },
    { kind: "MANUAL_PAYMENT", amountFcfa: 12_500, periodMonths: 6, days: null, reference: "OM-77", reason: "Espèces", establishment: { id: EST, name: "Résidence Teranga" } },
  );
  assert.deepEqual(
    { kind: pr.kind, amountFcfa: pr.amountFcfa, periodMonths: pr.periodMonths, days: pr.days, reference: pr.reference },
    { kind: "PROLONGATION", amountFcfa: null, periodMonths: null, days: 90, reference: null },
  );
});

// --- Indicateurs d'action --------------------------------------------------------------------------

test("indicateurs : demande de l'utilisateur courant → annulation seule", async () => {
  reset();
  request({ requestedByUserId: ADMIN });
  const view = (await data.getSubscriptionChangeOverview())?.pending[0];
  assert.deepEqual(
    { canApprove: view?.canApprove, canReject: view?.canReject, canCancel: view?.canCancel, own: view?.isOwnRequest },
    { canApprove: false, canReject: false, canCancel: true, own: true },
  );
});

test("indicateurs : demande d'un autre administrateur → approbation et rejet, pas d'annulation", async () => {
  reset();
  request({ requestedByUserId: OTHER });
  const view = (await data.getSubscriptionChangeOverview())?.pending[0];
  assert.deepEqual(
    { canApprove: view?.canApprove, canReject: view?.canReject, canCancel: view?.canCancel, own: view?.isOwnRequest, missing: view?.requesterMissing },
    { canApprove: true, canReject: true, canCancel: false, own: false, missing: false },
  );
});

test("indicateurs : demandeur absent (NULL) → rejet seul, jamais d'approbation ni d'annulation", async () => {
  reset();
  request({ requestedByUserId: null });
  const view = (await data.getSubscriptionChangeOverview())?.pending[0];
  assert.deepEqual(
    { canApprove: view?.canApprove, canReject: view?.canReject, canCancel: view?.canCancel, missing: view?.requesterMissing, name: view?.requesterName, own: view?.isOwnRequest },
    { canApprove: false, canReject: true, canCancel: false, missing: true, name: null, own: false },
  );
  assert.equal(view?.waitingForSecondAdministrator, false, "elle attend un rejet, pas un second administrateur");
});

test("indicateurs : demandes clôturées → aucune action possible", async () => {
  reset();
  closed("APPROVED", 1, { requestedByUserId: OTHER });
  closed("REJECTED", 2, { requestedByUserId: ADMIN });
  closed("CANCELLED", 3, { requestedByUserId: ADMIN });
  const result = await data.getSubscriptionChangeOverview();
  assert.equal(result?.recentClosed.length, 3);
  for (const view of result?.recentClosed ?? []) {
    assert.deepEqual([view.canApprove, view.canReject, view.canCancel, view.waitingForSecondAdministrator], [false, false, false, false]);
  }
});

test("indicateurs : le point de vue change avec l'utilisateur de la session", async () => {
  reset();
  request({ requestedByUserId: ADMIN });
  currentUser = { id: OTHER, isPlatformAdmin: true, permissions: '["PLATFORM_SUBSCRIPTIONS"]' };
  const view = (await data.getSubscriptionChangeOverview())?.pending[0];
  assert.deepEqual([view?.canApprove, view?.canReject, view?.canCancel], [true, true, false]);
});

test("second administrateur : en attente tant qu'aucun autre administrateur n'a la permission explicite", async () => {
  reset();
  // OTHER perd la permission (liste vide : ce n'est PAS une autorisation) ; THIRD ne l'a pas non plus.
  users.set(OTHER, { ...users.get(OTHER), permissions: "[]" });
  request({ requestedByUserId: ADMIN });
  const result = await data.getSubscriptionChangeOverview();
  assert.equal(result?.eligibleAdministratorCount, 1);
  assert.equal(result?.pending[0].waitingForSecondAdministrator, true);
  assert.equal(result?.pending[0].canApprove, false, "le demandeur ne s'approuve jamais lui-même");

  // Un second administrateur autorisé apparaît : la demande n'attend plus.
  users.set(OTHER, { ...users.get(OTHER), permissions: '["PLATFORM_SUBSCRIPTIONS"]' });
  const later = await data.getSubscriptionChangeOverview();
  assert.equal(later?.eligibleAdministratorCount, 2);
  assert.equal(later?.pending[0].waitingForSecondAdministrator, false);

  // Les comptes qui ne sont pas administrateurs de plateforme ne comptent jamais.
  addUser("faux-admin", "Faux admin", null, false);
  assert.equal((await data.getSubscriptionChangeOverview())?.eligibleAdministratorCount, 2);
});

// --- Audits ---------------------------------------------------------------------------------------

const NEW_EVENTS = ["SUBSCRIPTION_CHANGE_REQUESTED", "SUBSCRIPTION_CHANGE_APPROVED", "SUBSCRIPTION_CHANGE_REJECTED", "SUBSCRIPTION_CHANGE_CANCELLED"];
const PREVIOUS_EVENTS = [
  "ESTABLISHMENT_APPROVED", "ESTABLISHMENT_AUTO_APPROVED", "ESTABLISHMENT_REJECTED", "ESTABLISHMENT_SUSPENDED", "ESTABLISHMENT_REACTIVATED",
  "PLATFORM_AUTO_APPROVAL_ENABLED", "PLATFORM_AUTO_APPROVAL_DISABLED", "SUBSCRIPTION_PAYMENT_CONFIRMED", "PRICING_SETTINGS_UPDATED",
  "ESTABLISHMENT_DELETED", "SUBSCRIPTION_PROLONGED", "SUBSCRIPTION_PAYMENT_MANUAL_RECORDED",
];

test("audit : les quatre nouveaux événements sont dans la liste blanche et ont un libellé lisible", () => {
  const list = auditData.PLATFORM_DECISION_ACTIONS as readonly string[];
  for (const event of NEW_EVENTS) {
    assert.ok(list.includes(event), `${event} manquant dans la liste blanche`);
    const label = (ACTION_LABELS as Record<string, string>)[event];
    assert.ok(label && label.trim().length > 10, `${event} : libellé manquant`);
    assert.ok(/demand|prolong|paiement/i.test(label), `${event} : libellé peu explicite`);
  }
  assert.equal(new Set(NEW_EVENTS.map((e) => (ACTION_LABELS as Record<string, string>)[e])).size, 4, "libellés distincts");
});

test("audit : les protections existantes sont maintenues (événements historiques conservés, actions différées toujours absentes)", () => {
  const list = auditData.PLATFORM_DECISION_ACTIONS as readonly string[];
  for (const event of PREVIOUS_EVENTS) assert.ok(list.includes(event), `${event} doit rester dans la liste blanche`);
  for (const absent of ["USER_DELETED", "PLATFORM_ADMIN_CREATED", "PLATFORM_PERMISSIONS_UPDATED", "SUBSCRIPTION_PAYMENT_REQUESTED"]) {
    assert.ok(!list.includes(absent), `${absent} ne doit pas être ajouté dans ce lot`);
  }
  assert.equal(list.length, PREVIOUS_EVENTS.length + NEW_EVENTS.length);
  assert.equal(new Set(list).size, list.length, "aucun doublon");
  assert.deepEqual(Object.keys(ACTION_LABELS).sort(), [...list].sort(), "un libellé par événement, ni plus ni moins");
  // Libellés historiques inchangés.
  assert.equal(ACTION_LABELS.SUBSCRIPTION_PROLONGED, "Abonnement prolongé manuellement");
  assert.equal(ACTION_LABELS.SUBSCRIPTION_PAYMENT_MANUAL_RECORDED, "Paiement d'abonnement enregistré manuellement");
  assert.equal(ACTION_LABELS.ESTABLISHMENT_DELETED, "Établissement supprimé");
});

test("audit : l'historique interroge exactement la liste blanche, nouveaux événements compris, en lecture seule", async () => {
  reset();
  await auditData.listPlatformDecisions();
  const actionFilter = auditFindManyArgs?.where?.action as { in?: string[] } | undefined;
  assert.deepEqual([...(actionFilter?.in ?? [])].sort(), [...auditData.PLATFORM_DECISION_ACTIONS].sort());
  for (const event of NEW_EVENTS) assert.ok(actionFilter?.in?.includes(event));
  assert.ok(!calls.some((c) => c.includes("interdit")));
});

const actionSource = fs.readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../app/actions/subscription-change.ts"),
  "utf8",
);
const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

test("audit : les événements écrits par les actions sont exactement ceux de la liste blanche (aucun événement orphelin)", () => {
  const written = [...strip(actionSource).matchAll(/action:\s*"([A-Z_]+)"/g)].map((m) => m[1]);
  const list = auditData.PLATFORM_DECISION_ACTIONS as readonly string[];
  for (const event of written) assert.ok(list.includes(event), `${event} est écrit mais absent de la liste blanche`);
  for (const event of NEW_EVENTS) assert.ok(written.includes(event), `${event} doit être écrit par une action`);
  assert.deepEqual([...new Set(written)].sort(), [...NEW_EVENTS, "SUBSCRIPTION_PAYMENT_MANUAL_RECORDED", "SUBSCRIPTION_PROLONGED"].sort());
});

test("audit : aucun journal de ces actions n'embarque la référence, le motif libre ou la clé d'idempotence", () => {
  const code = strip(actionSource);
  const auditBlocks = [...code.matchAll(/auditLog\.create\(\{[\s\S]*?\n\s{6,10}\}\);/g)].map((m) => m[0]);
  assert.ok(auditBlocks.length >= 6, "tous les blocs d'audit ont été retrouvés");
  for (const block of auditBlocks) {
    assert.doesNotMatch(block, /\.reference\b|reason\.value|\.reason\b|idempotencyKey|decisionReason/, `bloc d'audit non conforme : ${block.slice(0, 80)}`);
  }
});

// --- Garde de régression sur le module de lecture -----------------------------------------------------

const dataSource = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../subscription-change-data.ts"), "utf8");
const dataCode = strip(dataSource);

test("source : module serveur uniquement, en lecture seule, avec permission explicite", () => {
  assert.ok(dataSource.startsWith('import "server-only";'));
  assert.match(dataCode, /requirePlatformAdmin\(\)/);
  assert.match(dataCode, /hasExplicitPlatformPermission\(user, "PLATFORM_SUBSCRIPTIONS"\)/);
  assert.doesNotMatch(dataCode, /\bhasPlatformPermission\b/);
  assert.doesNotMatch(dataCode, /\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/);
  assert.doesNotMatch(dataCode, /\$transaction|\$queryRaw|\$executeRaw/);
  assert.doesNotMatch(dataCode, /:\s*any\b|\bas any\b|<any>/);
  assert.doesNotMatch(dataCode, /passwordHash|email|username/);
  const exported = [...dataCode.matchAll(/^export\s+(?:async\s+)?(function|const|type)\s+(\w+)/gm)].map((m) => `${m[1]} ${m[2]}`);
  assert.ok(exported.includes("function getSubscriptionChangeOverview"));
});
