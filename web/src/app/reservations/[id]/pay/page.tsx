import { PageHeader } from "@/components/ui/page-kit";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getReservationById } from "@/lib/reservations-data";
import { getReservationPaymentSummary } from "@/lib/payment-summary";
import { prisma } from "@/lib/prisma";
import { createReservationPayment } from "@/app/actions/payments";
import { PaymentForm } from "@/components/payments/payment-form";

export default async function PayReservationPage(props: PageProps<"/reservations/[id]/pay">) {
  const { id } = await props.params;

  const reservation = await getReservationById(id);
  if (!reservation) {
    notFound();
  }
  // Bloc 13 — encaissement direct réservé aux réservations CONFIRMED (voir
  // createReservationPayment pour la même règle appliquée côté serveur).
  if (reservation.status !== "CONFIRMED") {
    redirect(`/reservations/${id}`);
  }

  const summary = await getReservationPaymentSummary(prisma, id);
  if (summary.remaining <= 0) {
    redirect(`/reservations/${id}`);
  }

  const action = createReservationPayment.bind(null, id);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-7">
      <div className="mb-5">
        <PageHeader back={{ href: `/reservations/${id}`, label: "Retour" }} title={`Encaisser — ${reservation.client?.name ?? "Sans client"}`} />
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
        <PaymentForm action={action} remaining={summary.remaining} />
      </div>
    </div>
  );
}
