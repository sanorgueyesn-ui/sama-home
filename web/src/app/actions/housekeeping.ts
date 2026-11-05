"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { canChangeCleaning, isCleaningStatus, supportsHousekeeping } from "@/lib/housekeeping";

/**
 * Change la propreté d'une unité (modes Hôtel et Résidence). L'établissement vient de la session, jamais du client ;
 * une unité d'un autre établissement est indistinguable d'un id inexistant. Le changement et son
 * historique s'écrivent dans la même transaction. Volontairement non bloqué par l'abonnement : c'est
 * une opération de terrain, qui n'engage aucun argent.
 */
export async function setCleaningStatus(propertyId: string, status: string): Promise<void> {
  if (!isCleaningStatus(status)) return;
  const user = await getCurrentUser();
  if (!user.establishmentId) return;
  const establishmentId = user.establishmentId;

  await prisma.$transaction(async (tx) => {
    const establishment = await tx.establishment.findUnique({ where: { id: establishmentId }, select: { businessMode: true } });
    if (!supportsHousekeeping(establishment?.businessMode)) return;
    const property = await tx.property.findFirst({
      where: { id: propertyId, establishmentId, active: true },
      select: { id: true, cleaningStatus: true },
    });
    if (!property || !canChangeCleaning(property.cleaningStatus, status)) return;
    await tx.property.update({ where: { id: property.id }, data: { cleaningStatus: status, cleaningUpdatedAt: new Date() } });
    await tx.housekeepingEvent.create({
      data: { propertyId: property.id, establishmentId, fromStatus: property.cleaningStatus, toStatus: status, userId: user.id },
    });
  });

  revalidatePath("/menage");
  revalidatePath("/logements");
}
