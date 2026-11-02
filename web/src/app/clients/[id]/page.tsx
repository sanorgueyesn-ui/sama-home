import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionLink, Flash, InfoRow, PageHeader, PageShell, SectionTitle, Surface } from "@/components/ui/page-kit";
import { getActiveSpace } from "@/lib/active-mode";
import { pageVocabulary } from "@/lib/page-vocabulary";
import { getClientById } from "@/lib/clients-data";
import { listReservations } from "@/lib/reservations-data";
import { listRentals } from "@/lib/rentals-data";
import { ReservationStatusBadge } from "@/app/reservations/status-badge";
import { RentalStatusBadge } from "@/app/locations/status-badge";

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}
function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}

export default async function ClientDetailPage(props: PageProps<"/clients/[id]">) {
  const { id } = await props.params;
  const { created, updated } = await props.searchParams;

  const vocab = pageVocabulary((await getActiveSpace()).mode);
  const client = await getClientById(id);
  if (!client) {
    notFound();
  }

  // AT-7 — historique du locataire : réutilise listReservations/listRentals
  // (déjà existantes), simplement étendues d'un filtre clientId — même
  // pattern que le filtre propertyId déjà en place. Une réservation sans
  // client (clientId = null) ne peut structurellement jamais matcher ce
  // filtre : aucune réservation courte sans client n'apparaît ici, sans
  // logique spécifique à écrire.
  const [reservationHistory, rentalHistory] = await Promise.all([
    listReservations({ clientId: client.id, timeFilter: "all" }),
    listRentals({ clientId: client.id, timeFilter: "all" }),
  ]);

  const guest = vocab.guest;
  const identity = client.idDocumentType || client.idDocumentNumber ? [client.idDocumentType, client.idDocumentNumber].filter(Boolean).join(" · ") : "—";

  return (
    <PageShell>
      <PageHeader back={{ href: "/clients", label: vocab.guestsTitle }} title={client.name} subtitle={client.phone} />

      {created ? <Flash>{guest.charAt(0).toUpperCase() + guest.slice(1)} créé avec succès.</Flash> : null}
      {updated ? <Flash>Modifications enregistrées.</Flash> : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_380px] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5">
          <Surface title="Coordonnées">
            <dl className="divide-y divide-app-line">
              <InfoRow label="Téléphone">{client.phone}</InfoRow>
              <InfoRow label="Email">{client.email ?? "—"}</InfoRow>
              <InfoRow label="Adresse">{client.address ?? "—"}</InfoRow>
              <InfoRow label="Pièce d'identité">{identity}</InfoRow>
              <InfoRow label="Notes">{client.notes ?? "—"}</InfoRow>
              <InfoRow label={`${guest.charAt(0).toUpperCase() + guest.slice(1)} depuis`}>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(client.createdAt)}</InfoRow>
            </dl>
          </Surface>

          <section aria-label="Actions" className="flex flex-col gap-2.5">
            <SectionTitle>Actions</SectionTitle>
            <ActionLink href={`/reservations/new?clientId=${client.id}`} tone="primary">Nouvelle réservation</ActionLink>
            <ActionLink href={`/locations/new?clientId=${client.id}`}>{vocab.newStay}</ActionLink>
            <ActionLink href={`/clients/${client.id}/edit`}>Modifier</ActionLink>
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <section aria-label="Réservations">
            <SectionTitle action={{ href: `/reservations?q=${encodeURIComponent(client.phone)}`, label: "Voir tout" }}>Réservations</SectionTitle>
            {reservationHistory.items.length === 0 ? (
              <Surface className="text-center">
                <p className="text-sm font-medium text-app-muted">Aucune réservation pour ce {guest}.</p>
              </Surface>
            ) : (
              <Surface className="!py-1">
                <ul className="divide-y divide-app-line">
                  {reservationHistory.items.map((r) => (
                    <li key={r.id}>
                      <Link href={`/reservations/${r.id}`} className="flex items-center justify-between gap-3 py-3 focus-visible:outline-2 focus-visible:outline-app-focus">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-app-text">{r.property.name}</p>
                          <p className="mt-0.5 text-xs font-semibold text-app-muted">
                            {fmtDate(r.arrivalTime)} · {fmtFcfa(r.amount)}
                          </p>
                        </div>
                        <ReservationStatusBadge status={r.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Surface>
            )}
          </section>

          <section aria-label={vocab.stays}>
            <SectionTitle action={{ href: `/locations?q=${encodeURIComponent(client.phone)}`, label: "Voir tout" }}>{vocab.stays.replace(" en cours", "")}</SectionTitle>
            {rentalHistory.items.length === 0 ? (
              <Surface className="text-center">
                <p className="text-sm font-medium text-app-muted">Aucun {vocab.staysSingular} pour ce {guest}.</p>
              </Surface>
            ) : (
              <Surface className="!py-1">
                <ul className="divide-y divide-app-line">
                  {rentalHistory.items.map((r) => (
                    <li key={r.id}>
                      <Link href={`/locations/${r.id}`} className="flex items-center justify-between gap-3 py-3 focus-visible:outline-2 focus-visible:outline-app-focus">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-app-text">{r.property.name}</p>
                          <p className="mt-0.5 text-xs font-semibold text-app-muted">
                            {fmtDate(r.arrivalAt)} · {fmtFcfa(r.amount)}
                          </p>
                        </div>
                        <RentalStatusBadge status={r.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Surface>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  );
}
