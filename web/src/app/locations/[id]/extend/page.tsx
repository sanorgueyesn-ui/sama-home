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
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-7">
      <div className="mb-5 flex items-center gap-3 lg:mx-auto lg:w-full lg:max-w-2xl">
        <Link
          href={`/locations/${rental.id}`}
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-fg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="text-xl font-extrabold text-fg">Prolonger — {rental.client.name}</h1>
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
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
    </div>
  );
}
