import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ReservationStatusBadge } from "@/app/reservations/status-badge";
import { CancelButton } from "./cancel-button";
import { CheckInButton } from "./check-in-button";
import { getReservationById } from "@/lib/reservations-data";
import { formatDuration } from "@/lib/duration";

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}

function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Espèces",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
  OTHER: "Autre",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[#E7EAEE] py-3 last:border-0">
      <p className="text-[11px] font-bold text-navy/50">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-navy">{value}</p>
    </div>
  );
}

export default async function ReservationDetailPage(props: PageProps<"/reservations/[id]">) {
  const { id } = await props.params;
  const { created, updated } = await props.searchParams;

  const reservation = await getReservationById(id);
  if (!reservation) {
    notFound();
  }

  const reste = Math.max(reservation.amount - reservation.deposit, 0);
  const canModify = reservation.status === "CONFIRMED";

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-6 pb-10">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/reservations"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-navy"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="flex-1 truncate text-xl font-extrabold text-navy">{reservation.client.name}</h1>
        <ReservationStatusBadge status={reservation.status} />
      </div>

      {created ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Réservation créée avec succès.
        </p>
      ) : null}
      {updated ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Modifications enregistrées.
        </p>
      ) : null}

      <Card className="px-4">
        <Row label="CLIENT" value={reservation.client.name} />
        <Row label="TÉLÉPHONE" value={reservation.client.phone} />
        <Row label="LOGEMENT" value={reservation.property.name} />
        <Row label="TARIF" value={reservation.tariff.label} />
        <Row label="DURÉE" value={formatDuration(reservation.durationValue, reservation.durationUnit)} />
        <Row label="ARRIVÉE" value={fmtDateTime(reservation.arrivalTime)} />
        <Row label="DÉPART PRÉVU" value={fmtDateTime(reservation.departureTime)} />
      </Card>

      <Card className="mt-3 px-4">
        <Row label="MONTANT" value={fmtFcfa(reservation.amount)} />
        <Row label="ACOMPTE" value={fmtFcfa(reservation.deposit)} />
        <Row label="RESTE" value={fmtFcfa(reste)} />
        {reservation.depositMethod ? (
          <Row label="MODE DE PAIEMENT" value={PAYMENT_LABELS[reservation.depositMethod] ?? reservation.depositMethod} />
        ) : null}
      </Card>

      <Card className="mt-3 px-4">
        <Row label="NOTE" value={reservation.note ?? "—"} />
        <Row label="CRÉÉE LE" value={fmtDateTime(reservation.createdAt)} />
      </Card>

      {canModify ? (
        <div className="mt-5 flex flex-col gap-2.5">
          <CheckInButton id={reservation.id} />
          <Link
            href={`/reservations/${reservation.id}/edit`}
            className="flex h-14 items-center justify-center rounded-2xl border border-navy/15 text-sm font-extrabold text-navy"
          >
            Modifier
          </Link>
          <CancelButton id={reservation.id} />
        </div>
      ) : (
        <p className="mt-5 text-center text-xs font-medium text-navy/40">
          Cette réservation n&apos;est plus modifiable (statut : {reservation.status}).
        </p>
      )}
    </div>
  );
}
