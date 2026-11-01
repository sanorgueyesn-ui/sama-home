import "server-only";
import { prisma } from "@/lib/prisma";
import type { SpaceOption } from "@/lib/business-mode";

/**
 * Espaces professionnels d'un compte (ses appartenances), jamais une liste globale. `userId`
 * provient de la session serveur. Le rôle n'est pas exposé : le sélecteur n'en a pas besoin.
 */
export async function listMySpaces(userId: string): Promise<SpaceOption[]> {
  const rows = await prisma.membership.findMany({
    where: { userId },
    select: { establishment: { select: { id: true, name: true, businessMode: true, status: true } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => row.establishment);
}
