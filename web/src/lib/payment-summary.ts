import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Central, single-source-of-truth financial calculation (Phase 8, Bloc 6):
 * every page and every server action that needs totalDue/totalPaid/remaining
 * must go through this file — never re-derive the formula locally.
 *
 * `client` mirrors the existing convention in src/lib/availability.ts
 * (`findAvailabilityConflict(prisma | tx, ...)`): callers pass either the
 * top-level `prisma` singleton for a read-only display, or a transaction
 * client (`tx`) when the result must be re-verified atomically before
 * accepting a new payment (Bloc 17/18).
 */
type DbClient = Pick<typeof prisma, "reservation" | "rental" | "payment">;

export type PaymentStatus = "NON_PAYE" | "PARTIEL" | "PAYE";

export type PaymentSummary = {
  totalDue: number;
  totalPaid: number;
  remaining: number;
  status: PaymentStatus;
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  NON_PAYE: "Non payé",
  PARTIEL: "Partiel",
  PAYE: "Payé",
};

/** Bloc 9 — never derived from the mere presence/absence of a legacy deposit. */
export function computePaymentStatus(totalDue: number, totalPaid: number): PaymentStatus {
  if (totalPaid <= 0) return "NON_PAYE";
  if (totalPaid >= totalDue) return "PAYE";
  return "PARTIEL";
}

function summarize(totalDue: number, totalPaid: number): PaymentSummary {
  return {
    totalDue,
    totalPaid,
    remaining: Math.max(totalDue - totalPaid, 0),
    status: computePaymentStatus(totalDue, totalPaid),
  };
}

/** Bloc 6 — "Pour une réservation : totalDue = Reservation.amount". */
export async function getReservationPaymentSummary(
  client: DbClient,
  reservationId: string,
): Promise<PaymentSummary> {
  const reservation = await client.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    select: { amount: true },
  });
  const agg = await client.payment.aggregate({
    where: { reservationId },
    _sum: { amount: true },
  });
  return summarize(reservation.amount, agg._sum.amount ?? 0);
}

/**
 * Bloc 6/7/19 — totalDue for a rental.
 *
 * IMPORTANT (self-caught, documented in the Phase 8 report): Bloc 6 says
 * "totalDue = Rental.amount + SUM(RentalExtension.amount)", but Rental.amount
 * is ALREADY a running total that includes every extension — see
 * `extendRental` in src/app/actions/rentals.ts, which does
 * `amount: { increment: tariff.amount }` on every prolongation (Phase 7
 * design, schema.prisma comment on `model Rental`). Adding
 * SUM(RentalExtension.amount) on top of Rental.amount would double-count
 * every extension. totalDue is therefore `rental.amount` alone — verified
 * against the exact Bloc 7 worked example (20000 initial + 5000 + 5000 =
 * 30000 total due) in the Phase 8 test battery.
 *
 * Bloc 19 — a rental born from a reservation ("Faire entrer") sums payments
 * made in BOTH contexts: those collected while it was still a reservation
 * (linked via reservationId, never re-linked at check-in) and those
 * collected since (linked via rentalId). Each Payment row has exactly one of
 * the two set (enforced by the Payment_context_check DB constraint), so this
 * can never double-count a single row.
 */
export async function getRentalPaymentSummary(client: DbClient, rentalId: string): Promise<PaymentSummary> {
  const rental = await client.rental.findUniqueOrThrow({
    where: { id: rentalId },
    select: { amount: true, reservationId: true },
  });
  const agg = await client.payment.aggregate({
    where: rental.reservationId
      ? { OR: [{ rentalId }, { reservationId: rental.reservationId }] }
      : { rentalId },
    _sum: { amount: true },
  });
  return summarize(rental.amount, agg._sum.amount ?? 0);
}
