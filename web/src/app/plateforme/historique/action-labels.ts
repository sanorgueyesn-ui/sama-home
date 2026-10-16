import type { PlatformDecisionAction } from "@/lib/audit-log-data";

/**
 * Phase 3G / Lot D12-P95 — libellés lisibles pour les 8 actions de la liste
 * blanche (src/lib/audit-log-data.ts). `Record<PlatformDecisionAction, ...>`
 * garantit, à la compilation, un libellé pour chaque valeur de la liste
 * blanche — ni plus, ni moins, ni une action métier qui s'y glisserait.
 */
export const ACTION_LABELS: Record<PlatformDecisionAction, string> = {
  ESTABLISHMENT_APPROVED: "Établissement approuvé",
  ESTABLISHMENT_AUTO_APPROVED: "Établissement approuvé automatiquement",
  ESTABLISHMENT_REJECTED: "Établissement refusé",
  ESTABLISHMENT_SUSPENDED: "Établissement suspendu",
  ESTABLISHMENT_REACTIVATED: "Établissement réactivé",
  PLATFORM_AUTO_APPROVAL_ENABLED: "Approbation automatique activée",
  PLATFORM_AUTO_APPROVAL_DISABLED: "Approbation automatique désactivée",
  SUBSCRIPTION_PAYMENT_CONFIRMED: "Paiement d'abonnement confirmé",
  PRICING_SETTINGS_UPDATED: "Tarification globale modifiée",
};
