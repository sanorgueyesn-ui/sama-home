/**
 * Central duration-conversion service (Phase 6, Bloc 5). Every place that
 * needs to turn a Tariff's (durationValue, durationUnit) into a real instant
 * — computing departureTime, checking overlaps — must go through this file,
 * so the conversion rule only ever lives in one place.
 *
 * ASSUMPTIONS FLAGGED FOR CONFIRMATION (none of this is specified elsewhere
 * in the brief, and the master prompt explicitly asked to signal rather than
 * silently invent):
 *
 * - NIGHT (nuitée) is treated as exactly 24h from the arrival instant. No
 *   fixed checkout time (e.g. "noon regardless of arrival time") is
 *   specified anywhere in the brief. If the business wants a fixed checkout
 *   policy, that's a deliberate rule to add later, not something invented
 *   here.
 * - MONTH is real calendar-month addition (JS Date month arithmetic), NOT a
 *   fixed 30-day/43200-minute approximation. This means the resulting
 *   duration in minutes varies (28 to 31 days) depending on the month.
 *   Bloc K.1 — edge case resolved: adding a month to a day that doesn't
 *   exist in the target month (e.g. Jan 31 + 1 month) is clamped to that
 *   target month's last day (Jan 31 -> Feb 28/29, never Mar 2/3), same rule
 *   as `advanceNextRunAt()`'s MONTHLY case (src/app/actions/bank.ts, Bloc
 *   H.1) — kept as a separate, duplicated implementation rather than a
 *   shared helper: this file has no dependency on the frozen bank/caisse
 *   engine, and Bloc K.1's scope explicitly excludes touching it.
 */

export type DurationUnitValue = "HOURS" | "NIGHT" | "DAY" | "WEEK" | "MONTH";

const FIXED_MINUTES: Record<Exclude<DurationUnitValue, "MONTH">, number> = {
  HOURS: 60,
  NIGHT: 24 * 60,
  DAY: 24 * 60,
  WEEK: 7 * 24 * 60,
};

const UNIT_WORDS: Record<DurationUnitValue, { singular: string; plural: string }> = {
  HOURS: { singular: "heure", plural: "heures" },
  NIGHT: { singular: "nuitée", plural: "nuits" },
  DAY: { singular: "jour", plural: "jours" },
  WEEK: { singular: "semaine", plural: "semaines" },
  MONTH: { singular: "mois", plural: "mois" },
};

/** Human-readable duration, e.g. `formatDuration(2, "HOURS")` -> "2 heures". */
export function formatDuration(value: number, unit: DurationUnitValue): string {
  const words = UNIT_WORDS[unit];
  if (value === 1) return words.singular.charAt(0).toUpperCase() + words.singular.slice(1);
  return `${value} ${words.plural}`;
}

/** Computes the departure instant from an arrival instant and a duration. */
export function computeDepartureTime(
  arrivalTime: Date,
  durationValue: number,
  durationUnit: DurationUnitValue,
): Date {
  if (durationUnit === "MONTH") {
    const result = new Date(arrivalTime);
    const day = result.getDate();
    const year = result.getFullYear();
    const targetMonthIndex = result.getMonth() + durationValue;
    const lastDayOfTargetMonth = new Date(year, targetMonthIndex + 1, 0).getDate();
    result.setFullYear(year, targetMonthIndex, Math.min(day, lastDayOfTargetMonth));
    return result;
  }
  const minutes = durationValue * FIXED_MINUTES[durationUnit];
  return new Date(arrivalTime.getTime() + minutes * 60_000);
}
