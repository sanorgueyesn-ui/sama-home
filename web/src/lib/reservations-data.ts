import "server-only";
import type { ReservationStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

const LIST_LIMIT = 50;

export type ReservationTimeFilter = "today" | "upcoming" | "past" | "cancelled" | "all";

/**
 * For the "Nouvelle réservation" form: only active properties (Bloc 17:
 * "logement actif"), each with only its active tariffs (Bloc 10). A property
 * with zero active tariffs is still included — the form must show "Aucun
 * tarif actif pour ce logement." per Bloc 10, not hide the property.
 */
export async function listActivePropertiesWithActiveTariffs() {
  await verifySession();
  return prisma.property.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      type: true,
      tariffs: {
        where: { active: true },
        select: { id: true, label: true, type: true, durationValue: true, durationUnit: true, amount: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function listReservations(filters: {
  timeFilter?: ReservationTimeFilter;
  propertyId?: string;
  status?: ReservationStatus;
  query?: string;
}) {
  await verifySession();

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const timeFilter = filters.timeFilter ?? "upcoming";
  const trimmedQuery = filters.query?.trim();

  const where = {
    ...(filters.propertyId ? { propertyId: filters.propertyId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(timeFilter === "today" ? { date: { gte: startOfToday, lt: endOfToday } } : {}),
    ...(timeFilter === "upcoming"
      ? { arrivalTime: { gte: now }, status: { not: "CANCELLED" as ReservationStatus } }
      : {}),
    ...(timeFilter === "past"
      ? { departureTime: { lt: now }, status: { not: "CANCELLED" as ReservationStatus } }
      : {}),
    ...(timeFilter === "cancelled" ? { status: "CANCELLED" as ReservationStatus } : {}),
    ...(trimmedQuery
      ? {
          client: {
            OR: [
              { name: { contains: trimmedQuery, mode: "insensitive" as const } },
              { phone: { contains: trimmedQuery.replace(/[\s.-]/g, ""), mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phone: true } },
        property: { select: { id: true, name: true } },
      },
      orderBy: { arrivalTime: timeFilter === "past" ? "desc" : "asc" },
      take: LIST_LIMIT,
    }),
    prisma.reservation.count({ where }),
  ]);

  return { items, total, truncated: total > items.length };
}

export async function getReservationById(id: string) {
  await verifySession();
  return prisma.reservation.findUnique({
    where: { id },
    include: {
      client: true,
      property: { select: { id: true, name: true, type: true, active: true } },
      tariff: { select: { id: true, label: true, type: true } },
    },
  });
}
