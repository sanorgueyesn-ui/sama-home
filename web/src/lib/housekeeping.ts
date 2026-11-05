// Ménage : règles pures (aucune base). La propreté est un axe distinct de l'occupation : une chambre
// libre n'est pas forcément prête à être relouée.
import type { PropertyStatus } from "@/lib/property-status";

/** Le suivi du ménage existe pour les hôtels et les résidences (pas pour une agence immobilière). */
export function supportsHousekeeping(mode: string | null | undefined): boolean {
  return mode === "HOTEL" || mode === "RESIDENCE";
}

export type CleaningStatusValue = "DIRTY" | "IN_PROGRESS" | "CLEAN";

export const CLEANING_VALUES: readonly CleaningStatusValue[] = ["DIRTY", "IN_PROGRESS", "CLEAN"];

export const CLEANING_LABELS: Record<CleaningStatusValue, string> = {
  DIRTY: "À nettoyer",
  IN_PROGRESS: "Nettoyage en cours",
  CLEAN: "Prête",
};

export function isCleaningStatus(value: unknown): value is CleaningStatusValue {
  return typeof value === "string" && (CLEANING_VALUES as readonly string[]).includes(value);
}

/** Actions proposées au personnel depuis un statut donné (jamais l'état courant lui-même). */
export function cleaningActions(from: CleaningStatusValue): { to: CleaningStatusValue; label: string }[] {
  switch (from) {
    case "DIRTY":
      return [
        { to: "IN_PROGRESS", label: "Commencer" },
        { to: "CLEAN", label: "Marquer prête" },
      ];
    case "IN_PROGRESS":
      return [
        { to: "CLEAN", label: "Marquer prête" },
        { to: "DIRTY", label: "À nettoyer" },
      ];
    case "CLEAN":
      return [{ to: "DIRTY", label: "Signaler à nettoyer" }];
  }
}

export function canChangeCleaning(from: CleaningStatusValue, to: CleaningStatusValue): boolean {
  return from !== to;
}

export type Readiness = "OCCUPIED" | "READY" | "NOT_READY" | "UNAVAILABLE";

/** Prête à louer = libre (ou réservée plus tard) ET propre. Une unité occupée n'est jamais « prête ». */
export function readiness(cleaning: CleaningStatusValue, occupancy: PropertyStatus): Readiness {
  if (occupancy === "UNAVAILABLE") return "UNAVAILABLE";
  if (occupancy === "OCCUPIED") return "OCCUPIED";
  return cleaning === "CLEAN" ? "READY" : "NOT_READY";
}

const CLEANING_ORDER: Record<CleaningStatusValue, number> = { DIRTY: 0, IN_PROGRESS: 1, CLEAN: 2 };

/** Ordre de travail : d'abord ce qui est à nettoyer et libre, les unités occupées en dernier. */
export function compareForHousekeeping(
  a: { name: string; cleaning: CleaningStatusValue; occupancy: PropertyStatus },
  b: { name: string; cleaning: CleaningStatusValue; occupancy: PropertyStatus },
): number {
  const occupiedA = a.occupancy === "OCCUPIED" ? 1 : 0;
  const occupiedB = b.occupancy === "OCCUPIED" ? 1 : 0;
  if (occupiedA !== occupiedB) return occupiedA - occupiedB;
  if (a.cleaning !== b.cleaning) return CLEANING_ORDER[a.cleaning] - CLEANING_ORDER[b.cleaning];
  return a.name.localeCompare(b.name, "fr", { numeric: true });
}
