import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/app/logements/status-badge";
import { PropertyPhoto } from "@/app/logements/property-photo";
import { ReservationStatusBadge } from "@/app/reservations/status-badge";
import { ToggleActiveButton } from "./toggle-active-button";
import { TariffRowActions } from "./tariffs/tariff-row-actions";
import { getPropertyById } from "@/lib/properties-data";
import { listTariffsForProperty } from "@/lib/tariffs-data";
import { getPropertyStatus } from "@/lib/property-status";
import { getActiveRentalForProperty } from "@/lib/rentals-data";
import { listReservations } from "@/lib/reservations-data";
import { StayCountdown } from "@/components/dashboard/stay-countdown";

function formatFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/ |,/g, " ")} FCFA`;
}

function formatArrival(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border/10 py-3 last:border-0">
      <p className="text-[11px] font-bold text-fg/50">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-fg">{value}</p>
    </div>
  );
}

export default async function PropertyDetailPage(props: PageProps<"/logements/[id]">) {
  const { id } = await props.params;
  const { created, updated, tariffCreated, tariffUpdated } = await props.searchParams;

  const property = await getPropertyById(id);
  if (!property) {
    notFound();
  }

  const status = await getPropertyStatus(property);
  const tariffs = await listTariffsForProperty(property.id);
  const activeRental = status === "OCCUPIED" ? await getActiveRentalForProperty(property.id) : null;
  // AT-4 — "Prochaines réservations" : listReservations() existe déjà et
  // supporte déjà propertyId + timeFilter:"upcoming" (arrivalTime >= now,
  // status != CANCELLED construit dans la fonction elle-même) — aucune
  // nouvelle requête, aucune nouvelle Server Action, aucun nouveau statut.
  const upcomingReservations = await listReservations({ propertyId: property.id, timeFilter: "upcoming" });

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pt-6 pb-10 md:max-w-none md:px-8 lg:px-10">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/logements"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-fg hover:bg-surface-sunken transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold text-fg">{property.name}</h1>
          <p className="text-xs font-medium text-fg/60">
            {property.type === "ROOM" ? "Chambre meublée" : "Appartement meublé"} · {property.capacity} pers.
          </p>
        </div>
      </div>

      {created ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Logement créé avec succès.
        </p>
      ) : null}
      {updated ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Modifications enregistrées.
        </p>
      ) : null}
      {tariffCreated ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Tarif créé avec succès.
        </p>
      ) : null}
      {tariffUpdated ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Tarif modifié avec succès.
        </p>
      ) : null}

      {/* Live Stay Countdown & Progress Bar Banner if currently occupied */}
      {status === "OCCUPIED" && activeRental ? (
        <div className="mb-6">
          <StayCountdown
            arrivalAt={activeRental.arrivalAt.toISOString()}
            plannedDepartureAt={activeRental.plannedDepartureAt.toISOString()}
            clientName={activeRental.client?.name}
            clientPhone={activeRental.client?.phone}
            rentalId={activeRental.id}
            propertyName={property.name}
            variant="banner"
          />
        </div>
      ) : null}

      {/* Desktop (lg+) : photo/infos/tarifs en colonne principale,
          prochaines réservations + actions en colonne latérale (même motif
          que /reservations/[id] et /caisse) — via grid-template-areas
          plutôt qu'un regroupement en deux <div> sources, pour que
          mobile/tablette conservent l'ordre d'empilement EXACT d'origine
          (photo, infos, tarifs, réservations, actions), sans aucune
          réorganisation en dessous de lg. */}
      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-x-6 lg:[grid-template-areas:'photo_reservations'_'info_reservations'_'tariffs_actions']">
        <div className="lg:[grid-area:photo]">
          <PropertyPhoto photo={property.photo} type={property.type} className="h-48 w-full rounded-2xl shadow-md" />

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm font-bold text-fg/70">
              {property.type === "ROOM" ? "Chambre meublée" : "Appartement meublé"}
            </p>
            <StatusBadge status={status} />
          </div>
        </div>

        <Card className="mt-3 px-4 lg:[grid-area:info]">
          <Row label="CAPACITÉ" value={`${property.capacity} personne${property.capacity > 1 ? "s" : ""}`} />
          <Row label="DESCRIPTION" value={property.description ?? "—"} />
          <Row
            label="LOGEMENT DEPUIS"
            value={new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(property.createdAt)}
          />
        </Card>

        <div className="lg:[grid-area:tariffs]">
          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs font-bold tracking-wide text-fg/50">TARIFS</p>
            <Link href={`/logements/${property.id}/tariffs/new`} className="text-xs font-bold text-coral">
              + Ajouter un tarif
            </Link>
          </div>

          {tariffs.length === 0 ? (
            <Card className="mt-2 px-4 py-6 text-center">
              <p className="text-sm font-semibold text-fg">Aucun tarif pour ce logement</p>
              <p className="mt-1 text-xs text-fg/60">
                Ajoutez au moins un tarif pour pouvoir proposer ce logement.
              </p>
            </Card>
          ) : (
            <Card className="mt-2 px-4">
              {tariffs.map((tariff) => (
                <div
                  key={tariff.id}
                  className="flex items-center justify-between gap-3 border-b border-border/10 py-3 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/logements/${property.id}/tariffs/${tariff.id}/edit`}
                        className="truncate text-sm font-bold text-fg underline-offset-2 hover:underline"
                      >
                        {tariff.label}
                      </Link>
                      {!tariff.active ? (
                        <span className="shrink-0 rounded-full bg-neutral-bg px-2 py-0.5 text-[10px] font-bold text-neutral">
                          Inactif
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-fg/60">{formatFcfa(tariff.amount)}</p>
                  </div>
                  <TariffRowActions id={tariff.id} active={tariff.active} />
                </div>
              ))}
            </Card>
          )}
        </div>

        <div className="lg:[grid-area:reservations]">
          {/* AT-4 — "Prochaines réservations" (maquette AT). Exclut déjà
              CANCELLED par construction de listReservations (timeFilter
              "upcoming") — jamais affichée comme réservation active. */}
          <div className="mt-5 flex items-center justify-between lg:mt-0">
            <p className="text-xs font-bold tracking-wide text-fg/50">PROCHAINES RÉSERVATIONS</p>
            <Link href="/reservations" className="text-xs font-bold text-fg underline">
              Voir tout
            </Link>
          </div>
          {upcomingReservations.items.length === 0 ? (
            <Card className="mt-2 px-4 py-6 text-center">
              <p className="text-sm font-semibold text-fg/60">Aucune réservation à venir pour ce logement.</p>
            </Card>
          ) : (
            <Card className="mt-2 px-4">
              {upcomingReservations.items.map((r) => (
                <Link
                  key={r.id}
                  href={`/reservations/${r.id}`}
                  className="flex items-center justify-between gap-3 border-b border-border/10 py-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-fg">{r.client?.name ?? "Sans client"}</p>
                    <p className="mt-0.5 text-xs font-semibold text-fg/60">{formatArrival(r.arrivalTime)}</p>
                  </div>
                  <ReservationStatusBadge status={r.status} />
                </Link>
              ))}
            </Card>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2.5 lg:[grid-area:actions]">
          {status === "OCCUPIED" && activeRental ? (
            <Link
              href={`/locations/${activeRental.id}`}
              className="flex h-13 items-center justify-center gap-2 rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-500/20 via-surface-raised to-navy px-4 text-sm font-extrabold text-rose-200 shadow-sm transition-all hover:bg-rose-500/30"
            >
              <span>🚪</span> Gérer la sortie (Check-out) &amp; Décompte
            </Link>
          ) : null}
          {property.active && tariffs.some((t) => t.active) && status !== "OCCUPIED" ? (
            <>
              <Link
                href={`/locations/new?propertyId=${property.id}`}
                className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-brand-orange text-sm font-black text-ink shadow-md transition-all hover:brightness-110 active:scale-98"
              >
                <span>🔑</span> Louer maintenant (Check-in)
              </Link>
              <Link
                href={`/reservations/new?propertyId=${property.id}`}
                className="flex h-13 items-center justify-center gap-2 rounded-2xl border border-border/15 bg-surface-raised text-sm font-extrabold text-fg shadow-sm transition-all hover:bg-surface-sunken active:scale-98"
              >
                <span>📅</span> Enregistrer une réservation
              </Link>
            </>
          ) : null}
          <Link
            href={`/logements/${property.id}/edit`}
            className="flex h-14 items-center justify-center rounded-2xl border border-border/15 text-sm font-extrabold text-fg"
          >
            Modifier
          </Link>
          <ToggleActiveButton id={property.id} active={property.active} />
        </div>
      </div>
    </div>
  );
}
