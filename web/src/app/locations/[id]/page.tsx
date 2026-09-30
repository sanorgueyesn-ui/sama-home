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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[#E7EAEE] py-3 last:border-0">
      <p className="text-[11px] font-bold text-navy/50">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-navy">{value}</p>
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
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-6 pb-10">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/locations"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-navy"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="flex-1 truncate text-xl font-extrabold text-navy">{rental.client.name}</h1>
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

      <Card className="px-4">
        <Row label="CLIENT" value={rental.client.name} />
        <Row label="TÉLÉPHONE" value={rental.client.phone} />
        <Row label="LOGEMENT" value={rental.property.name} />
        {rental.tariff ? <Row label="TARIF INITIAL" value={rental.tariff.label} /> : null}
        <Row label="DURÉE INITIALE" value={formatDuration(rental.durationValue, rental.durationUnit)} />
        <Row label="ARRIVÉE RÉELLE" value={fmtDateTime(rental.arrivalAt)} />
        <Row label="DÉPART PRÉVU" value={fmtDateTime(rental.plannedDepartureAt)} />
        {rental.actualDepartureAt ? <Row label="DÉPART RÉEL" value={fmtDateTime(rental.actualDepartureAt)} /> : null}
        {rental.reservation ? (
          <Row label="ORIGINE" value={`Réservation (arrivée prévue ${new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(rental.reservation.arrivalTime)})`} />
        ) : (
          <Row label="ORIGINE" value="Location directe" />
        )}
      </Card>

      {rental.extensions.length > 0 ? (
        <Card className="mt-3 px-4">
          <p className="pt-3 text-[11px] font-bold text-navy/50">PROLONGATIONS</p>
          {rental.extensions.map((ext) => (
            <div key={ext.id} className="flex items-center justify-between border-b border-[#E7EAEE] py-3 last:border-0">
              <span className="text-sm font-semibold text-navy">{formatDuration(ext.durationValue, ext.durationUnit)}</span>
              <span className="text-sm font-bold text-navy">+{fmtFcfa(ext.amount)}</span>
            </div>
          ))}
        </Card>
      ) : null}

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

      <PaymentHistory payments={payments} />

      {rental.note ? (
        <Card className="mt-3 px-4">
          <Row label="NOTE" value={rental.note} />
        </Card>
      ) : null}

      {isActive ? (
        <div className="mt-5 flex flex-col gap-2.5">
          {canPay ? (
            <Link
              href={`/locations/${rental.id}/pay`}
              className="flex h-14 items-center justify-center rounded-2xl bg-navy text-sm font-extrabold text-white"
            >
              Encaisser
            </Link>
          ) : null}
          <Link
            href={`/locations/${rental.id}/extend`}
            className="flex h-14 items-center justify-center rounded-2xl border border-navy/15 text-sm font-extrabold text-navy"
          >
            Prolonger
          </Link>
          <CompleteButton id={rental.id} />
          <CancelRentalButton id={rental.id} />
        </div>
      ) : (
        <p className="mt-5 text-center text-xs font-medium text-navy/40">
          Cette location est {rental.status === "COMPLETED" ? "terminée" : "annulée"} — historique conservé.
        </p>
      )}
    </div>
  );
}
