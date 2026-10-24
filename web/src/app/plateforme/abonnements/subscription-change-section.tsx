import { getSubscriptionChangeOverview } from "@/lib/subscription-change-data";
import { SubscriptionChangeRequestsView, type SubscriptionChangeSectionState } from "./subscription-change-view";

/**
 * Lot 3B (B2.14-A) — composant SERVEUR qui lit les demandes puis les confie au composant de
 * présentation. Il est rendu dans un `<Suspense>` par la page (état de chargement au plus près de la
 * donnée, comme le recommande le guide Next.js du dépôt). La lecture passe EXCLUSIVEMENT par
 * `getSubscriptionChangeOverview()`, qui vérifie la session et la permission explicite côté serveur :
 * aucune requête de base ici, aucune identité ni permission venant du navigateur.
 *
 * - `null` (permission explicite absente) → état « forbidden » : aucune donnée n'est lue ni affichée ;
 * - échec de lecture → état « error » : la section ne prétend jamais que les données sont chargées, et
 *   aucun détail technique n'est exposé (l'erreur est seulement journalisée côté serveur) ;
 * - les erreurs internes de Next.js (redirection, etc.) sont relancées telles quelles.
 */

function isNextInternalError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && /^(NEXT_|DYNAMIC_SERVER_USAGE|BAILOUT_TO_CLIENT_SIDE_RENDERING)/.test(digest);
}

export async function loadSubscriptionChangeState(): Promise<SubscriptionChangeSectionState> {
  try {
    const overview = await getSubscriptionChangeOverview();
    if (overview === null) return { status: "forbidden" };
    return { status: "ready", overview };
  } catch (error) {
    if (isNextInternalError(error)) throw error;
    console.error("SubscriptionChangeRequestsSection() — échec de la lecture des demandes :", error);
    return { status: "error" };
  }
}

export async function SubscriptionChangeRequestsSection() {
  const state = await loadSubscriptionChangeState();
  return <SubscriptionChangeRequestsView state={state} />;
}
