import { REASON_MAX_LENGTH, validateRejectionReason } from "@/lib/subscription-change-rules";

/**
 * Lot 3B (B2.14-B) — logique PURE des interactions de décision (approbation, rejet, annulation) :
 * aucune dépendance à React, au navigateur ni au serveur, donc testable sans rendu. Le composant client
 * ne fait que relier cette logique aux actions serveur existantes (injectées ici, jamais importées) et à
 * l'interface.
 *
 * Rappels de sécurité :
 * - rien ici ne décide de l'autorisation : les actions serveur (`approveSubscriptionChange`,
 *   `rejectSubscriptionChange`, `cancelSubscriptionChange`) revérifient session, permission explicite,
 *   statut, demandeur et établissement. Les indicateurs de l'interface ne sont qu'un confort ;
 * - la validation du motif de rejet réutilise la règle pure du serveur (`validateRejectionReason`) pour
 *   un retour immédiat, mais le serveur reste l'autorité finale ;
 * - aucune opération n'est relancée automatiquement : une erreur ou une réponse ambiguë demande une
 *   actualisation et une nouvelle décision EXPLICITE de l'utilisateur.
 */

export { REASON_MAX_LENGTH };

export type DecisionMode = "idle" | "confirm-approve" | "reject-form" | "confirm-cancel";

export type DecisionResult = {
  /** `stale` : les données ont changé ; `unknown` : réponse non confirmée (réseau, erreur inattendue). */
  kind: "success" | "error" | "stale" | "unknown";
  message: string;
};

export type DecisionState = {
  mode: DecisionMode;
  pending: boolean;
  /** Brouillon du motif de rejet (conservé tant que la demande n'a pas été rejetée avec succès). */
  reason: string;
  /** Erreur de validation locale du motif, associée au champ. */
  fieldError: string | null;
  result: DecisionResult | null;
};

export const initialDecisionState: DecisionState = {
  mode: "idle",
  pending: false,
  reason: "",
  fieldError: null,
  result: null,
};

export type DecisionOutcome =
  | { status: "success"; message: string }
  | { status: "error"; message: string }
  | { status: "stale"; message: string }
  | { status: "unknown"; message: string }
  | { status: "invalid"; message: string }
  /** Soumission ignorée : une décision est déjà en cours pour cette demande. */
  | { status: "ignored" };

export type DecisionEvent =
  | { type: "open"; mode: Exclude<DecisionMode, "idle"> }
  | { type: "close" }
  | { type: "reason-changed"; reason: string }
  | { type: "submit-start" }
  | { type: "clear-result" }
  | { type: "outcome"; outcome: Exclude<DecisionOutcome, { status: "ignored" }> };

/** Transition d'état de l'interface de décision (fonction pure). */
export function reduceDecisionState(state: DecisionState, event: DecisionEvent): DecisionState {
  switch (event.type) {
    case "open":
      // Aucune ouverture pendant une requête : les commandes sont désactivées.
      return state.pending ? state : { ...state, mode: event.mode, fieldError: null, result: null };
    case "close":
      return state.pending ? state : { ...state, mode: "idle", fieldError: null };
    case "reason-changed":
      return state.pending ? state : { ...state, reason: event.reason, fieldError: null };
    case "submit-start":
      return { ...state, pending: true, fieldError: null, result: null };
    case "clear-result":
      return state.pending ? state : { ...state, result: null };
    case "outcome": {
      const { outcome } = event;
      switch (outcome.status) {
        case "success":
          // Décision enregistrée : on referme tout et on vide le brouillon.
          return { ...state, mode: "idle", pending: false, reason: "", fieldError: null, result: { kind: "success", message: outcome.message } };
        case "invalid":
          // Validation locale : aucune requête n'a été faite ; le texte saisi est conservé.
          return { ...state, pending: false, fieldError: outcome.message, result: null };
        case "error":
          // Refus du serveur : on garde le contexte (formulaire ouvert, texte saisi) pour corriger ou réessayer.
          return { ...state, pending: false, result: { kind: "error", message: outcome.message } };
        case "stale":
        case "unknown":
          // Les données ont changé ou la réponse est inconnue : on referme et on propose d'actualiser.
          return { ...state, mode: "idle", pending: false, fieldError: null, result: { kind: outcome.status, message: outcome.message } };
      }
    }
  }
}

type ServerResult = { error?: string; requestId?: string };

export type DecisionDeps = {
  approve: (input: { requestId: string }) => Promise<ServerResult>;
  reject: (input: { requestId: string; reason: string }) => Promise<ServerResult>;
  cancel: (input: { requestId: string }) => Promise<ServerResult>;
  /** Actualise les données de la page ; appelée UNIQUEMENT après une réussite confirmée par le serveur. */
  refresh: () => void;
};

export const APPROVED_MESSAGE = "Demande approuvée : le paiement ou la prolongation a été appliqué.";
export const REJECTED_MESSAGE = "Demande rejetée.";
export const CANCELLED_MESSAGE = "Demande annulée.";
export const UNKNOWN_OUTCOME_MESSAGE =
  "La réponse du serveur n'a pas pu être confirmée. Actualisez les données pour vérifier l'état de la demande avant de réessayer : l'opération n'est jamais relancée automatiquement.";

// Messages métier des actions serveur qui signifient « les données ont changé depuis le chargement de la
// page » (décision concurrente, abonnement modifié, demande disparue). L'action ne renvoie pas de code :
// la classification repose sur ces textes, couverts par les tests.
const STALE_PATTERN = /déjà été traitée|traitée par quelqu'un d'autre|modifié entre-temps|Demande introuvable/i;

function classify(error: string): DecisionOutcome {
  return STALE_PATTERN.test(error) ? { status: "stale", message: `${error} Les données ont changé : actualisez-les.` } : { status: "error", message: error };
}

/**
 * Exécuteur des décisions. Une seule décision à la fois par instance (garde contre la double
 * soumission, en plus de la désactivation des boutons). Ne relance jamais une opération.
 */
export function createDecisionRunner(deps: DecisionDeps) {
  let inFlight = false;

  async function run(call: () => Promise<ServerResult>, successMessage: string): Promise<DecisionOutcome> {
    if (inFlight) return { status: "ignored" };
    inFlight = true;
    try {
      const result = await call();
      if (typeof result?.error === "string" && result.error !== "") return classify(result.error);
      if (typeof result?.requestId !== "string") return { status: "unknown", message: UNKNOWN_OUTCOME_MESSAGE };
      deps.refresh();
      return { status: "success", message: successMessage };
    } catch {
      // Erreur réseau ou inattendue : l'opération a pu aboutir ; ne jamais conclure ni relancer.
      return { status: "unknown", message: UNKNOWN_OUTCOME_MESSAGE };
    } finally {
      inFlight = false;
    }
  }

  return {
    isBusy: () => inFlight,
    approve: (requestId: string) => run(() => deps.approve({ requestId }), APPROVED_MESSAGE),
    cancel: (requestId: string) => run(() => deps.cancel({ requestId }), CANCELLED_MESSAGE),
    reject: async (requestId: string, reason: string): Promise<DecisionOutcome> => {
      if (inFlight) return { status: "ignored" };
      const checked = validateRejectionReason(reason);
      if (!checked.valid) return { status: "invalid", message: checked.error };
      return run(() => deps.reject({ requestId, reason: checked.value }), REJECTED_MESSAGE);
    },
  };
}
