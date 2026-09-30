import "server-only";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

/** Bloc 15 — history for a reservation: only payments collected in that context. */
export async function listPaymentsForReservation(reservationId: string) {
  await verifySession();
  return prisma.payment.findMany({
    where: { reservationId },
    orderBy: { paidAt: "asc" },
  });
}

/**
 * Bloc 15/19 — history for a rental: its own payments PLUS, when it was born
 * from a reservation ("Faire entrer"), the payments collected while it was
 * still that reservation — same union as getRentalPaymentSummary, so the
 * history list and the totals it's derived from can never disagree.
 */
export async function listPaymentsForRental(rentalId: string) {
  await verifySession();
  const rental = await prisma.rental.findUniqueOrThrow({
    where: { id: rentalId },
    select: { reservationId: true },
  });
  return prisma.payment.findMany({
    where: rental.reservationId
      ? { OR: [{ rentalId }, { reservationId: rental.reservationId }] }
      : { rentalId },
    orderBy: { paidAt: "asc" },
  });
}
