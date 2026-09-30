import "server-only";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { todayRange, monthRange } from "@/lib/period";
import { getPropertyStatuses, type PropertyStatus } from "@/lib/property-status";
import { getRentalPaymentSummaries } from "@/lib/payment-summary";
import { listReservations } from "@/lib/reservations-data";
import { listRentals } from "@/lib/rentals-data";

/**
 * Phase 10, Bloc 3/12/13 — this file is a pure read/aggregation layer: it
 * reuses every existing service (property-status, payment-summary,
 * reservations-data, rentals-data) and adds no new business rule. Every
 * figure comes from a targeted Prisma aggregation (COUNT/SUM/groupBy),
 * never a full-table load reduced in JavaScript.
 */

export type FinancialSummary = {
  revenueToday: number;
  expenseToday: number;
  balanceToday: number;
  revenueMonth: number;
  expenseMonth: number;
  balanceMonth: number;
};

/**
 * Bloc 4/13 — revenue is SUM(Payment.amount) by Payment.paidAt, the actual
 * collection date, never a reservation/arrival/creation date. Each Payment
 * row is counted exactly once (it belongs to either a Reservation or a
 * Rental, never both — see the Payment_context_check DB constraint from
 * Phase 8); summing Payment.amount directly, without ever touching
 * Reservation.deposit/Rental.deposit, is what makes this automatic (Bloc 13:
 * "ne pas additionner Reservation.deposit + Payment").
 */
export async function getFinancialSummary(now: Date = new Date()): Promise<FinancialSummary> {
  await verifySession();

  const today = todayRange(now);
  const month = monthRange(now);

  const [revenueTodayAgg, revenueMonthAgg, expenseTodayAgg, expenseMonthAgg] = await Promise.all([
    prisma.payment.aggregate({ where: { paidAt: today }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { paidAt: month }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { paidAt: today }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { paidAt: month }, _sum: { amount: true } }),
  ]);

  const revenueToday = revenueTodayAgg._sum.amount ?? 0;
  const revenueMonth = revenueMonthAgg._sum.amount ?? 0;
  const expenseToday = expenseTodayAgg._sum.amount ?? 0;
  const expenseMonth = expenseMonthAgg._sum.amount ?? 0;

  // Bloc 5 — never stored, always this subtraction, computed on every read.
  return {
    revenueToday,
    expenseToday,
    balanceToday: revenueToday - expenseToday,
    revenueMonth,
    expenseMonth,
    balanceMonth: revenueMonth - expenseMonth,
  };
}

/** Bloc 6 — counts by computed status, using the exact Phase 7 batch service. */
export async function getPropertyStatusCounts(): Promise<Record<PropertyStatus, number>> {
  await verifySession();

  const properties = await prisma.property.findMany({ select: { id: true, active: true }, take: 500 });
  const statuses = await getPropertyStatuses(properties);

  const counts: Record<PropertyStatus, number> = { AVAILABLE: 0, OCCUPIED: 0, RESERVED: 0, UNAVAILABLE: 0 };
  for (const status of statuses.values()) {
    counts[status]++;
  }
  return counts;
}

/**
 * Bloc 7 — "arrivées prévues aujourd'hui": reuses listReservations's own
 * existing "today" filter verbatim (Reservation.date within today), with no
 * new status logic layered on top — see the Phase 10 report for why any
 * status (including CANCELLED) is deliberately left visible exactly as that
 * existing filter already returns it, each tagged with its own status badge.
 */
export async function getTodayArrivals() {
  // Phase 14 audit fix: every other exported data-layer function in this
  // project asserts its own verifySession() directly rather than relying on
  // a callee to do it (defense-in-depth + an auditable invariant: grepping
  // for verifySession()/requireAdmin() should account for every exported
  // function). This one was already protected transitively (listReservations
  // calls it internally) — never actually exploitable — but a future
  // refactor of listReservations could silently drop that protection
  // without this file's own tests catching it. Zero behavior change: cache()
  // memoizes verifySession() per request, so this adds no extra DB round trip.
  await verifySession();
  const { items } = await listReservations({ timeFilter: "today" });
  return items;
}

/**
 * Bloc 7 — "départs prévus aujourd'hui": ACTIVE rentals whose
 * plannedDepartureAt falls in today's window. No equivalent named filter
 * existed in rentals-data.ts (its timeFilter is about status, not departure
 * date), so this is a new, narrowly-scoped query combining two fields that
 * already exist — not a new business rule.
 */
export async function getTodayDepartures(now: Date = new Date()) {
  await verifySession();
  const today = todayRange(now);
  return prisma.rental.findMany({
    where: { status: "ACTIVE", plannedDepartureAt: today },
    include: {
      client: { select: { id: true, name: true, phone: true } },
      property: { select: { id: true, name: true } },
    },
    orderBy: { plannedDepartureAt: "asc" },
  });
}

/**
 * Bloc 8 — active rentals with their real payment summary, batch-computed
 * (Bloc 12: no N+1) via the exact Phase 8 service.
 */
export async function getActiveRentalsWithPayments() {
  // Phase 14 audit fix: same reasoning as getTodayArrivals above — was only
  // transitively protected via listRentals(), now also asserts directly.
  await verifySession();
  const { items, truncated } = await listRentals({ timeFilter: "active" });
  const summaries = await getRentalPaymentSummaries(prisma, items);
  return { items, summaries, truncated };
}
