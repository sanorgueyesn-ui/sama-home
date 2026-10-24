// Lot 3B (B2.14-B) — rendu réel du panneau de décision, exécuté dans un processus enfant SANS la condition
// `react-server` (indisponible pour `react-dom/server`). Aucune base, aucune action serveur : le panneau est
// un composant de présentation pur. Sortie : JSON { scénario: balisage HTML }.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DecisionPanelView, type DecisionPanelProps } from "../../../app/plateforme/abonnements/subscription-change-decision-panel";
import { initialDecisionState, type DecisionState } from "../../../app/plateforme/abonnements/subscription-change-decision-logic";

const summary = {
  kindLabel: "Paiement manuel",
  establishmentName: "Résidence <b>Teranga</b>",
  details: "12 500 FCFA · 6 mois",
  effect: "Un règlement confirmé de 12 500 FCFA sera enregistré et l'abonnement sera prolongé de 6 mois.",
};
const noop = () => {};

function render(state: Partial<DecisionState>, flags: Partial<DecisionPanelProps["flags"]> = {}): string {
  const props: DecisionPanelProps = {
    state: { ...initialDecisionState, ...state },
    flags: { canApprove: false, canReject: false, canCancel: false, ...flags },
    summary,
    ids: { reason: "reason-id", error: "error-id" },
    onOpen: noop,
    onClose: noop,
    onReasonChange: noop,
    onApprove: noop,
    onReject: noop,
    onCancel: noop,
    onRefresh: noop,
  };
  return renderToStaticMarkup(createElement(DecisionPanelView, props));
}

const all = { canApprove: true, canReject: true, canCancel: true };

const out: Record<string, string> = {
  none: render({}),
  approveOnly: render({}, { canApprove: true }),
  rejectOnly: render({}, { canReject: true }),
  cancelOnly: render({}, { canCancel: true }),
  all: render({}, all),
  confirmApprove: render({ mode: "confirm-approve" }, all),
  confirmApprovePending: render({ mode: "confirm-approve", pending: true }, all),
  confirmApproveWithoutFlag: render({ mode: "confirm-approve" }, { canReject: true }),
  rejectForm: render({ mode: "reject-form", reason: "Texte <i>saisi</i>" }, all),
  rejectFormError: render({ mode: "reject-form", reason: "   ", fieldError: "Un motif de rejet est obligatoire." }, all),
  rejectFormPending: render({ mode: "reject-form", reason: "Motif", pending: true }, all),
  rejectFormTooLong: render({ mode: "reject-form", reason: "a".repeat(501) }, all),
  confirmCancel: render({ mode: "confirm-cancel" }, all),
  serverError: render({ mode: "reject-form", reason: "Motif conservé", result: { kind: "error", message: "Vous n'avez pas la permission." } }, all),
  stale: render({ result: { kind: "stale", message: "Cette demande a déjà été traitée. Les données ont changé : actualisez-les." } }, all),
  unknown: render({ result: { kind: "unknown", message: "Réponse non confirmée." } }, all),
  success: render({ result: { kind: "success", message: "Demande rejetée." } }, all),
  successNoFlags: render({ result: { kind: "success", message: "Demande annulée." } }),
};

process.stdout.write(JSON.stringify(out));
