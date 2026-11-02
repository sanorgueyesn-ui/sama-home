import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionLink, Flash, InfoRow, PageHeader, PageShell, SectionTitle, Surface } from "@/components/ui/page-kit";
import { getActiveSpace } from "@/lib/active-mode";
import { pageVocabulary } from "@/lib/page-vocabulary";
import { ReservationStatusBadge, STATUS_META } from "@/app/reservations/status-badge";
import { CancelButton } from "./cancel-button";
import { CheckInButton } from "./check-in-button";
import { getReservationById } from "@/lib/reservations-data";
import { listClientsForSelect } from "@/lib/clients-data";
import { listPaymentsForReservation } from "@/lib/payments-data";
import { getReservationPaymentSummary } from "@/lib/payment-summary";
import { getSettings } from "@/lib/settings-data";
import { getGuestInfoContext } from "@/lib/guest-info-data";
import { prisma } from "@/lib/prisma";
import { formatDuration } from "@/lib/duration";
import { buildReservationWhatsAppLink } from "@/lib/whatsapp";
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

export default async function ReservationDetailPage(props: PageProps<"/reservations/[id]">) {
  const { id } = await props.params;
  const { created, updated, paid, cancelled, clientId: resumedClientId } = await props.searchParams;

  const reservation = await getReservationById(id);
  if (!reservation) {
    notFound();
  }

  const [summary, payments, settings, guestContext] = await Promise.all([
    getReservationPaymentSummary(prisma, id),
    listPaymentsForReservation(id),
    getSettings(),
    getGuestInfoContext(),
  ]);
  const vocab = pageVocabulary((await getActiveSpace()).mode);
  const canModify = reservation.status === "CONFIRMED";
  // Lot "Confirmation par WhatsApp" — lien construit uniquement à partir de
  // données réellement enregistrées ; `{ ok: false }` (client absent ou
  // numéro invalide) est géré explicitement dans le rendu ci-dessous, jamais
  // un lien incorrect.
  const whatsapp = reservation.client
    ? buildReservationWhatsAppLink({
        clientName: reservation.client.name,
        clientPhone: reservation.client.phone,
        establishmentName: settings?.establishmentName ?? "notre établissement",
        propertyName: reservation.property.name,
        arrivalAt: reservation.arrivalTime,
        departureAt: reservation.departureTime,
        durationLabel: formatDuration(reservation.durationValue, reservation.durationUnit),
        amount: reservation.amount,
        deposit: reservation.deposit,
        statusLabel: STATUS_META[reservation.status]?.label ?? reservation.status,
        // Le texte d'accueil des Paramètres s'applique aussi ici : l'aperçu des Paramètres le montre déjà
        // comme « message de confirmation d'une réservation ».
        customTemplate: settings?.whatsappTemplate,
        // Wi-Fi : Hôtel et Résidence seulement (`guestContext.enabled`) ; absent du message sinon.
        wifiName: guestContext.enabled ? guestContext.settings.wifiName : null,
        wifiPassword: guestContext.enabled ? guestContext.settings.wifiPassword : null,
      })
    : ({ ok: false, reason: "Cette réservation n'a pas de client associé." } as const);
  const canPay = canModify && summary.remaining > 0;
  // Mini-lot "Check-in — identifier le client manquant" : le serveur
  // (checkInReservation) reste l'autorité réelle, y compris pour le cas
  // >=48h incohérent sans client — ici, juste de quoi afficher le
  // sélecteur. Liste chargée seulement quand elle sert réellement.
  const needsClientForCheckIn = canModify && !reservation.client;
  const checkInClients = needsClientForCheckIn ? await listClientsForSelect() : [];

  const guestName = reservation.client?.name ?? "Sans client";
  const identity =
    reservation.client?.idDocumentType && reservation.client?.idDocumentNumber
      ? `${reservation.client.idDocumentType} — ${reservation.client.idDocumentNumber}`
      : null;

  return (
    <PageShell>
      <PageHeader
        back={{ href: "/reservations", label: "Réservations" }}
        title={reservation.client?.name ?? "Réservation sans client"}
        subtitle={`${reservation.property.name} · ${fmtDateTime(reservation.arrivalTime)}`}
        badge={<ReservationStatusBadge status={reservation.status} />}
      />

      {created ? <Flash>Réservation créée avec succès.</Flash> : null}
      {cancelled ? <Flash>Réservation annulée. Le créneau est de nouveau disponible ; les paiements éventuels n&apos;ont pas été modifiés.</Flash> : null}
      {updated ? <Flash>Modifications enregistrées.</Flash> : null}
      {paid ? <Flash>Encaissement enregistré.</Flash> : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_380px] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5">
          <Surface title="Séjour prévu">
            <dl className="divide-y divide-app-line">
              <InfoRow label={vocab.guest.charAt(0).toUpperCase() + vocab.guest.slice(1)}>{guestName}</InfoRow>
              <InfoRow label="Téléphone">{reservation.client?.phone ?? "—"}</InfoRow>
              {identity ? <InfoRow label="Pièce d'identité">{identity}</InfoRow> : null}
              <InfoRow label={vocab.unitsSingular.charAt(0).toUpperCase() + vocab.unitsSingular.slice(1)}>{reservation.property.name}</InfoRow>
              <InfoRow label="Tarif">{reservation.tariff.label}</InfoRow>
              <InfoRow label="Durée">{formatDuration(reservation.durationValue, reservation.durationUnit)}</InfoRow>
              <InfoRow label={vocab.arrival}>{fmtDateTime(reservation.arrivalTime)}</InfoRow>
              <InfoRow label="Départ prévu">{fmtDateTime(reservation.departureTime)}</InfoRow>
              <InfoRow label="Note">{reservation.note ?? "—"}</InfoRow>
              <InfoRow label="Créée le">{fmtDateTime(reservation.createdAt)}</InfoRow>
            </dl>
          </Surface>
        </div>

        <div className="flex flex-col gap-5">
          <PaymentSummaryCard summary={summary} />

          {canModify ? (
            <section aria-label="Actions" className="flex flex-col gap-2.5">
              <SectionTitle>Actions</SectionTitle>
              {canPay ? <ActionLink href={`/reservations/${reservation.id}/pay`} tone="primary">Encaisser</ActionLink> : null}
              <CheckInButton
                id={reservation.id}
                summary={{
                  clientName: reservation.client?.name ?? null,
                  propertyName: reservation.property.name,
                  plannedArrivalIso: reservation.arrivalTime.toISOString(),
                  durationValue: reservation.durationValue,
                  durationUnit: reservation.durationUnit,
                }}
                needsClient={needsClientForCheckIn}
                clients={checkInClients}
                initialClientId={typeof resumedClientId === "string" ? resumedClientId : undefined}
              />
              <ActionLink href={`/reservations/${reservation.id}/edit`}>Modifier</ActionLink>
              <CancelButton id={reservation.id} summary={`${reservation.client?.name ?? "Sans client"} — ${reservation.property.name}`} />
            </section>
          ) : (
            <p className="text-center text-xs font-medium text-app-faint">Cette réservation n&apos;est plus modifiable (statut : {STATUS_META[reservation.status]?.label ?? reservation.status}).</p>
          )}

          {whatsapp.ok ? (
            <a
              href={whatsapp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-4 text-sm font-bold text-white transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              <span>Partager la confirmation sur WhatsApp</span>
            </a>
          ) : (
            <p className="rounded-xl border border-app-line bg-app-panel px-3 py-2.5 text-center text-xs font-medium text-app-muted">{whatsapp.reason}</p>
          )}

          <PaymentHistory payments={payments} />
        </div>
      </div>
    </PageShell>
  );
}
