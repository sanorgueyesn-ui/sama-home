import "server-only";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

// See section 31 of the master prompt: cap the list rather than loading the
// whole table. A dedicated paginated UI isn't justified yet at V1 scale.
const LIST_LIMIT = 50;

export async function listClients(query?: string) {
  await verifySession();

  const trimmed = query?.trim();
  const where = trimmed
    ? {
        OR: [
          { name: { contains: trimmed, mode: "insensitive" as const } },
          {
            phone: {
              contains: trimmed.replace(/[\s.-]/g, ""),
              mode: "insensitive" as const,
            },
          },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.client.findMany({ where, orderBy: { name: "asc" }, take: LIST_LIMIT }),
    prisma.client.count({ where }),
  ]);

  return { items, total, truncated: total > items.length };
}

export async function getClientById(id: string) {
  await verifySession();
  return prisma.client.findUnique({ where: { id } });
}

/**
 * For the reservation form's client picker (Phase 6): every client, minimal
 * fields only (id/name/phone — the form needs to auto-display the phone
 * once a client is picked, per Bloc 9). Capped generously rather than the
 * 50-row search limit above, since this feeds a single <select>, not a
 * paginated list.
 */
export async function listClientsForSelect() {
  await verifySession();
  return prisma.client.findMany({
    select: { id: true, name: true, phone: true },
    orderBy: { name: "asc" },
    take: 500,
  });
}
