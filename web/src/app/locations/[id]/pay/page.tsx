import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRentalById } from "@/lib/rentals-data";
import { getRentalPaymentSummary } from "@/lib/payment-summary";
import { prisma } from "@/lib/prisma";
import { createRentalPayment } from "@/app/actions/payments";
import { PaymentForm } from "@/components/payments/payment-form";

export default async function PayRentalPage(props: PageProps<"/locations/[id]/pay">) {
  const { id } = await props.params;

  const rental = await getRentalById(id);
  if (!rental) {
    notFound();
  }
  // Bloc 14 — encaissement réservé aux locations ACTIVE (même règle côté
  // serveur dans createRentalPayment).
  if (rental.status !== "ACTIVE") {
    redirect(`/locations/${id}`);
  }

  const summary = await getRentalPaymentSummary(prisma, id);
  if (summary.remaining <= 0) {
    redirect(`/locations/${id}`);
  }

  const action = createRentalPayment.bind(null, id);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-6 pb-10">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href={`/locations/${id}`}
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-navy"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="text-xl font-extrabold text-navy">Encaisser — {rental.client.name}</h1>
      </div>

      <PaymentForm action={action} remaining={summary.remaining} />
    </div>
  );
}
