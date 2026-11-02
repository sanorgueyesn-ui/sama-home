"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { getT } from "@/lib/i18n/server";
import { createInvoice, getPaydunyaConfig } from "@/lib/paydunya";
import { AGENCY_MODE_ENABLED } from "@/lib/business-mode";
import { isBillingCycle, isPlanTier, planOffer } from "@/lib/subscription-plans";

/**
 * Démarre le paiement en ligne d'une formule : crée un règlement EN ATTENTE, une facture PayDunya,
 * et renvoie l'adresse de la page de paiement. Rien n'est prolongé ici : seule la confirmation du
 * prestataire (voir lib/subscription-online.ts) prolonge l'abonnement.
 * Le montant et la durée viennent de la grille officielle côté serveur, jamais du navigateur.
 */
export async function startPaydunyaCheckout(tier: string, cycle: string): Promise<{ url?: string; error?: string }> {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user.establishmentId) return { error: t("Votre compte n'est rattaché à aucun établissement.") };
  if (user.role !== "ADMIN" && user.role !== "GESTIONNAIRE") {
    return { error: t("Seuls un administrateur ou un gestionnaire de l'établissement peuvent initier un renouvellement.") };
  }
  if (!isPlanTier(tier) || !isBillingCycle(cycle)) return { error: t("Formule inconnue.") };

  const config = getPaydunyaConfig();
  const appUrl = process.env.APP_URL?.replace(/\/+$/, "");
  if (!config || !appUrl) return { error: t("Le paiement en ligne n'est pas encore activé. Contactez l'assistance SAMA HOME.") };

  const establishment = await prisma.establishment.findUnique({
    where: { id: user.establishmentId },
    select: { name: true, businessMode: true, subscription: { select: { id: true } } },
  });
  if (!establishment?.subscription) {
    return { error: t("Aucun abonnement n'est configuré pour cet établissement — contactez un administrateur de plateforme.") };
  }
  // Pas de vente d'un module non livré (référentiel des abonnements, section 12).
  if (establishment.businessMode === "REAL_ESTATE" && !AGENCY_MODE_ENABLED) {
    return { error: t("Ce module n'est pas encore disponible à la souscription.") };
  }
  const offer = planOffer(establishment.businessMode, tier, cycle);
  if (!offer) return { error: t("Formule inconnue.") };

  // Une seule tentative en ligne à la fois : les précédentes, jamais payées, sont abandonnées.
  await prisma.subscriptionPayment.updateMany({
    where: { subscriptionId: establishment.subscription.id, provider: "PAYDUNYA", status: "PENDING" },
    data: { status: "FAILED" },
  });
  const payment = await prisma.subscriptionPayment.create({
    data: {
      subscriptionId: establishment.subscription.id,
      amount: offer.amountFcfa,
      periodMonths: offer.periodMonths,
      status: "PENDING",
      planTier: tier,
      provider: "PAYDUNYA",
      reference: `Paiement en ligne ${offer.name} (${cycle === "annual" ? "annuel" : "mensuel"})`,
    },
  });

  try {
    const invoice = await createInvoice(config, {
      amountFcfa: offer.amountFcfa,
      description: `SAMA HOME — formule ${offer.name} (${offer.periodMonths} mois)`,
      storeName: "SAMA HOME",
      returnUrl: `${appUrl}/abonnement/retour`,
      cancelUrl: `${appUrl}/abonnement`,
      callbackUrl: `${appUrl}/api/paydunya/ipn`,
      customData: { paymentId: payment.id },
      customer: { name: establishment.name },
    });
    await prisma.subscriptionPayment.update({ where: { id: payment.id }, data: { providerToken: invoice.token } });
    return { url: invoice.checkoutUrl };
  } catch (error) {
    console.error("startPaydunyaCheckout() — échec de la création de la facture :", error);
    await prisma.subscriptionPayment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return { error: t("Le paiement en ligne est momentanément indisponible. Veuillez réessayer.") };
  }
}
