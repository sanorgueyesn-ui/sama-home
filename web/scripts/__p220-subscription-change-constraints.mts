/**
 * Lot 3B (étape B2.8) — tests COMPORTEMENTAUX des contraintes de "SubscriptionChangeRequest".
 *
 * ÉTAT : script PRÉPARÉ, jamais exécuté à la date de rédaction. Ne lance rien sans l'indicateur
 * explicite ci-dessous ; aucun script npm ne l'appelle.
 *
 * Usage (sur autorisation explicite uniquement) :
 *   DOTENV_CONFIG_PATH=.env.development.local npx tsx scripts/__p220-subscription-change-constraints.mts --run-constraint-tests
 *
 * ISOLATION
 * - Cible codée en dur : 127.0.0.1:55417, base "samahome_local_v17" (jamais le port 2026, jamais la
 *   production), en plus de la garde `safe-env` (SAMA_ENV=local, hôte/port autorisés, base attendue)
 *   et du marqueur de base de test (`assertTestDatabaseMarker`, lecture seule).
 * - Une SEULE transaction, TOUJOURS terminée par ROLLBACK (aucune instruction de validation n'est
 *   acceptée par le filtre `q()`), et un SAVEPOINT par cas, annulé après chaque cas.
 * - Les données de test portent un préfixe aléatoire "tst3b_" ; elles n'existent que dans la
 *   transaction annulée. Après le ROLLBACK, le script vérifie qu'aucune ligne de test ne subsiste
 *   et que le nombre de demandes n'a pas changé.
 * - Un filtre `q()` refuse toute instruction hors liste blanche (DDL, validation, TRUNCATE, COPY…)
 *   et n'accepte UPDATE / DELETE que s'ils portent l'étiquette de test.
 *
 * LIMITES (ne pas les ignorer)
 * - Une transaction annulée ne laisse aucune ligne, mais PAS aucune trace physique : tuples morts,
 *   WAL, statistiques d'activité, entrées d'index mortes. Rien de logique ne subsiste.
 * - Les tests prouvent le comportement des CONTRAINTES de la base. Les actions serveur (permissions,
 *   établissement ACTIVE, abonnement préexistant, idempotence applicative) ne sont pas testées ici.
 * - Aucun appel aux actions serveur ni à Prisma Client : SQL brut uniquement.
 */
// Choix délibéré : PAS de `import "dotenv/config"` ici (il chargerait le .env de production). L'import
// ci-dessous charge uniquement .env.development.local puis applique la garde de cible.
import "./lib/safe-env.mjs";
import { randomBytes } from "node:crypto";
import { Client } from "pg";
import { assertTestDatabaseMarker } from "./lib/db-marker.mjs";

const RUN_FLAG = "--run-constraint-tests";
if (!process.argv.includes(RUN_FLAG)) {
  console.log(`[p220] Script de tests des contraintes NON lancé : l'indicateur ${RUN_FLAG} est obligatoire.`);
  console.log("[p220] Aucune connexion ouverte.");
  process.exit(0);
}

