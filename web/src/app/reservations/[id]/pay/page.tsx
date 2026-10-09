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
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pt-6 pb-10 md:max-w-none md:px-8 lg:px-10">
      <div className="mb-5 flex items-center gap-3 lg:mx-auto lg:w-full lg:max-w-2xl">
        <Link
          href={`/reservations/${id}`}
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-fg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="text-xl font-extrabold text-fg">Encaisser — {reservation.client?.name ?? "Sans client"}</h1>
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
        <PaymentForm action={action} remaining={summary.remaining} />
      </div>
    </div>
  );
}
