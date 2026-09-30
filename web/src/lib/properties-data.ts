import "server-only";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import type { PROPERTY_TYPE_VALUES } from "@/lib/definitions";

const LIST_LIMIT = 50;

type PropertyTypeFilter = (typeof PROPERTY_TYPE_VALUES)[number] | undefined;

export async function listProperties(query?: string, type?: PropertyTypeFilter) {
  await verifySession();

  const trimmed = query?.trim();
  const where = {
    ...(type ? { type } : {}),
    ...(trimmed ? { name: { contains: trimmed, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.property.findMany({ where, orderBy: { name: "asc" }, take: LIST_LIMIT }),
    prisma.property.count({ where }),
  ]);

  return { items, total, truncated: total > items.length };
}

export async function getPropertyById(id: string) {
  await verifySession();
  return prisma.property.findUnique({ where: { id } });
}
