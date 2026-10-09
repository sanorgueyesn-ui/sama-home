import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { RentalStatusBadge } from "@/app/locations/status-badge";
import { RentalTimeIndicator } from "@/app/locations/time-indicator";
import { CompleteButton, CancelRentalButton } from "./action-buttons";
import { getRentalById } from "@/lib/rentals-data";
import { listPaymentsForRental } from "@/lib/payments-data";
import { getRentalPaymentSummary } from "@/lib/payment-summary";
import { prisma } from "@/lib/prisma";
import { formatDuration } from "@/lib/duration";
import { PaymentSummaryCard } from "@/components/payments/payment-summary-card";
import { PaymentHistory } from "@/components/payments/payment-history";

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}
function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }).format(d);
}
const PROPERTY_TYPE_LABELS: Record<string, string> = {
  ROOM: "Chambre",
  APARTMENT: "Appartement",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border/10 py-3 last:border-0">
      <p className="text-[11px] font-bold text-fg/50">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-fg">{value}</p>
    </div>
  );
}

export default async function RentalDetailPage(props: PageProps<"/locations/[id]">) {
  const { id } = await props.params;
  const { created, extended, paid } = await props.searchParams;

  const rental = await getRentalById(id);
  if (!rental) {
    notFound();
  }

  const [summary, payments] = await Promise.all([
    getRentalPaymentSummary(prisma, id),
    listPaymentsForRental(id),
  ]);
  const now = new Date();
  const isActive = rental.status === "ACTIVE";
  const canPay = isActive && summary.remaining > 0;
  // Display-only breakdown (Bloc 14: "Montant initial, Extensions, Total
  // dû") — never stored: Rental.amount is already the running total
  // (initial + every extension, see payment-summary.ts), so "montant
  // initial" is derived here by subtracting the extensions we already have.
  const extensionsTotal = rental.extensions.reduce((sum, e) => sum + e.amount, 0);
  const initialAmount = rental.amount - extensionsTotal;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pt-6 pb-10 md:max-w-none md:px-8 lg:px-10">
      {/* Hiérarchie Lot 4 §10 : logement en tête (plus le nom du client),
          statut juste à côté — cohérent avec la priorité §6 (logement >
          statut > temps > client > montant > actions). */}
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/locations"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-fg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="flex-1 truncate text-xl font-extrabold text-fg">{rental.property.name}</h1>
        <RentalStatusBadge status={rental.status} />
      </div>

      {created ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Location créée avec succès.
        </p>
      ) : null}
      {extended ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Prolongation enregistrée.
        </p>
      ) : null}
      {paid ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Encaissement enregistré.
        </p>
      ) : null}

      {isActive ? (
        <div className="mb-4">
          <RentalTimeIndicator now={now} plannedDepartureAt={rental.plannedDepartureAt} />
        </div>
      ) : null}

      {/* Desktop (lg+) : logement/prolongations + note + actions en colonne
          principale, résumé financier + historique des paiements en colonne
          latérale (même motif que /reservations/[id] et /logements/[id]) —
          via grid-template-areas plutôt qu'un regroupement en deux <div>
          sources, pour que mobile/tablette conservent l'ordre d'empilement
          EXACT d'origine, sans aucune réorganisation en dessous de lg. */}
      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-x-6 lg:[grid-template-areas:'info_summary'_'info_history'_'note_history'_'actions_history']">
        <div className="lg:[grid-area:info]">
          <Card className="px-4">
            <Row label="LOGEMENT" value={`${rental.property.name} — ${PROPERTY_TYPE_LABELS[rental.property.type] ?? rental.property.type}`} />
            <Row label="CLIENT" value={rental.client.name} />
            <Row label="TÉLÉPHONE" value={rental.client.phone} />
            <Row label="ARRIVÉE RÉELLE" value={fmtDateTime(rental.arrivalAt)} />
            <Row label="DÉPART PRÉVU" value={fmtDateTime(rental.plannedDepartureAt)} />
            {rental.actualDepartureAt ? <Row label="DÉPART RÉEL" value={fmtDateTime(rental.actualDepartureAt)} /> : null}
            <Row label="DURÉE INITIALE" value={formatDuration(rental.durationValue, rental.durationUnit)} />
            {rental.tariff ? <Row label="TARIF INITIAL" value={rental.tariff.label} /> : null}
            {rental.reservation ? (
              <Row label="ORIGINE" value={`Réservation (arrivée prévue ${new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(rental.reservation.arrivalTime)})`} />
            ) : (
              <Row label="ORIGINE" value="Location directe" />
            )}
          </Card>

          {rental.extensions.length > 0 ? (
            <Card className="mt-3 px-4">
              <p className="pt-3 text-[11px] font-bold text-fg/50">PROLONGATIONS</p>
              {rental.extensions.map((ext) => (
                <div key={ext.id} className="flex items-center justify-between border-b border-border/10 py-3 last:border-0">
                  <span className="text-sm font-semibold text-fg">{formatDuration(ext.durationValue, ext.durationUnit)}</span>
                  <span className="text-sm font-bold text-fg">+{fmtFcfa(ext.amount)}</span>
                </div>
              ))}
            </Card>
          ) : null}
        </div>

        <div className="lg:[grid-area:summary]">
          <PaymentSummaryCard
            summary={summary}
            extraRows={
              rental.extensions.length > 0
                ? [
                    { label: "MONTANT INITIAL", value: fmtFcfa(initialAmount) },
                    { label: "EXTENSIONS", value: `+${fmtFcfa(extensionsTotal)}` },
                  ]
                : undefined
            }
          />
        </div>

        <div className="lg:[grid-area:history]">
          <PaymentHistory payments={payments} />
        </div>

        {rental.note ? (
          <Card className="mt-3 px-4 lg:mt-3 lg:[grid-area:note]">
            <Row label="NOTE" value={rental.note} />
          </Card>
        ) : null}

        {isActive ? (
          <div className="mt-5 flex flex-col gap-2.5 lg:[grid-area:actions]">
            {canPay ? (
              <Link
                href={`/locations/${rental.id}/pay`}
                className="flex h-14 items-center justify-center rounded-2xl bg-brand-orange text-sm font-extrabold text-ink"
              >
                Encaisser
              </Link>
            ) : null}
            <Link
              href={`/locations/${rental.id}/extend`}
              className="flex h-14 items-center justify-center rounded-2xl border border-border/15 text-sm font-extrabold text-fg"
            >
              Prolonger
            </Link>
            <CompleteButton id={rental.id} />
            <CancelRentalButton id={rental.id} />
          </div>
        ) : (
          <p className="mt-5 text-center text-xs font-medium text-fg/40 lg:[grid-area:actions]">
            Cette location est {rental.status === "COMPLETED" ? "terminée" : "annulée"} — historique conservé.
          </p>
        )}
      </div>
    </div>
  );
}
