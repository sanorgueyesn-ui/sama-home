"use client";

import { useId, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveSubscriptionChange,
  cancelSubscriptionChange,
  rejectSubscriptionChange,
} from "@/app/actions/subscription-change";
import {
  createDecisionRunner,
  initialDecisionState,
  reduceDecisionState,
  type DecisionOutcome,
} from "./subscription-change-decision-logic";
import { DecisionPanelView, type DecisionSummary } from "./subscription-change-decision-panel";

/**
 * Lot 3B (B2.14-B) — commandes de décision d'une demande (composant client). Relie l'état d'interface et la
 * logique pure aux TROIS actions serveur existantes ; aucune règle métier ici. Props sérialisables
 * uniquement (texte et booléens) : jamais d'identité, de permission ni de donnée sensible venant du
 * navigateur. Les indicateurs `canApprove`, `canReject` et `canCancel` viennent de la lecture serveur et ne
 * font que choisir les boutons affichés ; l'autorisation réelle est revérifiée par chaque action.
 *
 * Après une réussite confirmée, la page est actualisée (`router.refresh()`), ce qui fait changer la demande
 * de section. Rien n'est jamais relancé automatiquement.
 */
export function SubscriptionChangeDecisionControls(props: {
  requestId: string;
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
  summary: DecisionSummary;
}) {
  const router = useRouter();
  const reasonId = useId();
  const errorId = useId();
  const [state, dispatch] = useReducer(reduceDecisionState, initialDecisionState);
  const [runner] = useState(() =>
    createDecisionRunner({
      approve: approveSubscriptionChange,
      reject: rejectSubscriptionChange,
      cancel: cancelSubscriptionChange,
      refresh: () => router.refresh(),
    }),
  );

  async function submit(operation: () => Promise<DecisionOutcome>) {
    // Double soumission : ni clic répété, ni validation pendant qu'une décision est en cours.
    if (runner.isBusy() || state.pending) return;
    dispatch({ type: "submit-start" });
    const outcome = await operation();
    if (outcome.status === "ignored") return;
    dispatch({ type: "outcome", outcome });
  }

  return (
    <DecisionPanelView
      state={state}
      flags={{ canApprove: props.canApprove, canReject: props.canReject, canCancel: props.canCancel }}
      summary={props.summary}
      ids={{ reason: reasonId, error: errorId }}
      onOpen={(mode) => dispatch({ type: "open", mode })}
      onClose={() => dispatch({ type: "close" })}
      onReasonChange={(reason) => dispatch({ type: "reason-changed", reason })}
      onApprove={() => void submit(() => runner.approve(props.requestId))}
      onReject={() => void submit(() => runner.reject(props.requestId, state.reason))}
      onCancel={() => void submit(() => runner.cancel(props.requestId))}
      onRefresh={() => {
        dispatch({ type: "clear-result" });
        router.refresh();
      }}
    />
  );
}
