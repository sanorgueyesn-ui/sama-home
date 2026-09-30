import "server-only";
import type { ReservationStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Centralized availability service (Phase 6, Bloc 8). Today this only checks
 * Reservation. Phase 8 (Locations) must extend `findConflictingReservation`
 * to also check active Rental records for the same property/interval before
 * considering a slot free — callers (create/update reservation) should not
 * need to change when that happens, only this function's body.
 */
const BLOCKING_STATUSES: ReservationStatus[] = ["CONFIRMED", "ARRIVED"];

/** Structural minimum both `prisma` and a `prisma.$transaction` callback's `tx` satisfy. */
type ReservationQueryable = Pick<typeof prisma, "reservation">;

/**
 * Interval-overlap rule (Bloc 6): newStart < existingEnd AND newEnd >
 * existingStart. An interval that starts exactly when another ends is NOT a
 * conflict (back-to-back bookings are allowed).
 */
export async function findConflictingReservation(
  db: ReservationQueryable,
  params: {
    propertyId: string;
    arrivalTime: Date;
    departureTime: Date;
    excludeReservationId?: string;
  },
) {
  return db.reservation.findFirst({
    where: {
      propertyId: params.propertyId,
      status: { in: BLOCKING_STATUSES },
      ...(params.excludeReservationId ? { id: { not: params.excludeReservationId } } : {}),
      arrivalTime: { lt: params.departureTime },
      departureTime: { gt: params.arrivalTime },
    },
    select: {
      id: true,
      arrivalTime: true,
      departureTime: true,
      client: { select: { name: true } },
    },
    orderBy: { arrivalTime: "asc" },
  });
}

export async function isPropertyAvailable(params: {
  propertyId: string;
  arrivalTime: Date;
  departureTime: Date;
  excludeReservationId?: string;
}): Promise<boolean> {
  const conflict = await findConflictingReservation(prisma, params);
  return !conflict;
}
