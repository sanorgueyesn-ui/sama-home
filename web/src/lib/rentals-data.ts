import "server-only";
import type { RentalStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

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
  await verifySession();

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

export async function getRentalById(id: string) {
  await verifySession();
  return prisma.rental.findUnique({
    where: { id },
    include: {
      client: true,
      property: { select: { id: true, name: true, type: true, active: true } },
      tariff: { select: { id: true, label: true } },
      reservation: { select: { id: true, arrivalTime: true } },
      extensions: { orderBy: { createdAt: "asc" } },
    },
  });
}

/** For the property detail page: link straight to the occupying rental when OCCUPIED. */
export async function getActiveRentalForProperty(propertyId: string) {
  await verifySession();
  return prisma.rental.findFirst({
    where: { propertyId, status: "ACTIVE" },
    select: { id: true },
  });
}
