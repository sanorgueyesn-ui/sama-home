import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";

/**
 * Bloc 15 — history for a reservation: only payments collected in that
 * context. Phase 3C / Lot C1 — `establishmentId` filtré explicitement sur
 * la requête (jamais seulement supposé correct via `reservationId`).
 */
export async function listPaymentsForReservation(reservationId: string) {
  const user = await getCurrentUser();
  if (!user.establishmentId) {
    return [];
  }
  return prisma.payment.findMany({
    where: { reservationId, establishmentId: user.establishmentId },
    orderBy: { paidAt: "asc" },
  });
}

/**
 * Bloc 15/19 — history for a rental: its own payments PLUS, when it was born
 * from a reservation ("Faire entrer"), the payments collected while it was
 * still that reservation — same union as getRentalPaymentSummary, so the
 * history list and the totals it's derived from can never disagree.
 * Phase 3C / Lot C1 — `establishmentId` filtré explicitement sur la requête
 * de `Payment` (le `findUniqueOrThrow` sur `Rental` ci-dessous reste une
 * lecture par identifiant non filtrée, hors périmètre de ce lot).
 */
export async function listPaymentsForRental(rentalId: string) {
  const user = await getCurrentUser();
  if (!user.establishmentId) {
    return [];
  }
  const rental = await prisma.rental.findUniqueOrThrow({
    where: { id: rentalId },
    select: { reservationId: true },
  });
  return prisma.payment.findMany({
    where: {
      establishmentId: user.establishmentId,
      ...(rental.reservationId
        ? { OR: [{ rentalId }, { reservationId: rental.reservationId }] }
        : { rentalId }),
    },
    orderBy: { paidAt: "asc" },
  });
}
