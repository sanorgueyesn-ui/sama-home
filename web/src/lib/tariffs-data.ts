import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";

/**
 * Phase 3C / Lot C1 — `establishmentId` filtré directement sur cette
 * requête (pas seulement supposé correct via `propertyId`) : tant que la
 * lecture par identifiant (`get*ById`) n'est pas encore sécurisée (lot
 * distinct), rien ne garantit ici que `propertyId` appartient réellement à
 * l'établissement de l'appelant — le filtre explicite est donc la seule
 * garantie fiable à ce stade.
 */
export async function listTariffsForProperty(propertyId: string) {
  const user = await getCurrentUser();
  if (!user.establishmentId) {
    return [];
  }
  return prisma.tariff.findMany({
    where: { propertyId, establishmentId: user.establishmentId },
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
  });
}

/** Phase 3C / Lot C2 — un tarif d'un autre établissement est traité comme introuvable. */
export async function getTariffById(id: string) {
  const user = await getCurrentUser();
  if (!user.establishmentId) return null;
  return prisma.tariff.findFirst({ where: { id, establishmentId: user.establishmentId } });
}
