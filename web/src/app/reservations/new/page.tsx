import { PageHeader } from "@/components/ui/page-kit";
import { ReservationForm } from "@/app/reservations/reservation-form";
import { createReservation } from "@/app/actions/reservations";
import { listClientsForSelect } from "@/lib/clients-data";
import { listActivePropertiesWithActiveTariffs } from "@/lib/reservations-data";

export default async function NewReservationPage(props: PageProps<"/reservations/new">) {
  const { propertyId, clientId } = await props.searchParams;

  const [clients, properties] = await Promise.all([
    listClientsForSelect(),
    listActivePropertiesWithActiveTariffs(),
  ]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-7">
      <div className="mb-5">
        <PageHeader back={{ href: "/reservations", label: "Retour" }} title="Nouvelle réservation" />
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
        <ReservationForm
          action={createReservation}
          clients={clients}
          properties={properties}
          submitLabel="CONFIRMER LA RÉSERVATION"
          defaultValues={{
            propertyId: typeof propertyId === "string" ? propertyId : undefined,
            clientId: typeof clientId === "string" ? clientId : undefined,
          }}
        />
      </div>
    </div>
  );
}