const EXPECTED = { host: "127.0.0.1", port: "55417", database: "samahome_local_v17" } as const;
const databaseUrl = process.env.DATABASE_URL ?? "";
const target = (() => {
  try {
    const u = new URL(databaseUrl);
    return { host: u.hostname, port: u.port, database: decodeURIComponent(u.pathname.replace(/^\//, "")) };
  } catch {
    return { host: "", port: "", database: "" };
  }
})();
if (
  target.host !== EXPECTED.host ||
  target.port !== EXPECTED.port ||
  target.database !== EXPECTED.database ||
  process.env.SAMA_EXPECTED_DB !== EXPECTED.database
) {
  console.error("[p220] REFUSÉ : la cible n'est pas exactement 127.0.0.1:55417 / samahome_local_v17. Aucune connexion ouverte.");
  process.exit(2);
}
await assertTestDatabaseMarker(databaseUrl, "tests des contraintes (p220)");
console.log(`[p220] Cible confirmée : ${EXPECTED.host}:${EXPECTED.port} / ${EXPECTED.database} (marqueur de test vérifié).`);

// ---------------------------------------------------------------------------------------------
// Filtre de sécurité des instructions
// ---------------------------------------------------------------------------------------------
const FORBIDDEN = /\b(COMMIT|END|TRUNCATE|DROP|ALTER|CREATE|GRANT|REVOKE|COMMENT|VACUUM|COPY|REINDEX|CLUSTER|LOCK|NOTIFY|DO)\b/i;
const ALLOWED_PLAIN = /^\s*(BEGIN|ROLLBACK|SAVEPOINT|ROLLBACK TO SAVEPOINT|SET LOCAL|SELECT)\b/i;
const ALLOWED_INSERT =
  /^\s*INSERT INTO "(Establishment|User|Subscription|SubscriptionPayment|SubscriptionChangeRequest)"\s*\(/;
const ALLOWED_TAGGED_WRITE = /^\s*\/\* tst3b \*\/\s*(UPDATE|DELETE FROM) "(User|Establishment|SubscriptionPayment|SubscriptionChangeRequest)"/;

type QueryResult = { rows: Record<string, unknown>[]; rowCount: number | null };

const client = new Client({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 5000,
  application_name: "sama-p220-constraint-tests",
});

async function q(sql: string, params: unknown[] = []): Promise<QueryResult> {
  const text = sql.replace(/'[^']*'/g, "''"); // ignore le contenu des littéraux pour le filtre de mots interdits
  if (FORBIDDEN.test(text)) throw new Error(`[p220] instruction refusée par le filtre (mot interdit) : ${sql.slice(0, 60)}`);
  if (!(ALLOWED_PLAIN.test(sql) || ALLOWED_INSERT.test(sql) || ALLOWED_TAGGED_WRITE.test(sql))) {
    throw new Error(`[p220] instruction refusée par le filtre (hors liste blanche) : ${sql.slice(0, 60)}`);
  }
  const res = await client.query(sql, params as unknown[]);
  return { rows: res.rows as Record<string, unknown>[], rowCount: res.rowCount };
}

// ---------------------------------------------------------------------------------------------
// Jeu de données d'essai (n'existe que dans la transaction annulée)
// ---------------------------------------------------------------------------------------------
const RUN = `tst3b_${randomBytes(4).toString("hex")}`;
const NOW = new Date();
const E1 = `${RUN}_e1`; // établissement avec abonnement
const E2 = `${RUN}_e2`; // établissement SANS abonnement ni utilisateur (test RESTRICT isolé)
const UA = `${RUN}_ua`; // demandeur
const UB = `${RUN}_ub`; // second administrateur
const UC = `${RUN}_uc`; // troisième administrateur
const S1 = `${RUN}_s1`;
const P1 = `${RUN}_p1`;
const P2 = `${RUN}_p2`;
const MISSING = `${RUN}_absent`;
const PREFIX = "SubscriptionChangeRequest_";

let idCounter = 0;
const nextId = () => `${RUN}_r${String(++idCounter).padStart(4, "0")}`;
const nextKey = () => `${RUN}_${String(++idCounter).padStart(6, "0")}`; // 21 caractères, alphabet autorisé

type Row = Record<string, unknown>;
const CASTS: Record<string, string> = { kind: '::"SubscriptionChangeKind"', status: '::"SubscriptionChangeStatus"' };

async function insertRequest(row: Row): Promise<void> {
  const cols = Object.keys(row).filter((c) => row[c] !== undefined);
  const sql =
    `INSERT INTO "SubscriptionChangeRequest" (${cols.map((c) => `"${c}"`).join(", ")}) ` +
    `VALUES (${cols.map((c, i) => `$${i + 1}${CASTS[c] ?? ""}`).join(", ")})`;
  await q(sql, cols.map((c) => row[c]));
}

const common = (): Row => ({
  id: nextId(),
  establishmentId: E1,
  reference: null,
  reason: null,
  idempotencyKey: nextKey(),
  requestedByUserId: UA,
  decidedByUserId: null,
  decidedAt: null,
  decisionReason: null,
  appliedPaymentId: null,
  updatedAt: NOW,
});
const mp = (o: Row = {}): Row => ({ kind: "MANUAL_PAYMENT", amountFcfa: 5000, periodMonths: 3, days: null, ...common(), ...o });
const pr = (o: Row = {}): Row => ({ kind: "PROLONGATION", amountFcfa: null, periodMonths: null, days: 30, ...common(), ...o });
const approvedMp = (o: Row = {}): Row =>
  mp({ status: "APPROVED", decidedByUserId: UB, decidedAt: NOW, appliedPaymentId: P1, ...o });
const approvedPr = (o: Row = {}): Row => pr({ status: "APPROVED", decidedByUserId: UB, decidedAt: NOW, ...o });
const rejected = (o: Row = {}): Row =>
  mp({ status: "REJECTED", decidedByUserId: UB, decidedAt: NOW, decisionReason: "Paiement non reçu", ...o });
const cancelled = (o: Row = {}): Row => mp({ status: "CANCELLED", decidedByUserId: UA, decidedAt: NOW, ...o });

// ---------------------------------------------------------------------------------------------
// Description des cas
// ---------------------------------------------------------------------------------------------
type Expect =
  | { type: "ok" }
  | { type: "error"; code: string; constraint?: string | readonly string[] }
  | { type: "rows"; count: number }
  | { type: "check"; verify: (value: unknown) => string | null };

type Case = { id: string; target: string; expect: Expect; exec: () => Promise<unknown> };
const cases: Case[] = [];
const add = (id: string, target: string, expect: Expect, exec: () => Promise<unknown>) => cases.push({ id, target, expect, exec });

const OK: Expect = { type: "ok" };
const check = (name: string): Expect => ({ type: "error", code: "23514", constraint: `${PREFIX}${name}` });
const checkAny = (...names: string[]): Expect => ({ type: "error", code: "23514", constraint: names.map((n) => `${PREFIX}${n}`) });
const fk = (name: string): Expect => ({ type: "error", code: "23503", constraint: `${PREFIX}${name}` });
const unique = (name: string): Expect => ({ type: "error", code: "23505", constraint: `${PREFIX}${name}` });
const ins = (build: () => Row) => () => insertRequest(build());

// 1. kind_fields — type, montant, durée, jours
add("kind-ok-mp-min", "kind_fields", OK, ins(() => mp({ amountFcfa: 100, periodMonths: 1 })));
add("kind-ok-mp-max", "kind_fields", OK, ins(() => mp({ amountFcfa: 10_000_000, periodMonths: 36 })));
add("kind-ok-pr-min", "kind_fields", OK, ins(() => pr({ days: 1 })));
add("kind-ok-pr-max", "kind_fields", OK, ins(() => pr({ days: 366 })));
for (const [name, o] of [
  ["mp-amount-99", { amountFcfa: 99 }],
  ["mp-amount-10000001", { amountFcfa: 10_000_001 }],
  ["mp-amount-0", { amountFcfa: 0 }],
  ["mp-amount-negative", { amountFcfa: -100 }],
  ["mp-amount-null", { amountFcfa: null }],
  ["mp-months-0", { periodMonths: 0 }],
  ["mp-months-37", { periodMonths: 37 }],
  ["mp-months-null", { periodMonths: null }],
  ["mp-with-days", { days: 30 }],
] as [string, Row][]) add(`kind-ko-${name}`, "kind_fields", check("kind_fields_check"), ins(() => mp(o)));
for (const [name, o] of [
  ["pr-days-0", { days: 0 }],
  ["pr-days-367", { days: 367 }],
  ["pr-days-negative", { days: -1 }],
  ["pr-days-null", { days: null }],
  ["pr-with-amount", { amountFcfa: 5000 }],
  ["pr-with-months", { periodMonths: 3 }],
  ["pr-with-amount-and-months", { amountFcfa: 5000, periodMonths: 3 }],
] as [string, Row][]) add(`kind-ko-${name}`, "kind_fields", check("kind_fields_check"), ins(() => pr(o)));

// 2. text_check — longueurs, format de la clé d'idempotence
const x = (n: number) => "x".repeat(n);
const emoji = (n: number) => "😀".repeat(n);
add("text-ok-reference-200", "text", OK, ins(() => mp({ reference: x(200) })));
add("text-ok-reference-200-emoji", "text", OK, ins(() => mp({ reference: emoji(200) })));
add("text-ok-reason-500", "text", OK, ins(() => mp({ reason: x(500) })));
add("text-ok-decisionReason-500", "text", OK, ins(() => rejected({ decisionReason: x(500) })));
add("text-ok-key-16", "text", OK, ins(() => mp({ idempotencyKey: "a".repeat(16) })));
add("text-ok-key-64", "text", OK, ins(() => mp({ idempotencyKey: "a".repeat(64) })));
add("text-ok-key-alphabet", "text", OK, ins(() => mp({ idempotencyKey: "Ab0-_Ab0-_Ab0-_Ab0-_" })));
add("text-ok-key-uuid", "text", OK, ins(() => mp({ idempotencyKey: "550e8400-e29b-41d4-a716-446655440000" })));
for (const [name, o, build] of [
  ["reference-201", { reference: x(201) }, mp],
  ["reference-201-emoji", { reference: emoji(201) }, mp],
  ["reason-501", { reason: x(501) }, mp],
  ["decisionReason-501", { decisionReason: x(501) }, rejected],
  ["key-15", { idempotencyKey: "a".repeat(15) }, mp],
  ["key-65", { idempotencyKey: "a".repeat(65) }, mp],
  ["key-empty", { idempotencyKey: "" }, mp],
  ["key-inner-space", { idempotencyKey: "aaaaaaaa aaaaaaaa" }, mp],
  ["key-leading-space", { idempotencyKey: " " + "a".repeat(16) }, mp],
  ["key-dot", { idempotencyKey: "aaaaaaaaaaaaaaa.a" }, mp],
  ["key-slash", { idempotencyKey: "aaaaaaaaaaaaaaa/a" }, mp],
  ["key-accent", { idempotencyKey: "aaaaaaaaaaaaaaaé" }, mp],
  ["key-semicolon", { idempotencyKey: "aaaaaaaaaaaaaaa;a" }, mp],
  ["key-trailing-newline", { idempotencyKey: "a".repeat(16) + "\n" }, mp],
] as [string, Row, (o?: Row) => Row][]) add(`text-ko-${name}`, "text", check("text_check"), ins(() => build(o)));

// 3. status_fields — cohérence statut / décision
add("status-ok-pending-default", "status_fields", OK, ins(() => mp()));
add("status-ok-pending-explicit", "status_fields", OK, ins(() => mp({ status: "PENDING_SECOND_APPROVAL" })));
add("status-ok-approved-mp", "status_fields", OK, ins(() => approvedMp()));
add("status-ok-approved-pr", "status_fields", OK, ins(() => approvedPr()));
add("status-ok-rejected", "status_fields", OK, ins(() => rejected()));
add("status-ok-cancelled-by-requester", "status_fields", OK, ins(() => cancelled()));
add("status-ok-cancelled-by-system", "status_fields", OK, ins(() => cancelled({ decidedByUserId: null })));
for (const [name, o] of [
  ["pending-with-decidedAt", { decidedAt: NOW }],
  ["pending-with-decidedBy", { decidedByUserId: UB }],
  ["pending-with-decisionReason", { decisionReason: "motif" }],
] as [string, Row][]) add(`status-ko-${name}`, "status_fields", check("status_fields_check"), ins(() => mp(o)));
// PENDING + paiement appliqué viole DEUX contraintes ; PostgreSQL rapporte la première dans l'ordre alphabétique.
add("status-ko-pending-with-applied", "status_fields+applied_payment", checkAny("applied_payment_check", "status_fields_check"),
  ins(() => mp({ appliedPaymentId: P1 })));
add("status-ko-approved-mp-no-decidedAt", "status_fields", check("status_fields_check"), ins(() => approvedMp({ decidedAt: null })));
add("status-ko-approved-pr-no-decidedAt", "status_fields", check("status_fields_check"), ins(() => approvedPr({ decidedAt: null })));
add("status-ko-rejected-no-decidedAt", "status_fields", check("status_fields_check"), ins(() => rejected({ decidedAt: null })));
add("status-ko-cancelled-no-decidedAt", "status_fields", check("status_fields_check"), ins(() => cancelled({ decidedAt: null })));

// 4. reject_reason — motif de rejet obligatoire et non vide
add("reject-ok-reason", "reject_reason", OK, ins(() => rejected({ decisionReason: "Paiement non reçu" })));
add("reject-ok-reason-one-char", "reject_reason", OK, ins(() => rejected({ decisionReason: "x" })));
// Limite connue : la base ne retire que espace, tabulation, CR, LF ; l'application retire aussi les espaces Unicode.
add("reject-limit-nbsp-only-accepted", "reject_reason (limite connue)", OK, ins(() => rejected({ decisionReason: " " })));
for (const [name, v] of [
  ["null", null],
  ["empty", ""],
  ["space", " "],
  ["spaces", "     "],
  ["tab", "\t"],
  ["newline", "\n"],
  ["mixed-whitespace", " \t\r\n "],
] as [string, string | null][]) add(`reject-ko-${name}`, "reject_reason", check("reject_reason_check"), ins(() => rejected({ decisionReason: v })));

// 5. applied_payment — paiement appliqué
add("applied-ok-approved-mp", "applied_payment", OK, ins(() => approvedMp()));
add("applied-ok-approved-pr-none", "applied_payment", OK, ins(() => approvedPr()));
add("applied-ok-rejected-none", "applied_payment", OK, ins(() => rejected()));
add("applied-ok-cancelled-none", "applied_payment", OK, ins(() => cancelled()));
add("applied-ko-approved-mp-none", "applied_payment", check("applied_payment_check"), ins(() => approvedMp({ appliedPaymentId: null })));
add("applied-ko-approved-pr-with", "applied_payment", check("applied_payment_check"), ins(() => approvedPr({ appliedPaymentId: P1 })));
add("applied-ko-rejected-with", "applied_payment", check("applied_payment_check"), ins(() => rejected({ appliedPaymentId: P1 })));
add("applied-ko-cancelled-with", "applied_payment", check("applied_payment_check"), ins(() => cancelled({ appliedPaymentId: P1 })));
add("applied-unique-same-payment-twice", "appliedPaymentId_key", unique("appliedPaymentId_key"), async () => {
  await setup(() => insertRequest(approvedMp()));
  await insertRequest(approvedMp());
});
add("applied-fk-missing-payment", "appliedPaymentId_fkey", fk("appliedPaymentId_fkey"), ins(() => approvedMp({ appliedPaymentId: MISSING })));

// 6. no_self_decision — interdiction de l'auto-décision
add("self-ok-approved-distinct", "no_self_decision", OK, ins(() => approvedMp({ decidedByUserId: UB })));
add("self-ok-rejected-distinct", "no_self_decision", OK, ins(() => rejected({ decidedByUserId: UB })));
add("self-ok-approved-requester-null", "no_self_decision", OK, ins(() => approvedMp({ requestedByUserId: null })));
add("self-ok-rejected-both-null", "no_self_decision", OK, ins(() => rejected({ requestedByUserId: null, decidedByUserId: null })));
// Limite connue : la base accepte une approbation sans décideur (conséquence de SET NULL) ; l'application l'écrit toujours.
add("self-limit-approved-decider-null-accepted", "no_self_decision (limite connue)", OK, ins(() => approvedMp({ decidedByUserId: null })));
add("self-ko-approved-same-person", "no_self_decision", check("no_self_decision_check"), ins(() => approvedMp({ decidedByUserId: UA })));
add("self-ko-rejected-same-person", "no_self_decision", check("no_self_decision_check"), ins(() => rejected({ decidedByUserId: UA })));

// 7. cancel_by_requester — annulation par le demandeur ou le système
add("cancel-ok-by-requester", "cancel_by_requester", OK, ins(() => cancelled({ decidedByUserId: UA })));
add("cancel-ok-by-system", "cancel_by_requester", OK, ins(() => cancelled({ decidedByUserId: null })));
add("cancel-ok-requester-null", "cancel_by_requester", OK, ins(() => cancelled({ requestedByUserId: null, decidedByUserId: UB })));
add("cancel-ko-by-other", "cancel_by_requester", check("cancel_by_requester_check"), ins(() => cancelled({ decidedByUserId: UB })));

// Unicité de la clé d'idempotence (par demandeur)
add("idem-ko-same-requester-twice", "requestedByUserId_idempotencyKey_key", unique("requestedByUserId_idempotencyKey_key"), async () => {
  const key = nextKey();
  await setup(() => insertRequest(mp({ idempotencyKey: key })));
  await insertRequest(mp({ idempotencyKey: key }));
});
add("idem-ok-same-key-other-requester", "requestedByUserId_idempotencyKey_key", OK, async () => {
  const key = nextKey();
  await insertRequest(mp({ idempotencyKey: key, requestedByUserId: UA }));
  await insertRequest(mp({ idempotencyKey: key, requestedByUserId: UB }));
});
add("idem-limit-null-requester-not-unique", "requestedByUserId_idempotencyKey_key (limite connue)", OK, async () => {
  const key = nextKey();
  await insertRequest(mp({ idempotencyKey: key, requestedByUserId: null }));
  await insertRequest(mp({ idempotencyKey: key, requestedByUserId: null }));
});

// Clés étrangères et énumérations
add("fk-missing-establishment", "establishmentId_fkey", fk("establishmentId_fkey"), ins(() => mp({ establishmentId: MISSING })));
add("fk-missing-requester", "requestedByUserId_fkey", fk("requestedByUserId_fkey"), ins(() => mp({ requestedByUserId: MISSING })));
add("fk-missing-decider", "decidedByUserId_fkey", fk("decidedByUserId_fkey"), ins(() => rejected({ decidedByUserId: MISSING })));
add("enum-invalid-kind", "type kind", { type: "error", code: "22P02" }, ins(() => mp({ kind: "OTHER" })));
add("enum-invalid-status", "type status", { type: "error", code: "22P02" }, ins(() => mp({ status: "DONE" })));

// Transitions par UPDATE (simulation des mises à jour conditionnelles des futures actions)
const APPROVE_SQL =
  '/* tst3b */ UPDATE "SubscriptionChangeRequest" SET status = \'APPROVED\', "decidedByUserId" = $2, "decidedAt" = $3, ' +
  '"appliedPaymentId" = $4, "updatedAt" = $3 WHERE id = $1 AND status = \'PENDING_SECOND_APPROVAL\' AND "requestedByUserId" <> $2';
const rowCount = async (sql: string, params: unknown[]) => (await q(sql, params)).rowCount ?? -1;
add("upd-approve-single-statement", "UPDATE conditionnel", { type: "rows", count: 1 }, async () => {
  const r = mp();
  await setup(() => insertRequest(r));
  return rowCount(APPROVE_SQL, [r.id, UB, NOW, P1]);
});
add("upd-self-approval-matches-nothing", "UPDATE conditionnel", { type: "rows", count: 0 }, async () => {
  const r = mp();
  await setup(() => insertRequest(r));
  return rowCount(APPROVE_SQL, [r.id, UA, NOW, P1]);
});
add("upd-null-requester-not-approvable", "UPDATE conditionnel", { type: "rows", count: 0 }, async () => {
  const r = mp({ requestedByUserId: null });
  await setup(() => insertRequest(r));
  return rowCount(APPROVE_SQL, [r.id, UB, NOW, P1]);
});
add("upd-second-approval-matches-nothing", "UPDATE conditionnel", { type: "rows", count: 0 }, async () => {
  const r = mp();
  await setup(async () => {
    await insertRequest(r);
    const first = await rowCount(APPROVE_SQL, [r.id, UB, NOW, P1]);
    if (first !== 1) throw new Error(`première approbation inattendue (${first})`);
  });
  return rowCount(APPROVE_SQL, [r.id, UC, NOW, P2]);
});
add("upd-cancel-single-statement", "UPDATE conditionnel", { type: "rows", count: 1 }, async () => {
  const r = mp();
  await setup(() => insertRequest(r));
  return rowCount(
    '/* tst3b */ UPDATE "SubscriptionChangeRequest" SET status = \'CANCELLED\', "decidedAt" = $2, "decisionReason" = \'Demandeur supprimé\' ' +
      'WHERE id = $1 AND status = \'PENDING_SECOND_APPROVAL\'',
    [r.id, NOW],
  );
});
add("upd-ko-status-without-decidedAt", "status_fields", check("status_fields_check"), async () => {
  const r = mp();
  await setup(() => insertRequest(r));
  await q('/* tst3b */ UPDATE "SubscriptionChangeRequest" SET status = \'CANCELLED\' WHERE id = $1', [r.id]);
});
add("upd-ko-direct-self-approval-bypassing-where", "no_self_decision", check("no_self_decision_check"), async () => {
  const r = mp();
  await setup(() => insertRequest(r));
  await q(
    '/* tst3b */ UPDATE "SubscriptionChangeRequest" SET status = \'APPROVED\', "decidedByUserId" = $2, "decidedAt" = $3, "appliedPaymentId" = $4 WHERE id = $1',
    [r.id, UA, NOW, P1],
  );
});

// Suppressions (SET NULL / RESTRICT) — uniquement sur les lignes de test
const readRequest = async (id: unknown) =>
  (await q('SELECT status::text AS status, "requestedByUserId" AS requester, "decidedByUserId" AS decider FROM "SubscriptionChangeRequest" WHERE id = $1', [id])).rows[0];
add("del-requester-pending-set-null", "ON DELETE SET NULL (demandeur)", {
  type: "check",
  verify: (v) => {
    const row = v as { status?: string; requester?: unknown } | undefined;
    return row && row.status === "PENDING_SECOND_APPROVAL" && row.requester === null ? null : `attendu PENDING + demandeur NULL, obtenu ${JSON.stringify(row)}`;
  },
}, async () => {
  const r = mp();
  await setup(() => insertRequest(r));
  await q('/* tst3b */ DELETE FROM "User" WHERE id = $1', [UA]);
  return readRequest(r.id);
});
add("del-decider-approved-set-null", "ON DELETE SET NULL (décideur)", {
  type: "check",
  verify: (v) => {
    const row = v as { status?: string; decider?: unknown; requester?: unknown } | undefined;
    return row && row.status === "APPROVED" && row.decider === null && row.requester === UA ? null : `attendu APPROVED + décideur NULL, obtenu ${JSON.stringify(row)}`;
  },
}, async () => {
  const r = approvedMp();
  await setup(() => insertRequest(r));
  await q('/* tst3b */ DELETE FROM "User" WHERE id = $1', [UB]);
  return readRequest(r.id);
});
add("del-establishment-restrict", "ON DELETE RESTRICT (établissement)", fk("establishmentId_fkey"), async () => {
  await setup(() => insertRequest(mp({ establishmentId: E2 })));
  await q('/* tst3b */ DELETE FROM "Establishment" WHERE id = $1', [E2]);
});
add("del-payment-restrict", "ON DELETE RESTRICT (paiement appliqué)", fk("appliedPaymentId_fkey"), async () => {
  await setup(() => insertRequest(approvedMp()));
  await q('/* tst3b */ DELETE FROM "SubscriptionPayment" WHERE id = $1', [P1]);
});

// ---------------------------------------------------------------------------------------------
// Exécution
// ---------------------------------------------------------------------------------------------
class SetupError extends Error {}
async function setup(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    throw new SetupError(`préparation du cas échouée : ${(error as Error).message.slice(0, 160)}`);
  }
}

type PgError = { code?: string; constraint?: string; message?: string };
type Outcome = { thrown: false; value: unknown } | { thrown: true; error: PgError & { setup?: boolean } };

function judge(c: Case, o: Outcome): string | null {
  const e = c.expect;
  if (o.thrown) {
    const err = o.error;
    if (err instanceof SetupError) return `ÉCHEC DE PRÉPARATION (${err.message})`;
    if (e.type !== "error") return `erreur inattendue ${err.code ?? "?"} ${err.constraint ?? ""} — ${(err.message ?? "").slice(0, 140)}`;
    if (err.code !== e.code) return `code ${err.code ?? "?"} au lieu de ${e.code} — ${(err.message ?? "").slice(0, 140)}`;
    if (e.constraint !== undefined) {
      const allowed = Array.isArray(e.constraint) ? e.constraint : [e.constraint];
      if (!err.constraint || !allowed.includes(err.constraint)) return `contrainte ${err.constraint ?? "?"} au lieu de ${allowed.join(" | ")}`;
    }
    return null;
  }
  switch (e.type) {
    case "ok":
      return null;
    case "error":
      return `acceptée alors qu'une erreur ${e.code} était attendue`;
    case "rows":
      return o.value === e.count ? null : `${String(o.value)} ligne(s) au lieu de ${e.count}`;
    case "check":
      return e.verify(o.value);
  }
}

async function counts(label: string): Promise<Record<string, number>> {
  const sql =
    "SELECT " +
    "(SELECT count(*) FROM \"SubscriptionChangeRequest\")::int AS requests, " +
    "(SELECT count(*) FROM \"SubscriptionChangeRequest\" WHERE id LIKE 'tst3b\\_%')::int AS test_requests, " +
    "(SELECT count(*) FROM \"Establishment\" WHERE id LIKE 'tst3b\\_%')::int AS test_establishments, " +
    "(SELECT count(*) FROM \"User\" WHERE id LIKE 'tst3b\\_%')::int AS test_users, " +
    "(SELECT count(*) FROM \"Subscription\" WHERE id LIKE 'tst3b\\_%')::int AS test_subscriptions, " +
    "(SELECT count(*) FROM \"SubscriptionPayment\" WHERE id LIKE 'tst3b\\_%')::int AS test_payments";
  const row = (await q(sql)).rows[0] as Record<string, number>;
  console.log(`[p220] ${label} :`, JSON.stringify(row));
  return row;
}

await client.connect();
let failures = 0;
let total = 0;
let before: Record<string, number> = {};
let after: Record<string, number> = {};
try {
  before = await counts("avant (hors transaction)");
  await q("BEGIN");
  await q("SET LOCAL statement_timeout = '10s'");
  await q("SET LOCAL lock_timeout = '3s'");
  await q("SET LOCAL idle_in_transaction_session_timeout = '120s'");
  try {
    // Jeu de données d'essai — dans la transaction uniquement.
    await q('INSERT INTO "Establishment" (id, name, status, "updatedAt") VALUES ($1, $2, \'ACTIVE\', $3)', [E1, "Test 3B (annulé)", NOW]);
    await q('INSERT INTO "Establishment" (id, name, status, "updatedAt") VALUES ($1, $2, \'ACTIVE\', $3)', [E2, "Test 3B bis (annulé)", NOW]);
    for (const [id, name] of [[UA, "Demandeur"], [UB, "Second administrateur"], [UC, "Troisième administrateur"]]) {
      await q(
        'INSERT INTO "User" (id, username, "passwordHash", name, "isPlatformAdmin", "updatedAt") VALUES ($1, $2, \'not-a-real-hash\', $3, true, $4)',
        [id, id, `Test 3B ${name}`, NOW],
      );
    }
    await q('INSERT INTO "Subscription" (id, "establishmentId", "trialStartedAt", "currentPeriodEnd", "updatedAt") VALUES ($1, $2, $3, $3, $3)', [S1, E1, NOW]);
    for (const id of [P1, P2]) {
      await q('INSERT INTO "SubscriptionPayment" (id, "subscriptionId", amount, "periodMonths") VALUES ($1, $2, 5000, 3)', [id, S1]);
    }

    for (const c of cases) {
      total++;
      await q("SAVEPOINT sp_case");
      let outcome: Outcome;
      try {
        outcome = { thrown: false, value: await c.exec() };
      } catch (error) {
        outcome = { thrown: true, error: error as PgError };
      }
      await q("ROLLBACK TO SAVEPOINT sp_case");
      const problem = judge(c, outcome);
      if (problem) failures++;
      console.log(`${problem ? "[ÉCHEC]" : "[OK]   "} ${c.id} — cible : ${c.target}${problem ? ` — ${problem}` : ""}`);
    }
  } finally {
    await q("ROLLBACK");
  }
  after = await counts("après ROLLBACK");
} finally {
  await client.end().catch(() => undefined);
}

const clean =
  after.requests === before.requests &&
  [after.test_requests, after.test_establishments, after.test_users, after.test_subscriptions, after.test_payments].every((n) => n === 0);
console.log(`[p220] ${total} cas exécutés, ${failures} échec(s). Aucune ligne de test ne subsiste : ${clean ? "oui" : "NON — À EXAMINER"}.`);
process.exit(failures === 0 && clean ? 0 : 1);
