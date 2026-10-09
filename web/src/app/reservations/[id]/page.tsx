import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ReservationStatusBadge } from "@/app/reservations/status-badge";
import { CancelButton } from "./cancel-button";
import { CheckInButton } from "./check-in-button";
import { getReservationById } from "@/lib/reservations-data";
import { listClientsForSelect } from "@/lib/clients-data";
import { listPaymentsForReservation } from "@/lib/payments-data";
import { getReservationPaymentSummary } from "@/lib/payment-summary";
import { prisma } from "@/lib/prisma";
import { formatDuration } from "@/lib/duration";
import { PaymentSummaryCard } from "@/components/payments/payment-summary-card";
import { PaymentHistory } from "@/components/payments/payment-history";

function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border/10 py-3 last:border-0">
      <p className="text-[11px] font-bold text-fg/50">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-fg">{value}</p>
    </div>
  );
}

export default async function ReservationDetailPage(props: PageProps<"/reservations/[id]">) {
  const { id } = await props.params;
  const { created, updated, paid, clientId: resumedClientId } = await props.searchParams;

  const reservation = await getReservationById(id);
  if (!reservation) {
    notFound();
  }

  const [summary, payments] = await Promise.all([
    getReservationPaymentSummary(prisma, id),
    listPaymentsForReservation(id),
  ]);
  const canModify = reservation.status === "CONFIRMED";
  const canPay = canModify && summary.remaining > 0;
  // Mini-lot "Check-in — identifier le client manquant" : le serveur
  // (checkInReservation) reste l'autorité réelle, y compris pour le cas
  // >=48h incohérent sans client — ici, juste de quoi afficher le
  // sélecteur. Liste chargée seulement quand elle sert réellement.
  const needsClientForCheckIn = canModify && !reservation.client;
  const checkInClients = needsClientForCheckIn ? await listClientsForSelect() : [];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pt-6 pb-10 md:max-w-none md:px-8 lg:px-10">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/reservations"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-fg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="flex-1 truncate text-xl font-extrabold text-fg">
          {reservation.client?.name ?? "Réservation — Sans client"}
        </h1>
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
      {paid ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Encaissement enregistré.
        </p>
      ) : null}

      {/* Desktop (lg+) : fiche/note/actions en colonne principale, paiements
          en colonne latérale (même motif que /caisse, Lot Caisse
          Responsive) — via grid-template-areas plutôt qu'un regroupement en
          deux <div> sources, pour que mobile/tablette conservent l'ordre
          d'empilement EXACT d'origine (fiche, solde, historique, note,
          actions), sans aucune réorganisation en dessous de lg. */}
      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-x-6 lg:[grid-template-areas:'info_summary'_'info_history'_'note_history'_'actions_history']">
        <Card className="px-4 lg:[grid-area:info]">
          <Row label="CLIENT" value={reservation.client?.name ?? "Sans client"} />
          <Row label="TÉLÉPHONE" value={reservation.client?.phone ?? "—"} />
          {/* Identité — affichée uniquement si elle existe déjà en fiche
              client (Client.idDocumentType/idDocumentNumber), jamais une
              valeur inventée. Donnée déjà chargée par getReservationById
              (client: true), aucune nouvelle requête. */}
          {reservation.client?.idDocumentType && reservation.client?.idDocumentNumber ? (
            <Row
              label="PIÈCE D'IDENTITÉ"
              value={`${reservation.client.idDocumentType} — ${reservation.client.idDocumentNumber}`}
            />
          ) : null}
          <Row label="LOGEMENT" value={reservation.property.name} />
          <Row label="TARIF" value={reservation.tariff.label} />
          <Row label="DURÉE" value={formatDuration(reservation.durationValue, reservation.durationUnit)} />
          <Row label="ARRIVÉE" value={fmtDateTime(reservation.arrivalTime)} />
          <Row label="DÉPART PRÉVU" value={fmtDateTime(reservation.departureTime)} />
        </Card>

        <div className="lg:[grid-area:summary]">
          <PaymentSummaryCard summary={summary} />
        </div>

        <div className="lg:[grid-area:history]">
          <PaymentHistory payments={payments} />
        </div>

        <Card className="mt-3 px-4 lg:mt-3 lg:[grid-area:note]">
          <Row label="NOTE" value={reservation.note ?? "—"} />
          <Row label="CRÉÉE LE" value={fmtDateTime(reservation.createdAt)} />
        </Card>

        {canModify ? (
          <div className="mt-5 flex flex-col gap-2.5 lg:[grid-area:actions]">
            {canPay ? (
              <Link
                href={`/reservations/${reservation.id}/pay`}
                className="flex h-14 items-center justify-center rounded-2xl bg-brand-orange text-sm font-extrabold text-ink"
              >
                Encaisser
              </Link>
            ) : null}
            <CheckInButton
              id={reservation.id}
              needsClient={needsClientForCheckIn}
              clients={checkInClients}
              initialClientId={typeof resumedClientId === "string" ? resumedClientId : undefined}
            />
            <Link
              href={`/reservations/${reservation.id}/edit`}
              className="flex h-14 items-center justify-center rounded-2xl border border-border/15 text-sm font-extrabold text-fg"
            >
              Modifier
            </Link>
            <CancelButton id={reservation.id} />
          </div>
        ) : (
          <p className="mt-5 text-center text-xs font-medium text-fg/40 lg:[grid-area:actions]">
            Cette réservation n&apos;est plus modifiable (statut : {reservation.status}).
          </p>
        )}
      </div>
    </div>
  );
}
