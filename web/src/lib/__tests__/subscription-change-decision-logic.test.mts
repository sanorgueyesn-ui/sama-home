import assert from "node:assert/strict";
import Module from "node:module";
import test from "node:test";

// Lot 3B (B2.14-B) — logique pure des décisions : doubles uniquement, aucune base, aucun serveur.
const originalLoad = (Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown })._load;
(Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown })._load = function (request: string, ...rest: unknown[]) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, ...rest);
};

const logic = await import("../../app/plateforme/abonnements/subscription-change-decision-logic");
const {
  REASON_MAX_LENGTH,
  initialDecisionState,
  reduceDecisionState,
  createDecisionRunner,
  APPROVED_MESSAGE,
  REJECTED_MESSAGE,
  CANCELLED_MESSAGE,
  UNKNOWN_OUTCOME_MESSAGE,
} = logic;

type Call = { op: string; input: Record<string, unknown> };

function makeDeps(answer: (op: string) => Promise<{ error?: string; requestId?: string }> | { error?: string; requestId?: string }) {
  const calls: Call[] = [];
  let refreshes = 0;
  const deps = {
    approve: async (input: { requestId: string }) => (calls.push({ op: "approve", input }), answer("approve")),
    reject: async (input: { requestId: string; reason: string }) => (calls.push({ op: "reject", input }), answer("reject")),
    cancel: async (input: { requestId: string }) => (calls.push({ op: "cancel", input }), answer("cancel")),
    refresh: () => {
      refreshes += 1;
    },
  };
  return { deps, calls, refreshes: () => refreshes };
}

test("approbation : appelle l'action d'approbation avec l'identifiant seul, puis actualise", async () => {
  const t = makeDeps(() => ({ requestId: "r1" }));
  const runner = createDecisionRunner(t.deps);
  const out = await runner.approve("r1");
  assert.deepEqual(out, { status: "success", message: APPROVED_MESSAGE });
  assert.deepEqual(t.calls, [{ op: "approve", input: { requestId: "r1" } }]);
  assert.equal(t.refreshes(), 1);
});

test("annulation : appelle l'action d'annulation, puis actualise", async () => {
  const t = makeDeps(() => ({ requestId: "r2" }));
  const out = await createDecisionRunner(t.deps).cancel("r2");
  assert.deepEqual(out, { status: "success", message: CANCELLED_MESSAGE });
  assert.deepEqual(t.calls, [{ op: "cancel", input: { requestId: "r2" } }]);
  assert.equal(t.refreshes(), 1);
});

test("rejet : motif vide ou d'espaces refusé sans appel serveur", async () => {
  const t = makeDeps(() => ({ requestId: "r3" }));
  const runner = createDecisionRunner(t.deps);
  for (const reason of ["", "   ", "\n\t "]) {
    const out = await runner.reject("r3", reason);
    assert.equal(out.status, "invalid");
  }
  assert.equal(t.calls.length, 0);
  assert.equal(t.refreshes(), 0);
});

test("rejet : motif de plus de 500 caractères refusé, 500 accepté", async () => {
  const t = makeDeps(() => ({ requestId: "r4" }));
  const runner = createDecisionRunner(t.deps);
  assert.equal(REASON_MAX_LENGTH, 500);
  assert.equal((await runner.reject("r4", "a".repeat(501))).status, "invalid");
  assert.equal(t.calls.length, 0);
  assert.equal((await runner.reject("r4", "a".repeat(500))).status, "success");
  assert.equal(t.calls.length, 1);
});

test("rejet : motif valide transmis nettoyé (espaces de bord), puis actualisation", async () => {
  const t = makeDeps(() => ({ requestId: "r5" }));
  const out = await createDecisionRunner(t.deps).reject("r5", "  Paiement non reçu  ");
  assert.deepEqual(out, { status: "success", message: REJECTED_MESSAGE });
  assert.deepEqual(t.calls, [{ op: "reject", input: { requestId: "r5", reason: "Paiement non reçu" } }]);
  assert.equal(t.refreshes(), 1);
});

test("erreur métier du serveur : affichée telle quelle, pas d'actualisation", async () => {
  const t = makeDeps(() => ({ error: "Vous n'avez pas la permission." }));
  const out = await createDecisionRunner(t.deps).approve("r6");
  assert.deepEqual(out, { status: "error", message: "Vous n'avez pas la permission." });
  assert.equal(t.refreshes(), 0);
});

test("conflit d'état (déjà traitée, modifié entre-temps, introuvable) : classé « stale » avec invitation à actualiser", async () => {
  for (const error of [
    "Cette demande a déjà été traitée.",
    "Demande traitée par quelqu'un d'autre.",
    "L'abonnement a été modifié entre-temps.",
    "Demande introuvable.",
  ]) {
    const t = makeDeps(() => ({ error }));
    const out = await createDecisionRunner(t.deps).approve("r7");
    assert.equal(out.status, "stale", error);
    assert.ok("message" in out && out.message.includes(error) && /actualisez/i.test(out.message));
    assert.equal(t.refreshes(), 0);
  }
});

test("erreur réseau (exception) : résultat inconnu, aucune relance, aucune actualisation", async () => {
  let attempts = 0;
  const t = makeDeps(() => {
    attempts += 1;
    throw new Error("réseau");
  });
  const out = await createDecisionRunner(t.deps).approve("r8");
  assert.deepEqual(out, { status: "unknown", message: UNKNOWN_OUTCOME_MESSAGE });
  assert.equal(attempts, 1);
  assert.equal(t.refreshes(), 0);
});

