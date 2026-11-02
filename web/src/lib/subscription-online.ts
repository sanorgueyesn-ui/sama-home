// Règlement en ligne d'un abonnement (PayDunya) : transforme une facture PAYÉE en prolongation, UNE seule fois.
// Appelé par le message automatique de PayDunya (IPN) et par la page de retour du client : les deux
// aboutissent ici, donc au même contrôle, jamais deux chemins différents.
import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { computeDepartureTime } from "@/lib/duration";
import { confirmInvoice, getPaydunyaConfig } from "@/lib/paydunya";

export type SettleResult =
  | { state: "CONFIRMED" } // prolongé à l'instant
  | { state: "ALREADY" } // déjà prolongé plus tôt (message en double)
  | { state: "PENDING" } // pas encore payé chez PayDunya
  | { state: "FAILED" } // annulé ou échoué
  | { state: "REJECTED"; reason: string } // facture incohérente avec notre enregistrement : jamais prolongé
  | { state: "UNKNOWN" }; // jeton inconnu ou paiement en ligne non configuré

export async function settlePaydunyaPayment(token: string): Promise<SettleResult> {
  const config = getPaydunyaConfig();
  if (!config) return { state: "UNKNOWN" };

  const payment = await prisma.subscriptionPayment.findUnique({
    where: { providerToken: token },
    include: { subscription: true },
  });
  if (!payment || payment.provider !== "PAYDUNYA") return { state: "UNKNOWN" };
  if (payment.status === "CONFIRMED") return { state: "ALREADY" };

  const invoice = await confirmInvoice(config, token);
  if (invoice.status === "pending") return { state: "PENDING" };
  if (invoice.status !== "completed") {
    await prisma.subscriptionPayment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "FAILED" },
    });
    return { state: "FAILED" };
  }

  // Une facture payée doit correspondre EXACTEMENT à notre enregistrement.
  if (invoice.token !== token) return { state: "REJECTED", reason: "jeton différent" };
  if (invoice.totalAmountFcfa !== payment.amount) return { state: "REJECTED", reason: "montant différent" };
  if (invoice.customData.paymentId !== payment.id) return { state: "REJECTED", reason: "référence différente" };
  if (config.mode === "live" && invoice.mode === "test") return { state: "REJECTED", reason: "facture de test en mode réel" };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const now = new Date();
        const fresh = await tx.subscriptionPayment.findUnique({ where: { id: payment.id }, include: { subscription: true } });
        if (!fresh) return { state: "UNKNOWN" } as const;
        if (fresh.status === "CONFIRMED") return { state: "ALREADY" } as const;

        const subscription = fresh.subscription;
        const anchor = subscription.currentPeriodEnd.getTime() > now.getTime() ? subscription.currentPeriodEnd : now;
        const newPeriodEnd = computeDepartureTime(anchor, fresh.periodMonths, "MONTH");

        const claimed = await tx.subscriptionPayment.updateMany({
          where: { id: fresh.id, status: { in: ["PENDING", "FAILED"] } },
          data: { status: "CONFIRMED", confirmedAt: now, periodStartedAt: anchor, periodEndedAt: newPeriodEnd },
        });
        if (claimed.count === 0) return { state: "ALREADY" } as const;

        const extended = await tx.subscription.updateMany({
          where: { id: subscription.id, currentPeriodEnd: subscription.currentPeriodEnd },
          data: { currentPeriodEnd: newPeriodEnd, ...(fresh.planTier ? { planTier: fresh.planTier } : {}) },
        });
        if (extended.count === 0) throw new Prisma.PrismaClientKnownRequestError("retry", { code: "P2034", clientVersion: "retry" });

        await tx.auditLog.create({
          data: {
            userId: null,
            action: "SUBSCRIPTION_PAYMENT_CONFIRMED_ONLINE",
            entityType: "SubscriptionPayment",
            entityId: fresh.id,
            reason: "Paiement en ligne PayDunya confirmé par le prestataire",
            oldValue: { status: fresh.status, currentPeriodEnd: subscription.currentPeriodEnd },
            newValue: { status: "CONFIRMED", currentPeriodEnd: newPeriodEnd, planTier: fresh.planTier },
            establishmentId: subscription.establishmentId,
          },
        });
        return { state: "CONFIRMED" } as const;
      });
    } catch (error) {
      const conflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
      if (!conflict || attempt === 2) throw error;
    }
  }
  return { state: "UNKNOWN" };
}
