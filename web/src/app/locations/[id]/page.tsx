import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { UserIcon, BedIcon, ClockIcon, CashIcon, TagIcon } from "@/components/ui/icons";
import { RentalStatusBadge } from "@/app/locations/status-badge";
import { RentalTimeIndicator } from "@/app/locations/time-indicator";
import { CompleteButton, CancelRentalButton } from "./action-buttons";
import { PaymentHistory } from "@/components/payments/payment-history";
import { getRentalById } from "@/lib/rentals-data";
import { getRentalPaymentSummary } from "@/lib/payment-summary";
import { listPaymentsForRental } from "@/lib/payments-data";
import { getSettings } from "@/lib/settings-data";
import { formatDuration } from "@/lib/duration";
import { buildRentalWhatsAppLink } from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  ROOM: "Chambre",
  APARTMENT: "Appartement",
};

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

export default async function RentalDetailPage(props: PageProps<"/locations/[id]">) {
  const { id } = await props.params;
  const { created, extended, paid } = await props.searchParams;

  const [rental, settings, summary, payments] = await Promise.all([
    getRentalById(id),
    getSettings(),
    getRentalPaymentSummary(prisma, id),
    listPaymentsForRental(id),
  ]);

  if (!rental) {
    notFound();
  }

  const isCompleted = rental.status === "COMPLETED";
  const isActive = rental.status === "ACTIVE";
  const now = new Date();
  const canPay = isActive && summary.remaining > 0;

  const thresholdDays = settings?.contractThresholdDays ?? 2;
  const stayDays = rental.durationUnit === "DAY" ? rental.durationValue : Math.floor(rental.durationValue / 24);
  const isContractStay = stayDays >= thresholdDays;
  const isLongStay = rental.plannedDepartureAt.getTime() - rental.arrivalAt.getTime() >= 240 * 3600_000;

  const whatsapp = buildRentalWhatsAppLink({
    clientName: rental.client.name,
    clientPhone: rental.client.phone,
    establishmentName: settings?.establishmentName ?? "SAMA HOME",
    propertyName: rental.property.name,
    arrivalAt: rental.arrivalAt,
    plannedDepartureAt: rental.plannedDepartureAt,
    amount: rental.amount,
    isCompleted,
    actualDepartureAt: rental.actualDepartureAt,
    customTemplate: settings?.whatsappTemplate,
  });

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pt-5 pb-24 md:max-w-4xl md:px-8">
      {/* Barre de retour et titre principal */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/locations"
            aria-label="Retour"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-surface-raised text-fg hover:bg-surface-sunken transition-all active:scale-95"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5 8 12l7 7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-white md:text-xl">{rental.property.name}</h1>
              <RentalStatusBadge status={rental.status} />
            </div>
            <p className="text-xs font-medium text-fg/60">
              {PROPERTY_TYPE_LABELS[rental.property.type] ?? rental.property.type} • {rental.client.name}
            </p>
          </div>
        </div>

        {isActive ? (
          <div className="hidden sm:block">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Séjour en cours
            </span>
          </div>
        ) : null}
      </div>

      {/* Messages de succès rassurants */}
      {created ? (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="text-sm font-black">Location enregistrée avec succès !</p>
            <p className="text-xs font-medium text-emerald-300/80">
              La chambre est occupée. Vous pouvez envoyer la confirmation sur WhatsApp au client ou télécharger son contrat.
            </p>
          </div>
        </div>
      ) : null}

      {extended ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Prolongation enregistrée avec succès.
        </p>
      ) : null}
      {paid ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Encaissement enregistré avec succès.
        </p>
      ) : null}

      {/* Décompte du temps restant */}
      {isActive ? (
        <div className="mb-4">
          <RentalTimeIndicator now={now} plannedDepartureAt={rental.plannedDepartureAt} />
        </div>
      ) : null}

      {/* ZONE D'ACTIONS PRIORITAIRES (WhatsApp & Contrat PDF) */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Bouton WhatsApp Vert Officiel — Ultra mis en valeur */}
        {whatsapp.ok ? (
          <a
            href={whatsapp.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] px-4 text-sm font-black text-white shadow-lg shadow-[#25D366]/25 hover:brightness-105 active:scale-98 transition-all"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
            <span>Envoyer sur WhatsApp</span>
          </a>
        ) : (
          <div className="flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-surface px-4 text-xs font-semibold text-fg/50">
            {whatsapp.reason}
          </div>
        )}

        {/* Bouton Téléchargement Contrat / Reçu PDF */}
        <a
          href={`/locations/${rental.id}/contract`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-brand-orange/40 bg-surface-raised px-4 text-sm font-black text-brand-orange hover:bg-brand-orange/10 active:scale-98 transition-all"
        >
          <TagIcon className="h-4 w-4" />
          <span>{isContractStay ? "Télécharger le Contrat (PDF)" : "Télécharger le Reçu (PDF)"}</span>
        </a>
      </div>

      {/* RÉCAPITULATIF ÉPURÉ DU SÉJOUR EN 4 CARTES LISIBLES */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Carte Client */}
        <div className="rounded-2xl border border-white/10 bg-surface-raised p-4">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-fg/50">
            <UserIcon className="h-3.5 w-3.5 text-brand-orange" />
            <span>Locataire</span>
          </span>
          <p className="mt-1 text-base font-extrabold text-white">{rental.client.name}</p>
          <p className="mt-0.5 text-xs font-semibold text-fg/70 font-mono">{rental.client.phone || "Sans téléphone"}</p>
          {rental.client.idDocumentType ? (
            <p className="mt-2 text-[11px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1 inline-flex items-center gap-1.5">
              <TagIcon className="h-3 w-3" />
              <span>{rental.client.idDocumentType} : {rental.client.idDocumentNumber || "—"}</span>
            </p>
          ) : null}
        </div>

        {/* Carte Logement & Formule */}
        <div className="rounded-2xl border border-white/10 bg-surface-raised p-4">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-fg/50">
            <BedIcon className="h-3.5 w-3.5 text-brand-orange" />
            <span>Chambre &amp; Formule</span>
          </span>
          <p className="mt-1 text-base font-extrabold text-white">{rental.property.name}</p>
          <p className="mt-0.5 text-xs font-semibold text-fg/70">
            {rental.tariff?.label ?? formatDuration(rental.durationValue, rental.durationUnit)}
          </p>
          <p className="mt-2 text-[11px] font-medium text-fg/50">
            Type : {PROPERTY_TYPE_LABELS[rental.property.type] ?? rental.property.type}
          </p>
        </div>

        {/* Carte Horaires */}
        <div className="rounded-2xl border border-white/10 bg-surface-raised p-4">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-fg/50">
            <ClockIcon className="h-3.5 w-3.5 text-brand-orange" />
            <span>Horaires du séjour</span>
          </span>
          <div className="mt-2 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-fg/60">Entrée :</span>
              <span className="font-bold text-white">{fmtDateTime(rental.arrivalAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-fg/60">Départ prévu :</span>
              <span className="font-bold text-white">{fmtDateTime(rental.plannedDepartureAt)}</span>
            </div>
            {rental.actualDepartureAt ? (
              <div className="flex items-center justify-between text-emerald-400">
                <span>Départ réel :</span>
                <span className="font-bold">{fmtDateTime(rental.actualDepartureAt)}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Carte Situation Financière */}
        <div className="rounded-2xl border border-white/10 bg-surface-raised p-4">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-fg/50">
            <CashIcon className="h-3.5 w-3.5 text-brand-orange" />
            <span>Règlement</span>
          </span>
          <div className="mt-2 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-fg/60">Total du séjour :</span>
              <span className="font-bold text-white">{fmtFcfa(summary.totalDue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-fg/60">Montant réglé :</span>
              <span className="font-bold text-emerald-400">{fmtFcfa(summary.totalPaid)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-1.5">
              <span className="font-bold text-fg/70">Solde restant :</span>
              <span className={`font-black ${summary.remaining > 0 ? "text-rose-400 text-sm" : "text-emerald-400"}`}>
                {summary.remaining > 0 ? fmtFcfa(summary.remaining) : "0 FCFA (Soldé)"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bannière spéciale pour les longs séjours avec contrat */}
      {isLongStay ? (
        <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-300">
              <span className="text-lg">📜</span>
              <span className="text-xs font-black uppercase tracking-wider">Contrat de location officiel (+ de 10 jours)</span>
            </div>
            <span className="text-[11px] font-bold text-amber-300/80">Obligatoire</span>
          </div>
          <p className="mt-1 text-xs text-fg/70">
            Contrat complet prêt pour impression et signature manuscrite par le client ({rental.client.name}).
          </p>
          <a
            href={`/locations/${rental.id}/contract`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-orange text-xs font-black uppercase text-ink shadow-md hover:brightness-110 active:scale-98 transition-all"
          >
            <TagIcon className="h-4 w-4" />
            <span>Imprimer le Contrat de Location</span>
          </a>
        </div>
      ) : null}

      {/* Note éventuelle */}
      {rental.note ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-surface-raised p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-fg/50">Note</span>
          <p className="mt-1 text-xs text-fg/80">{rental.note}</p>
        </div>
      ) : null}

      {/* Historique des paiements (si présent) */}
      {payments.length > 0 ? (
        <div className="mt-4">
          <PaymentHistory payments={payments} />
        </div>
      ) : null}

      {/* ACTIONS DE GESTION DU SÉJOUR (Encaisser, Prolonger, Sortie) */}
      <div className="mt-6 space-y-3">
        <h2 className="text-xs font-black uppercase tracking-wider text-fg/50">Actions sur le séjour</h2>

        <div className="flex flex-wrap items-center gap-3">
          {canPay ? (
            <Link
              href={`/locations/${rental.id}/pay`}
              className="flex-1 min-w-[140px] flex h-13 items-center justify-center gap-2 rounded-2xl bg-brand-orange text-sm font-black text-ink shadow-md hover:brightness-110 active:scale-98 transition-all"
            >
              <CashIcon className="h-4 w-4" />
              <span>Encaisser ({fmtFcfa(summary.remaining)})</span>
            </Link>
          ) : null}

          {isActive ? (
            <Link
              href={`/locations/${rental.id}/extend`}
              className="flex-1 min-w-[140px] flex h-13 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-surface text-sm font-extrabold text-fg hover:bg-white/5 active:scale-98 transition-all"
            >
              <ClockIcon className="h-4 w-4 text-brand-orange" />
              <span>Prolonger</span>
            </Link>
          ) : null}
        </div>

        {isActive ? (
          <div className="pt-1">
            <CompleteButton id={rental.id} />
          </div>
        ) : (
          <p className="text-center text-xs font-medium text-fg/50 pt-2">
            Cette location est {rental.status === "COMPLETED" ? "terminée (Check-out effectué)" : "annulée"} — archive conservée.
          </p>
        )}

        {isActive ? (
          <div className="pt-2 text-right">
            <CancelRentalButton id={rental.id} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
