import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExtendForm } from "./extend-form";
import { getRentalById } from "@/lib/rentals-data";
import { listTariffsForProperty } from "@/lib/tariffs-data";

export default async function ExtendRentalPage(props: PageProps<"/locations/[id]/extend">) {
  const { id } = await props.params;

  const rental = await getRentalById(id);
  if (!rental) {
    notFound();
  }
  if (rental.status !== "ACTIVE") {
    redirect(`/locations/${id}`);
  }

  const tariffs = await listTariffsForProperty(rental.propertyId);
  const activeTariffs = tariffs.filter((t) => t.active);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-6 pb-10">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href={`/locations/${rental.id}`}
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-navy"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="text-xl font-extrabold text-navy">Prolonger — {rental.client.name}</h1>
      </div>

      <ExtendForm
        rentalId={rental.id}
        currentPlannedDeparture={rental.plannedDepartureAt.toISOString()}
        tariffOptions={activeTariffs.map((t) => ({
          id: t.id,
          label: t.label,
          durationValue: t.durationValue,
          durationUnit: t.durationUnit,
          amount: t.amount,
        }))}
      />
    </div>
  );
}
