import "server-only";
import type { RentalStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";

const LIST_LIMIT = 50;

export type RentalTimeFilter = "active" | "completed" | "cancelled" | "all";

export async function listRentals(filters: {
  timeFilter?: RentalTimeFilter;
  propertyId?: string;
  /** AT-7 — historique d'un locataire (clients/[id]/page.tsx). */
  clientId?: string;
  query?: string;
  date?: string;
}) {
  // Phase 3C / Lot C1 — getCurrentUser() pour résoudre l'établissement.
  const user = await getCurrentUser();
  if (!user.establishmentId) {
    return { items: [], total: 0, truncated: false };
  }

  const timeFilter = filters.timeFilter ?? "active";
  const trimmedQuery = filters.query?.trim();

  const statusFor: Record<RentalTimeFilter, RentalStatus | undefined> = {
    active: "ACTIVE",
    completed: "COMPLETED",
    cancelled: "CANCELLED",
    all: undefined,
  };
  const status = statusFor[timeFilter];

  const where = {
    establishmentId: user.establishmentId,
    ...(filters.propertyId ? { propertyId: filters.propertyId } : {}),
    ...(filters.clientId ? { clientId: filters.clientId } : {}),
    ...(status ? { status } : {}),
    ...(filters.date
      ? {
          arrivalAt: {
            gte: new Date(`${filters.date}T00:00:00`),
            lt: new Date(`${filters.date}T23:59:59.999`),
          },
        }
      : {}),
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
    prisma.rental.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phone: true } },
        property: { select: { id: true, name: true } },
      },
      orderBy: { arrivalAt: timeFilter === "active" ? "asc" : "desc" },
      take: LIST_LIMIT,
    }),
    prisma.rental.count({ where }),
  ]);

  return { items, total, truncated: total > items.length };
}

/** Phase 3C / Lot C2 — une location d'un autre établissement est traitée comme introuvable. */
export async function getRentalById(id: string) {
  const user = await getCurrentUser();
  if (!user.establishmentId) return null;
  return prisma.rental.findFirst({
    where: { id, establishmentId: user.establishmentId },
    include: {
      client: true,
      property: { select: { id: true, name: true, type: true, active: true } },
      tariff: { select: { id: true, label: true } },
      reservation: { select: { id: true, arrivalTime: true } },
      extensions: { orderBy: { createdAt: "asc" } },
    },
  });
}

export type ActiveRentalDetail = {
  id: string;
  arrivalAt: Date;
  plannedDepartureAt: Date;
  durationValue: number;
  durationUnit: string;
  amount: number;
  client: { id: string; name: string; phone: string | null } | null;
};

export type ActiveRentalSummary = {
  id: string;
  propertyId: string;
  propertyName: string;
  arrivalAt: Date;
  plannedDepartureAt: Date;
  clientName: string | null;
  clientPhone: string | null;
};

/**
 * For the property detail page: link straight to the occupying rental when
 * OCCUPIED with full stay and departure info.
 */
export async function getActiveRentalForProperty(propertyId: string): Promise<ActiveRentalDetail | null> {
  const user = await getCurrentUser();
  if (!user.establishmentId) return null;
  return prisma.rental.findFirst({
    where: { propertyId, status: "ACTIVE", establishmentId: user.establishmentId },
    select: {
      id: true,
      arrivalAt: true,
      plannedDepartureAt: true,
      durationValue: true,
      durationUnit: true,
      amount: true,
      client: { select: { id: true, name: true, phone: true } },
    },
  });
}

/**
 * For the dashboard: returns all active rentals in the establishment,
 * ordered by planned departure ascending (departures coming soonest first).
 */
export async function getActiveRentalsForDashboard(): Promise<ActiveRentalSummary[]> {
  const user = await getCurrentUser();
  if (!user.establishmentId) return [];
  const rentals = await prisma.rental.findMany({
    where: { status: "ACTIVE", establishmentId: user.establishmentId },
    select: {
      id: true,
      propertyId: true,
      arrivalAt: true,
      plannedDepartureAt: true,
      property: { select: { name: true } },
      client: { select: { name: true, phone: true } },
    },
    orderBy: { plannedDepartureAt: "asc" },
  });
  return rentals.map((r) => ({
    id: r.id,
    propertyId: r.propertyId,
    propertyName: r.property?.name ?? "Logement",
    arrivalAt: r.arrivalAt,
    plannedDepartureAt: r.plannedDepartureAt,
    clientName: r.client?.name ?? null,
    clientPhone: r.client?.phone ?? null,
  }));
}

