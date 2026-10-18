import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";

// See section 31 of the master prompt: cap the list rather than loading the
// whole table. A dedicated paginated UI isn't justified yet at V1 scale.
const LIST_LIMIT = 50;

export async function listClients(query?: string) {
  // Phase 3C / Lot C1 — getCurrentUser() pour résoudre l'établissement ;
  // getClientById() ci-dessous reste inchangée (hors périmètre).
  const user = await getCurrentUser();
  if (!user.establishmentId) {
    return { items: [], total: 0, truncated: false };
  }

  const trimmed = query?.trim();
  const where = {
    establishmentId: user.establishmentId,
    ...(trimmed
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
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.client.findMany({ where, orderBy: { name: "asc" }, take: LIST_LIMIT }),
    prisma.client.count({ where }),
  ]);

  return { items, total, truncated: total > items.length };
}

/** Phase 3C / Lot C2 — un client d'un autre établissement est traité comme introuvable (voir getPropertyById pour le raisonnement complet). */
export async function getClientById(id: string) {
  const user = await getCurrentUser();
  if (!user.establishmentId) return null;
  return prisma.client.findFirst({ where: { id, establishmentId: user.establishmentId } });
}

/**
 * For the reservation form's client picker (Phase 6): every client, minimal
 * fields only (id/name/phone — the form needs to auto-display the phone
 * once a client is picked, per Bloc 9). Capped generously rather than the
 * 50-row search limit above, since this feeds a single <select>, not a
 * paginated list.
 *
 * Audit Client/Réservation — idDocumentType/idDocumentNumber added so the
 * form can tell client-side whether the selected client already has an
 * identity on file (and therefore never re-prompt for it, per the validated
 * rule) without a second round-trip. Not new data exposure: the same
 * gestionnaire already sees these fields on the client's own profile page.
 */
export async function listClientsForSelect() {
  const user = await getCurrentUser();
  if (!user.establishmentId) {
    return [];
  }
  return prisma.client.findMany({
    where: { establishmentId: user.establishmentId },
    select: { id: true, name: true, phone: true, idDocumentType: true, idDocumentNumber: true },
    orderBy: { name: "asc" },
    take: 500,
  });
}
