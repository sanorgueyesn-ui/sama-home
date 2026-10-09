import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getClientById } from "@/lib/clients-data";
import { listReservations } from "@/lib/reservations-data";
import { listRentals } from "@/lib/rentals-data";
import { ReservationStatusBadge } from "@/app/reservations/status-badge";
import { RentalStatusBadge } from "@/app/locations/status-badge";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border/10 py-3 last:border-0">
      <p className="text-[11px] font-bold text-fg/50">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-fg">{value}</p>
    </div>
  );
}

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}
function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}

export default async function ClientDetailPage(props: PageProps<"/clients/[id]">) {
  const { id } = await props.params;
  const { created, updated } = await props.searchParams;

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

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pt-6 pb-10 md:max-w-none md:px-8 lg:px-10">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/clients"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-fg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="flex-1 truncate text-xl font-extrabold text-fg">{client.name}</h1>
      </div>

      {created ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Client créé avec succès.
        </p>
      ) : null}
      {updated ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Modifications enregistrées.
        </p>
      ) : null}

      {/* Desktop (lg+) : fiche + actions en colonne principale, historiques
          réservations/locations en colonne latérale (même motif que
          /reservations/[id] et /logements/[id]) — via grid-template-areas
          plutôt qu'un regroupement en deux <div> sources, pour que
          mobile/tablette conservent l'ordre d'empilement EXACT d'origine
          (fiche, réservations, locations, actions), sans aucune
          réorganisation en dessous de lg. */}
      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-x-6 lg:[grid-template-areas:'info_reservations'_'actions_locations']">
        <Card className="px-4 lg:[grid-area:info]">
          <Row label="TÉLÉPHONE" value={client.phone} />
          <Row label="EMAIL" value={client.email ?? "—"} />
          <Row label="ADRESSE" value={client.address ?? "—"} />
          <Row
            label="PIÈCE D'IDENTITÉ"
            value={
              client.idDocumentType || client.idDocumentNumber
                ? [client.idDocumentType, client.idDocumentNumber].filter(Boolean).join(" · ")
                : "—"
            }
          />
          <Row label="NOTES" value={client.notes ?? "—"} />
          <Row
            label="CLIENT DEPUIS"
            value={new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(client.createdAt)}
          />
        </Card>

        <div className="lg:[grid-area:reservations]">
          <div className="mt-5 flex items-center justify-between lg:mt-0">
            <p className="text-xs font-bold tracking-wide text-fg/50">RÉSERVATIONS</p>
            <Link href={`/reservations?q=${encodeURIComponent(client.phone)}`} className="text-xs font-bold text-fg underline">
              Voir tout
            </Link>
          </div>
          {reservationHistory.items.length === 0 ? (
            <Card className="mt-2 px-4 py-6 text-center">
              <p className="text-sm font-medium text-fg/60">Aucune réservation pour ce client.</p>
            </Card>
          ) : (
            <Card className="mt-2 px-4">
              {reservationHistory.items.map((r) => (
                <Link
                  key={r.id}
                  href={`/reservations/${r.id}`}
                  className="flex items-center justify-between gap-3 border-b border-border/10 py-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-fg">{r.property.name}</p>
                    <p className="mt-0.5 text-xs font-semibold text-fg/60">
                      {fmtDate(r.arrivalTime)} · {fmtFcfa(r.amount)}
                    </p>
                  </div>
                  <ReservationStatusBadge status={r.status} />
                </Link>
              ))}
            </Card>
          )}
        </div>

        <div className="lg:[grid-area:locations]">
          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs font-bold tracking-wide text-fg/50">LOCATIONS</p>
            <Link href={`/locations?q=${encodeURIComponent(client.phone)}`} className="text-xs font-bold text-fg underline">
              Voir tout
            </Link>
          </div>
          {rentalHistory.items.length === 0 ? (
            <Card className="mt-2 px-4 py-6 text-center">
              <p className="text-sm font-medium text-fg/60">Aucune location pour ce client.</p>
            </Card>
          ) : (
            <Card className="mt-2 px-4">
              {rentalHistory.items.map((r) => (
                <Link
                  key={r.id}
                  href={`/locations/${r.id}`}
                  className="flex items-center justify-between gap-3 border-b border-border/10 py-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-fg">{r.property.name}</p>
                    <p className="mt-0.5 text-xs font-semibold text-fg/60">
                      {fmtDate(r.arrivalAt)} · {fmtFcfa(r.amount)}
                    </p>
                  </div>
                  <RentalStatusBadge status={r.status} />
                </Link>
              ))}
            </Card>
          )}
        </div>

        {/* Phase 12, Bloc 4/6: mêmes raccourcis pré-remplis que /logements/[id]
            offre déjà pour propertyId — jusqu'ici absents ici, obligeant à
            resélectionner le client depuis une liste après être passé par sa
            fiche (trouvé pendant l'inspection de la Phase 12). */}
        <div className="mt-5 flex flex-col gap-2.5 lg:[grid-area:actions]">
          <Link
            href={`/reservations/new?clientId=${client.id}`}
            className="flex h-14 items-center justify-center rounded-2xl bg-navy text-sm font-extrabold text-white"
          >
            Nouvelle réservation
          </Link>
          <Link
            href={`/locations/new?clientId=${client.id}`}
            className="flex h-14 items-center justify-center rounded-2xl border border-border/15 text-sm font-extrabold text-fg"
          >
            Nouvelle location
          </Link>
          <Link
            href={`/clients/${client.id}/edit`}
            className="flex h-14 items-center justify-center rounded-2xl border border-border/15 text-sm font-extrabold text-fg"
          >
            Modifier
          </Link>
        </div>
      </div>
    </div>
  );
}