test("réponse sans identifiant ni erreur : résultat inconnu, jamais présenté comme un succès", async () => {
  for (const answer of [{}, { requestId: undefined }]) {
    const t = makeDeps(() => answer);
    const out = await createDecisionRunner(t.deps).cancel("r9");
    assert.equal(out.status, "unknown");
    assert.equal(t.refreshes(), 0);
  }
});

test("double soumission : la seconde est ignorée tant que la première est en cours, une seule action appelée", async () => {
  let release: (v: { requestId: string }) => void = () => {};
  const t = makeDeps(() => new Promise((resolve) => (release = resolve)));
  const runner = createDecisionRunner(t.deps);
  const first = runner.approve("r10");
  assert.equal(runner.isBusy(), true);
  assert.deepEqual(await runner.approve("r10"), { status: "ignored" });
  assert.deepEqual(await runner.cancel("r10"), { status: "ignored" });
  assert.deepEqual(await runner.reject("r10", "motif"), { status: "ignored" });
  release({ requestId: "r10" });
  assert.equal((await first).status, "success");
  assert.equal(runner.isBusy(), false);
  assert.equal(t.calls.length, 1);
  assert.equal(t.refreshes(), 1);
});

test("après une erreur, une nouvelle décision explicite redevient possible", async () => {
  let n = 0;
  const t = makeDeps(() => (++n === 1 ? { error: "Échec." } : { requestId: "r11" }));
  const runner = createDecisionRunner(t.deps);
  assert.equal((await runner.approve("r11")).status, "error");
  assert.equal((await runner.approve("r11")).status, "success");
  assert.equal(t.calls.length, 2);
});

test("réducteur : ouverture, fermeture et saisie du motif", () => {
  let s = reduceDecisionState(initialDecisionState, { type: "open", mode: "reject-form" });
  assert.equal(s.mode, "reject-form");
  s = reduceDecisionState(s, { type: "reason-changed", reason: "Motif" });
  assert.equal(s.reason, "Motif");
  s = reduceDecisionState(s, { type: "close" });
  assert.equal(s.mode, "idle");
  assert.equal(s.reason, "Motif", "brouillon conservé à la fermeture");
});

test("réducteur : motif invalide → erreur de champ, texte saisi conservé, formulaire ouvert", () => {
  let s = reduceDecisionState(initialDecisionState, { type: "open", mode: "reject-form" });
  s = reduceDecisionState(s, { type: "reason-changed", reason: "   " });
  s = reduceDecisionState(s, { type: "submit-start" });
  assert.equal(s.pending, true);
  s = reduceDecisionState(s, { type: "outcome", outcome: { status: "invalid", message: "Un motif de rejet est obligatoire." } });
  assert.equal(s.pending, false);
  assert.equal(s.mode, "reject-form");
  assert.equal(s.reason, "   ");
  assert.equal(s.fieldError, "Un motif de rejet est obligatoire.");
  s = reduceDecisionState(s, { type: "reason-changed", reason: "ok" });
  assert.equal(s.fieldError, null);
});

test("réducteur : erreur serveur conserve le formulaire et le texte ; succès referme et vide le brouillon", () => {
  let s = reduceDecisionState(initialDecisionState, { type: "open", mode: "reject-form" });
  s = reduceDecisionState(s, { type: "reason-changed", reason: "Motif long" });
  s = reduceDecisionState(s, { type: "submit-start" });
  s = reduceDecisionState(s, { type: "outcome", outcome: { status: "error", message: "Refusé." } });
  assert.equal(s.mode, "reject-form");
  assert.equal(s.reason, "Motif long");
  assert.deepEqual(s.result, { kind: "error", message: "Refusé." });
  s = reduceDecisionState(s, { type: "submit-start" });
  assert.equal(s.result, null);
  s = reduceDecisionState(s, { type: "outcome", outcome: { status: "success", message: REJECTED_MESSAGE } });
  assert.equal(s.mode, "idle");
  assert.equal(s.reason, "");
  assert.equal(s.pending, false);
  assert.equal(s.result?.kind, "success");
});

test("réducteur : stale et unknown referment et proposent d'actualiser ; rien n'est modifiable pendant une requête", () => {
  let s = reduceDecisionState(initialDecisionState, { type: "open", mode: "confirm-approve" });
  s = reduceDecisionState(s, { type: "submit-start" });
  const frozen = s;
  assert.equal(reduceDecisionState(frozen, { type: "open", mode: "confirm-cancel" }), frozen);
  assert.equal(reduceDecisionState(frozen, { type: "close" }), frozen);
  assert.equal(reduceDecisionState(frozen, { type: "reason-changed", reason: "x" }), frozen);
  assert.equal(reduceDecisionState(frozen, { type: "clear-result" }), frozen);
  const stale = reduceDecisionState(s, { type: "outcome", outcome: { status: "stale", message: "Changé." } });
  assert.equal(stale.mode, "idle");
  assert.equal(stale.result?.kind, "stale");
  const unknown = reduceDecisionState(s, { type: "outcome", outcome: { status: "unknown", message: "?" } });
  assert.equal(unknown.result?.kind, "unknown");
  assert.equal(reduceDecisionState(unknown, { type: "clear-result" }).result, null);
});

test("source : logique pure, sans React, sans prisma, sans import direct des actions serveur", async () => {
  const { readFileSync } = await import("node:fs");
  const code = readFileSync(new URL("../../app/plateforme/abonnements/subscription-change-decision-logic.ts", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  assert.doesNotMatch(code, /from "react"|use client|use server|@\/lib\/prisma|@\/app\/actions|next\//);
});
