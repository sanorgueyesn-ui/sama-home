import { PageHeader } from "@/components/ui/page-kit";
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
      <div className="mb-5">
        <PageHeader back={{ href: `/locations/${rental.id}`, label: "Retour" }} title={`Prolonger — ${rental.client.name}`} />
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
