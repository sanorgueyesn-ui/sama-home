import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Lot 3B (B2.14-B) — balisage réel du panneau de décision. `react-dom/server` est inutilisable avec la
// condition `react-server` des tests : le rendu se fait donc dans un processus enfant sans cette condition.
// Aucune base, aucune action serveur, aucun navigateur : ce n'est PAS un test de navigateur.
const helper = fileURLToPath(new URL("./helpers/render-decision-markup.mts", import.meta.url));
const raw = execFileSync(process.execPath, ["--import", "tsx", helper], {
  encoding: "utf8",
  cwd: fileURLToPath(new URL("../../../", import.meta.url)),
  env: { ...process.env, NODE_OPTIONS: "" },
});
const html = JSON.parse(raw) as Record<string, string>;

const has = (markup: string, text: string) => markup.includes(text);
const buttons = (markup: string) => [...markup.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)].map((m) => m[1].replace(/<[^>]+>/g, ""));

test("aucun indicateur : rien n'est rendu", () => {
  assert.equal(html.none, "");
});

test("boutons affichés uniquement selon les indicateurs", () => {
  assert.deepEqual(buttons(html.approveOnly), ["Approuver la demande"]);
  assert.deepEqual(buttons(html.rejectOnly), ["Rejeter la demande"]);
  assert.deepEqual(buttons(html.cancelOnly), ["Annuler ma demande"]);
  assert.deepEqual(buttons(html.all), ["Approuver la demande", "Rejeter la demande", "Annuler ma demande"]);
});

test("confirmation d'approbation : type, établissement (échappé), montant/durée, effet et boutons", () => {
  const m = html.confirmApprove;
  assert.ok(has(m, "Confirmer l&#x27;approbation de cette demande ?") || has(m, "Confirmer l&#39;approbation de cette demande ?"));
  assert.ok(has(m, "Paiement manuel") && has(m, "12 500 FCFA · 6 mois"));
  assert.ok(has(m, "Résidence &lt;b&gt;Teranga&lt;/b&gt;") && !has(m, "<b>Teranga"));
  assert.ok(has(m, "prolongé de 6 mois"));
  assert.deepEqual(buttons(m), ["Retour", "Oui, approuver"]);
  assert.ok(has(m, 'role="group"') && has(m, 'aria-busy="false"'));
});

test("requête en cours : boutons désactivés, libellé de chargement, aria-busy", () => {
  const m = html.confirmApprovePending;
  assert.ok(has(m, 'aria-busy="true"'));
  assert.deepEqual(buttons(m), ["Retour", "Approbation en cours…"]);
  assert.equal((m.match(/<button\b[^>]*\bdisabled=""/g) ?? []).length, 2);
  const r = html.rejectFormPending;
  assert.deepEqual(buttons(r), ["Retour", "Rejet en cours…"]);
  assert.ok(/<textarea\b[^>]*\bdisabled=""/.test(r));
});

test("confirmation sans l'indicateur correspondant : rien d'affiché malgré le mode", () => {
  assert.ok(!has(html.confirmApproveWithoutFlag, "Oui, approuver"));
});

test("formulaire de rejet : label associé, champ obligatoire, compteur, texte saisi échappé", () => {
  const m = html.rejectForm;
  assert.ok(has(m, 'for="reason-id"') && has(m, 'id="reason-id"'));
  assert.ok(has(m, "Motif du rejet (obligatoire, 500 caractères au maximum)"));
  assert.ok(has(m, 'aria-required="true"') && has(m, 'aria-invalid="false"'));
  assert.ok(has(m, "Texte &lt;i&gt;saisi&lt;/i&gt;") && !has(m, "<i>saisi"));
  assert.ok(has(m, "/ 500") && has(m, "<form") && has(m, 'type="submit"'));
  assert.deepEqual(buttons(m), ["Retour", "Confirmer le rejet"]);
});

test("erreur de validation : annoncée, reliée au champ, texte saisi conservé", () => {
  const m = html.rejectFormError;
  assert.ok(has(m, 'role="alert"') && has(m, 'id="error-id"') && has(m, 'aria-describedby="error-id"') && has(m, 'aria-invalid="true"'));
  assert.ok(has(m, "Un motif de rejet est obligatoire."));
  assert.ok(has(m, ">   </textarea>"));
});

test("motif trop long : compteur signalé au-delà de 500", () => {
  assert.ok(has(html.rejectFormTooLong, "501") && has(html.rejectFormTooLong, "text-danger"));
});

test("confirmation d'annulation : texte clair, aucun effet sur l'abonnement", () => {
  const m = html.confirmCancel;
  assert.ok(has(m, "Annuler cette demande ?") && has(m, "sans aucun effet sur l"));
  assert.deepEqual(buttons(m), ["Retour", "Oui, annuler la demande"]);
});

test("erreur serveur : alerte visible, formulaire et texte saisi conservés", () => {
  const m = html.serverError;
  assert.ok(has(m, "Vous n&#x27;avez pas la permission.") || has(m, "Vous n&#39;avez pas la permission."));
  assert.ok(has(m, 'role="alert"') && has(m, "Motif conservé") && has(m, "<form"));
});

test("données modifiées ou réponse inconnue : message + bouton d'actualisation, aucune décision proposée", () => {
  for (const m of [html.stale, html.unknown]) {
    assert.ok(has(m, 'role="alert"'));
    assert.deepEqual(buttons(m), ["Actualiser les données"]);
  }
});

test("succès : message annoncé (role=status), plus aucun bouton", () => {
  assert.ok(has(html.success, 'role="status"') && has(html.success, "Demande rejetée."));
  assert.equal(buttons(html.success).length, 0);
  assert.ok(has(html.successNoFlags, "Demande annulée.") && buttons(html.successNoFlags).length === 0);
});

test("aucune donnée sensible ni gestionnaire sérialisé dans le balisage", () => {
  for (const m of Object.values(html)) {
    assert.ok(!/password|hash|idempotency|secret|<script|dangerouslySetInnerHTML/i.test(m));
  }
});

test("source : composants de décision sans prisma ; seul le composant client appelle les 3 actions existantes", () => {
  const read = (n: string) =>
    readFileSync(new URL(`../../app/plateforme/abonnements/${n}`, import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
  const controls = read("subscription-change-decision-controls.tsx");
  const panel = read("subscription-change-decision-panel.tsx");
  assert.match(controls, /^"use client"/);
  for (const a of ["approveSubscriptionChange", "rejectSubscriptionChange", "cancelSubscriptionChange"]) {
    assert.match(controls, new RegExp(`\\b${a}\\b`));
  }
  assert.doesNotMatch(controls, /subscription\.ts|@\/app\/actions\/subscription"|prolongSubscriptionAction|recordManualSubscriptionPaymentAction|createSubscriptionPaymentRequest|confirmSubscriptionPayment/);
  assert.doesNotMatch(controls + panel, /@\/lib\/prisma|\bprisma\b|process\.env|localStorage|fetch\(/);
  assert.doesNotMatch(panel, /\buse(State|Effect|Reducer|Router)\b|@\/app\/actions|"use client"/);
});
