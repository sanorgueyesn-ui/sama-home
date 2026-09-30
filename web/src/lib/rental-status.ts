/**
 * Time-state for an ACTIVE rental (Phase 7, Bloc 11). Pure function, never
 * stored in the database — always computed from `now` and
 * `plannedDepartureAt`, exactly as instructed.
 */

/** Centralized, configurable threshold — the only place this number lives. */
export const DEPARTURE_SOON_THRESHOLD_MINUTES = 30;

export type RentalTimeState = "normal" | "near" | "overdue";

export function computeRentalTimeState(now: Date, plannedDepartureAt: Date): RentalTimeState {
  const remainingMs = plannedDepartureAt.getTime() - now.getTime();
  if (remainingMs <= 0) return "overdue";
  if (remainingMs <= DEPARTURE_SOON_THRESHOLD_MINUTES * 60_000) return "near";
  return "normal";
}

function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}` : `${m} min`;
}

/**
 * Accessible text alongside the color (Bloc 12): "Normal", "Départ dans 24
 * min", "Dépassé de 12 min" — never color alone.
 */
export function formatRentalTimeText(now: Date, plannedDepartureAt: Date): string {
  const diffMs = plannedDepartureAt.getTime() - now.getTime();
  const absMinutes = Math.round(Math.abs(diffMs) / 60_000);
  if (diffMs <= 0) return `Dépassé de ${formatMinutes(absMinutes)}`;
  if (diffMs <= DEPARTURE_SOON_THRESHOLD_MINUTES * 60_000) return `Départ dans ${formatMinutes(absMinutes)}`;
  return "Normal";
}
