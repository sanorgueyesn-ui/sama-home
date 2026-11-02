import { PageHeader } from "@/components/ui/page-kit";
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
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-7">
      <div className="mb-5">
        <PageHeader back={{ href: `/locations/${id}`, label: "Retour" }} title={`Encaisser — ${rental.client.name}`} />
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
        <PaymentForm action={action} remaining={summary.remaining} />
      </div>
    </div>
  );
}
