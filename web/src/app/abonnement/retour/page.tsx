import Link from "next/link";
import { PageHeader, PageShell, Surface } from "@/components/ui/page-kit";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { settlePaydunyaPayment } from "@/lib/subscription-online";
import { T } from "@/components/i18n/i18n-provider";

export const metadata = { title: "Paiement de l'abonnement — SAMA HOME" };

/**
 * Page où PayDunya ramène le client après le paiement. Elle ne croit pas l'adresse : elle redemande
 * l'état réel de la facture, et seulement pour un règlement de SON établissement.
 */
export default async function PaymentReturnPage(props: { searchParams: Promise<{ token?: string }> }) {
  const user = await getCurrentUser();
  const { token } = await props.searchParams;

  let message = "Nous n'avons pas retrouvé ce paiement.";
  let good = false;
  if (token && user.establishmentId) {
    const own = await prisma.subscriptionPayment.findFirst({
      where: { providerToken: token, subscription: { establishmentId: user.establishmentId } },
      select: { id: true },
    });
    if (own) {
      try {
        const result = await settlePaydunyaPayment(token);
        if (result.state === "CONFIRMED" || result.state === "ALREADY") {
          message = "Paiement reçu : votre abonnement est prolongé. Merci !";
          good = true;
        } else if (result.state === "PENDING") {
          message = "Paiement en cours de confirmation. Votre abonnement sera prolongé dès que PayDunya nous le confirme ; rechargez cette page dans un instant.";
        } else if (result.state === "FAILED") {
          message = "Le paiement n'a pas abouti. Aucun montant n'a été pris en compte ; vous pouvez réessayer.";
        } else {
          message = "Ce paiement n'a pas pu être vérifié. Contactez l'assistance avec votre référence de paiement.";
        }
      } catch {
        message = "Vérification momentanément impossible. Rechargez cette page dans un instant.";
      }
    }
  }

  return (
    <PageShell narrow>
      <PageHeader title="Paiement de l'abonnement" />
      <Surface>
        <p className={`text-sm font-semibold ${good ? "text-success" : "text-app-text-2"}`}><T>{message}</T></p>
        <Link href="/abonnement" className="mt-3 inline-block text-sm font-bold text-brand-orange">
          <T>Retour à l&apos;abonnement</T>
        </Link>
      </Surface>
    </PageShell>
  );
}
