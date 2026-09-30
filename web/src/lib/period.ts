/**
 * Phase 10, Bloc 15 — single source of truth for "today"/"this month" day
 * boundaries. Extracted from src/lib/expenses-data.ts (Phase 9), which had
 * this exact logic inlined; Bloc 14 explicitly requires the dashboard reuse
 * the SAME period logic as /depenses rather than compute it a second way,
 * so duplicating it again here would violate that instruction directly.
 * expenses-data.ts now imports from here too (see its diff in the Phase 10
 * report) — the only touch to a Phase 9 file, and it changes no behavior.
 *
 * TIMEZONE STRATEGY (identified, not invented): this project has never used
 * an explicit timezone library or UTC conversion anywhere. Every existing
 * "today"/date-boundary computation (src/app/reservations/reservations-data.ts's
 * `startOfToday`/`endOfToday`, and this file's own predecessor in
 * expenses-data.ts) uses native `Date` methods (`setHours(0,0,0,0)`,
 * `getFullYear()`/`getMonth()`), which operate in the Node process's LOCAL
 * time. Postgres columns are `TIMESTAMP` without time zone (see any
 * migration.sql — e.g. `"paidAt" TIMESTAMP(3)`), so no conversion happens at
 * the database layer either. The de facto V1 convention is therefore:
 * "today"/"this month" mean the SERVER PROCESS's local wall-clock day/month,
 * consistently, everywhere. This file makes that convention explicit and
 * shared instead of leaving it as three separate inline copies — no new
 * convention is introduced, the existing one is just centralized.
 */

export type DateRange = { gte: Date; lt: Date };

/** [start of today, start of tomorrow) in server local time. */
export function todayRange(now: Date = new Date()): DateRange {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { gte: start, lt: end };
}

/** [start of this calendar month, start of next month) in server local time. */
export function monthRange(now: Date = new Date()): DateRange {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { gte: start, lt: end };
}
