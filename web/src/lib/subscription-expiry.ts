// L'abonnement d'un établissement est-il expiré ? (sert au bandeau de renouvellement ; les actions
// métier gardent leur propre contrôle serveur dans `requireActiveEstablishment`).
import "server-only";
import { prisma } from "@/lib/prisma";

export async function isSubscriptionExpired(establishmentId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({ where: { establishmentId }, select: { currentPeriodEnd: true } });
  return subscription !== null && subscription.currentPeriodEnd.getTime() <= Date.now();
}
