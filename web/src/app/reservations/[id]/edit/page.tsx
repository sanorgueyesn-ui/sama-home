import Link from "next/link";
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
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pt-6 pb-10 md:max-w-none md:px-8 lg:px-10">
      <div className="mb-5 flex items-center gap-3 lg:mx-auto lg:w-full lg:max-w-2xl">
        <Link
          href={`/reservations/${reservation.id}`}
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-fg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="text-xl font-extrabold text-fg">Modifier la réservation</h1>
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
