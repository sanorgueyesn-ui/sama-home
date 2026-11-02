// Formules d'abonnement : prix et plafonds, lus dans la grille officielle (pricing-config.ts).
// Module pur (aucune dépendance serveur) : importable partout, testable.
import { CATEGORY_PRICING, type BillingCycle, type EstablishmentCategory, type PlanTier as PlanId } from "./pricing-config";

export type PlanTierValue = "ESSENTIAL" | "PRO" | "PREMIUM";
export type BusinessModeName = "HOTEL" | "RESIDENCE" | "REAL_ESTATE";

const TIER_TO_PLAN: Record<PlanTierValue, PlanId> = { ESSENTIAL: "essential", PRO: "pro", PREMIUM: "premium" };

export function categoryOfMode(mode: BusinessModeName): EstablishmentCategory {
  return mode === "HOTEL" ? "hotel" : mode === "REAL_ESTATE" ? "agency" : "residence";
}

export function isPlanTier(value: unknown): value is PlanTierValue {
  return value === "ESSENTIAL" || value === "PRO" || value === "PREMIUM";
}

export function isBillingCycle(value: unknown): value is BillingCycle {
  return value === "monthly" || value === "annual";
}

/** Prix en FCFA et durée en mois d'une formule, ou `null` si elle n'existe pas pour cette activité. */
export function planOffer(mode: BusinessModeName, tier: PlanTierValue, cycle: BillingCycle) {
  const category = CATEGORY_PRICING[categoryOfMode(mode)];
  const plan = category.plans.find((p) => p.id === TIER_TO_PLAN[tier]);
  if (!plan) return null;
  return {
    name: plan.name,
    categoryTitle: category.shortTitle,
    amountFcfa: cycle === "annual" ? plan.priceAnnual : plan.priceMonthly,
    periodMonths: cycle === "annual" ? 12 : 1,
  };
}

/** Plafonds numériques d'une formule (`null` = illimité), tirés de la grille — jamais saisis à la main ailleurs. */
export function planCaps(mode: BusinessModeName, tier: PlanTierValue): { units: number | null; users: number | null } | null {
  const category = CATEGORY_PRICING[categoryOfMode(mode)];
  const plan = category.plans.find((p) => p.id === TIER_TO_PLAN[tier]);
  if (!plan) return null;
  const read = (text: string): number | null => {
    const match = /\d+/.exec(text);
    return match ? Number(match[0]) : null; // « Illimité » : aucun nombre
  };
  return { units: read(plan.limits.unitsMax), users: read(plan.limits.usersMax) };
}

/** Un nombre existant atteint-il le plafond ? (`null` = illimité). Seule une NOUVELLE création est refusée. */
export function isOverCap(existing: number, cap: number | null): boolean {
  return cap !== null && existing >= cap;
}
