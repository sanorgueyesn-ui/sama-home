import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionLink, Badge, Flash, InfoRow, PageHeader, PageShell, SectionTitle, Surface } from "@/components/ui/page-kit";
import { getActiveSpace } from "@/lib/active-mode";
import { pageVocabulary } from "@/lib/page-vocabulary";
import { DoorIcon, KeyIcon, CalendarIcon, TagIcon, EditIcon } from "@/components/ui/icons";
import { StatusBadge } from "@/app/logements/status-badge";
import { PropertyPhoto } from "@/app/logements/property-photo";
import { ReservationStatusBadge } from "@/app/reservations/status-badge";
import { ToggleActiveButton } from "./toggle-active-button";
import { DeletePropertyButton } from "./delete-property-button";
import { TariffRowActions } from "./tariffs/tariff-row-actions";
import { getPropertyById } from "@/lib/properties-data";
import { listTariffsForProperty } from "@/lib/tariffs-data";
import { getPropertyStatus } from "@/lib/property-status";
import { getActiveRentalForProperty } from "@/lib/rentals-data";
import { listReservations } from "@/lib/reservations-data";
import { StayCountdown } from "@/components/dashboard/stay-countdown";
import { getCurrentUser } from "@/lib/dal";
import { hasEstablishmentPermission } from "@/lib/permissions";

function formatFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/ |,/g, " ")} FCFA`;
}

function formatArrival(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
}

export default async function PropertyDetailPage(props: PageProps<"/logements/[id]">) {
  const { id } = await props.params;
  const { created, updated, tariffCreated, tariffUpdated } = await props.searchParams;

  const property = await getPropertyById(id);
  if (!property) {
    notFound();
  }

  const space = await getActiveSpace();
  const vocab = pageVocabulary(space.mode);
  const isHotel = space.mode === "HOTEL";
  const currentUser = await getCurrentUser();
  const canEditTariffs = hasEstablishmentPermission(currentUser, "CAN_EDIT_TARIFFS");
  const canDeleteProperty = hasEstablishmentPermission(currentUser, "CAN_DELETE_PROPERTY");

  const status = await getPropertyStatus(property);
  const tariffs = await listTariffsForProperty(property.id);
  const activeRental = status === "OCCUPIED" ? await getActiveRentalForProperty(property.id) : null;
  // AT-4 — "Prochaines réservations" : listReservations() existe déjà et
  // supporte déjà propertyId + timeFilter:"upcoming" (non annulées dont
  // l'arrivée est à venir, OU encore CONFIRMÉES avec arrivée dépassée mais
  // départ non dépassé — voir lib/reservation-filters.ts) — aucune
  // nouvelle requête, aucune nouvelle Server Action, aucun nouveau statut.
  const upcomingReservations = await listReservations({ propertyId: property.id, timeFilter: "upcoming" });

  const hasActiveTariff = tariffs.some((t) => t.active);
  const kind = property.type === "ROOM" ? "Chambre meublée" : "Appartement meublé";

  return (
    <PageShell>
      <PageHeader
        back={{ href: "/logements", label: isHotel ? "Chambres et appartements" : "Logements" }}
        title={property.name}
        subtitle={`${kind} · ${property.capacity} personne${property.capacity > 1 ? "s" : ""}`}
        badge={<StatusBadge status={status} />}
      />

      {created ? <Flash>{isHotel ? "Chambre créée avec succès." : "Logement créé avec succès."}</Flash> : null}
      {updated ? <Flash>Modifications enregistrées.</Flash> : null}
      {tariffCreated ? <Flash>Tarif créé avec succès.</Flash> : null}
      {tariffUpdated ? <Flash>Tarif modifié avec succès.</Flash> : null}

      {status === "OCCUPIED" && activeRental ? (
        <StayCountdown
          arrivalAt={activeRental.arrivalAt.toISOString()}
          plannedDepartureAt={activeRental.plannedDepartureAt.toISOString()}
          clientName={activeRental.client?.name}
          clientPhone={activeRental.client?.phone}
          rentalId={activeRental.id}
          propertyName={property.name}
          variant="banner"
        />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_380px] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5">
          <PropertyPhoto photo={property.photo} type={property.type} className="h-48 w-full rounded-2xl border border-app-line sm:h-64" />

          <Surface title="Informations">
            <dl className="divide-y divide-app-line">
              <InfoRow label="Capacité">{`${property.capacity} personne${property.capacity > 1 ? "s" : ""}`}</InfoRow>
              <InfoRow label="Description">{property.description ?? "—"}</InfoRow>
              <InfoRow label={isHotel ? "Chambre depuis" : "Logement depuis"}>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(property.createdAt)}</InfoRow>
            </dl>
          </Surface>

          <section aria-label="Tarifs">
            <SectionTitle action={canEditTariffs ? { href: `/logements/${property.id}/tariffs/new`, label: "+ Ajouter un tarif" } : undefined}>Tarifs</SectionTitle>
            {tariffs.length === 0 ? (
              <Surface className="text-center">
                <p className="text-sm font-semibold text-app-text">Aucun tarif pour ce {vocab.unitsSingular}</p>
                <p className="mt-1 text-xs text-app-muted">
                  {canEditTariffs ? `Ajoutez au moins un tarif pour pouvoir proposer ce ${vocab.unitsSingular}.` : `Aucun tarif n'a encore été configuré pour ce ${vocab.unitsSingular}.`}
                </p>
              </Surface>
            ) : (
              <Surface className="!py-1">
                <ul className="divide-y divide-app-line">
                  {tariffs.map((tariff) => (
                    <li key={tariff.id} className="flex flex-col justify-between gap-2.5 py-3.5 sm:flex-row sm:items-center">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {canEditTariffs ? (
                            <Link href={`/logements/${property.id}/tariffs/${tariff.id}/edit`} className="truncate text-sm font-extrabold text-app-text hover:text-brand-orange">
                              {tariff.label}
                            </Link>
                          ) : (
                            <span className="truncate text-sm font-extrabold text-app-text">{tariff.label}</span>
                          )}
                          {!tariff.active ? <Badge>Inactif</Badge> : null}
                        </div>
                        <p className="mt-0.5 text-xs font-bold tabular-nums text-brand-orange">{formatFcfa(tariff.amount)}</p>
                      </div>
                      {canEditTariffs ? <TariffRowActions id={tariff.id} propertyId={property.id} active={tariff.active} label={tariff.label} /> : null}
                    </li>
                  ))}
                </ul>
              </Surface>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <section aria-label="Actions" className="flex flex-col gap-2.5">
            <SectionTitle>Actions</SectionTitle>
            {status === "OCCUPIED" && activeRental ? (
              <ActionLink href={`/locations/${activeRental.id}`} tone="danger">
                <DoorIcon className="h-4 w-4" />
                <span>{isHotel ? "Gérer le départ" : "Gérer la sortie"} et le décompte</span>
              </ActionLink>
            ) : null}
            {property.active && hasActiveTariff && status !== "OCCUPIED" ? (
              <>
                <ActionLink href={`/locations/new?propertyId=${property.id}`} tone="primary">
                  <KeyIcon className="h-4 w-4" />
                  <span>{isHotel ? vocab.newStay : "Louer maintenant"}</span>
                </ActionLink>
                <ActionLink href={`/reservations/new?propertyId=${property.id}`}>
                  <CalendarIcon className="h-4 w-4 text-brand-orange" />
                  <span>Enregistrer une réservation</span>
                </ActionLink>
              </>
            ) : null}
            {property.active && !hasActiveTariff && status !== "OCCUPIED" && canEditTariffs ? (
              <ActionLink href={`/logements/${property.id}/tariffs/new`} tone="warn">
                <TagIcon className="h-4 w-4" />
                <span>Configurer un tarif pour louer ce {vocab.unitsSingular}</span>
              </ActionLink>
            ) : null}
            <ActionLink href={`/logements/${property.id}/edit`}>
              <EditIcon className="h-4 w-4 text-app-muted" />
              <span>Modifier ce {vocab.unitsSingular}</span>
            </ActionLink>
            <ToggleActiveButton id={property.id} active={property.active} />
            {canDeleteProperty ? <DeletePropertyButton id={property.id} name={property.name} /> : null}
          </section>

          <section aria-label="Prochaines réservations">
            <SectionTitle action={{ href: "/reservations", label: "Voir tout" }}>Prochaines réservations</SectionTitle>
            {upcomingReservations.items.length === 0 ? (
              <Surface className="text-center">
                <p className="text-sm font-semibold text-app-muted">Aucune réservation à venir pour ce {vocab.unitsSingular}.</p>
              </Surface>
            ) : (
              <Surface className="!py-1">
                <ul className="divide-y divide-app-line">
                  {upcomingReservations.items.map((r) => (
                    <li key={r.id}>
                      <Link href={`/reservations/${r.id}`} className="flex items-center justify-between gap-3 py-3 focus-visible:outline-2 focus-visible:outline-app-focus">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-app-text">{r.client?.name ?? "Sans client"}</p>
                          <p className="mt-0.5 text-xs font-semibold text-app-muted">{formatArrival(r.arrivalTime)}</p>
                        </div>
                        <ReservationStatusBadge status={r.status} />
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
