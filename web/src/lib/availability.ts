import "server-only";
import type { ReservationStatus, RentalStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Centralized availability service. Originally Phase 6 (Reservation only);
 * extended in Phase 7 (Bloc 7) to also check active Rental records, so that
 * a reservation can't be booked over a walk-in that's currently occupying
 * the room, and a new rental can't be booked over either. Every caller —
 * createReservation/updateReservation (Phase 6), createRentalDirect,
 * checkInReservation, extendRental (Phase 7) — goes through this one
 * function; the interval-overlap rule and the two tables it queries live
 * here ONLY.
 */
const BLOCKING_RESERVATION_STATUSES: ReservationStatus[] = ["CONFIRMED", "ARRIVED"];
const BLOCKING_RENTAL_STATUSES: RentalStatus[] = ["ACTIVE"];

/** Structural minimum both `prisma` and a `prisma.$transaction` callback's `tx` satisfy. */
type AvailabilityQueryable = Pick<typeof prisma, "reservation" | "rental">;

export type AvailabilityConflict = {
  kind: "reservation" | "rental";
  id: string;
  arrivalTime: Date;
  departureTime: Date;
  clientName: string;
};

/**
 * Interval-overlap rule (unchanged since Phase 6, Bloc 6/8): newStart <
 * existingEnd AND newEnd > existingStart. An interval that starts exactly
 * when another ends is NOT a conflict (back-to-back bookings are allowed).
 *
 * Checks reservations first, then rentals, and returns whichever conflict
 * is found first — callers only need to know THAT something conflicts and
 * how to describe it, not which table it came from.
 */
export async function findAvailabilityConflict(
  db: AvailabilityQueryable,
  params: {
    propertyId: string;
    arrivalTime: Date;
    departureTime: Date;
    excludeReservationId?: string;
    excludeRentalId?: string;
  },
): Promise<AvailabilityConflict | null> {
  const reservationConflict = await db.reservation.findFirst({
    where: {
      propertyId: params.propertyId,
      status: { in: BLOCKING_RESERVATION_STATUSES },
      ...(params.excludeReservationId ? { id: { not: params.excludeReservationId } } : {}),
      arrivalTime: { lt: params.departureTime },
      departureTime: { gt: params.arrivalTime },
    },
    select: { id: true, arrivalTime: true, departureTime: true, client: { select: { name: true } } },
    orderBy: { arrivalTime: "asc" },
  });
  if (reservationConflict) {
    return {
      kind: "reservation",
      id: reservationConflict.id,
      arrivalTime: reservationConflict.arrivalTime,
      departureTime: reservationConflict.departureTime,
      // Lot "Reservation — client facultatif" : client désormais nullable
      // sur Reservation (pas sur Rental, branche ci-dessous inchangée).
      clientName: reservationConflict.client?.name ?? "Client non renseigné",
    };
  }

  const rentalConflict = await db.rental.findFirst({
    where: {
      propertyId: params.propertyId,
      status: { in: BLOCKING_RENTAL_STATUSES },
      ...(params.excludeRentalId ? { id: { not: params.excludeRentalId } } : {}),
      arrivalAt: { lt: params.departureTime },
      plannedDepartureAt: { gt: params.arrivalTime },
    },
    select: { id: true, arrivalAt: true, plannedDepartureAt: true, client: { select: { name: true } } },
    orderBy: { arrivalAt: "asc" },
  });
  if (rentalConflict) {
    return {
      kind: "rental",
      id: rentalConflict.id,
      arrivalTime: rentalConflict.arrivalAt,
      departureTime: rentalConflict.plannedDepartureAt,
      clientName: rentalConflict.client.name,
    };
  }

  return null;
}

export async function isPropertyAvailable(params: {
  propertyId: string;
  arrivalTime: Date;
  departureTime: Date;
  excludeReservationId?: string;
  excludeRentalId?: string;
}): Promise<boolean> {
  const conflict = await findAvailabilityConflict(prisma, params);
  return !conflict;
}
