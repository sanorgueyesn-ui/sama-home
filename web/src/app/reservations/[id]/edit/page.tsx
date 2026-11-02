import { PageHeader } from "@/components/ui/page-kit";
import { notFound, redirect } from "next/navigation";
import { ReservationForm } from "@/app/reservations/reservation-form";
import { getReservationById } from "@/lib/reservations-data";
import { listClientsForSelect } from "@/lib/clients-data";
import { listActivePropertiesWithActiveTariffs } from "@/lib/reservations-data";
import { updateReservation } from "@/app/actions/reservations";

function toDateInput(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function toTimeInput(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function EditReservationPage(props: PageProps<"/reservations/[id]/edit">) {
  const { id } = await props.params;

  const reservation = await getReservationById(id);
  if (!reservation) {
    notFound();
  }
  // Bloc 16: no inconsistent action — a non-CONFIRMED reservation can't be edited.
  if (reservation.status !== "CONFIRMED") {
    redirect(`/reservations/${id}`);
  }

  const [clients, properties] = await Promise.all([
    listClientsForSelect(),
    listActivePropertiesWithActiveTariffs(),
  ]);

  // The reservation's own property/tariff might have been deactivated since
  // booking — still offer them in the pickers so editing (e.g. just the
  // note) doesn't force an unrelated change, even though the active-only
  // lists above wouldn't otherwise include them.
  let effectiveProperties = properties;
  if (!properties.some((p) => p.id === reservation.propertyId)) {
    effectiveProperties = [
      ...properties,
      {
        id: reservation.property.id,
        name: `${reservation.property.name} (désactivé)`,
        type: reservation.property.type,
        // Pas chargée par getReservationById (non nécessaire à l'édition) —
        // null est honnête ici plutôt que d'ajouter une requête rien que
        // pour ce cas de repli (propriété désactivée depuis la réservation).
        photo: null,
        tariffs: [
          {
            id: reservation.tariff.id,
            label: reservation.tariff.label,
            type: reservation.tariff.type,
            durationValue: reservation.durationValue,
            durationUnit: reservation.durationUnit,
            amount: reservation.amount,
          },
        ],
      },
    ];
  }

  const action = updateReservation.bind(null, reservation.id);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-7">
      <div className="mb-5">
        <PageHeader back={{ href: `/reservations/${reservation.id}`, label: "Retour" }} title="Modifier la réservation" />
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
        <ReservationForm
          action={action}
          clients={clients}
          properties={effectiveProperties}
          submitLabel="ENREGISTRER LES MODIFICATIONS"
          excludeReservationId={reservation.id}
          defaultValues={{
            clientId: reservation.clientId ?? undefined,
            propertyId: reservation.propertyId,
            tariffId: reservation.tariffId,
            date: toDateInput(reservation.date),
            arrivalTime: toTimeInput(reservation.arrivalTime),
            deposit: reservation.deposit,
            depositMethod: reservation.depositMethod ?? "",
            note: reservation.note ?? "",
          }}
        />
      </div>
    </div>
  );
}
