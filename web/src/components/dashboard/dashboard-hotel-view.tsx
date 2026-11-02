import { BedIcon, CalendarIcon, CashIcon, CheckCircleIcon, ClockIcon, DoorIcon } from "@/components/ui/icons";
import {
  DashboardHeader,
  EmptyState,
  KpiGrid,
  KpiTile,
  MoneyRow,
  Panel,
  MobileSummary,
  TodoRow,
} from "@/components/dashboard/dashboard-ui";
import { STAY_ACTIONS } from "@/components/dashboard/dashboard-actions";
import { RecentOccupiedTable, UnitTiles } from "@/components/dashboard/dashboard-lists";
import { formatFcfa, occupancyRate } from "@/lib/dashboard-metrics";
import type { DashboardOverview } from "@/lib/dashboard-overview";
import { T } from "@/components/i18n/i18n-provider";

/**
 * Tableau de bord Hôtel (guide Hôtel §4) : l'occupation des chambres d'abord, les actions du
 * quotidien, des alertes issues des données réelles. Pas d'alerte « ménage » ni « entretien » :
 * ces modules n'existent pas encore, le guide interdit de les afficher décorativement.
 */
export function DashboardHotelView({ overview }: { overview: DashboardOverview }) {
  const { counts, revenue, expenses, now } = overview;
  const rooms = overview.units.filter((unit) => unit.type === "ROOM");
  const apartments = overview.units.filter((unit) => unit.type === "APARTMENT");
  const unpaidStays = overview.activeStays.filter((stay) => stay.remaining > 0);

  return (
    <div className="flex flex-col gap-5">
      <DashboardHeader
        userName={overview.userName}
        spaceName={overview.spaceName}
        mode="HOTEL"
        now={now}
        actions={STAY_ACTIONS}
      />

      <MobileSummary
        mode="HOTEL"
        title="Recettes du jour"
        value={formatFcfa(revenue.today)}
        caption={`${revenue.paymentCountToday} règlement(s) · ${formatFcfa(revenue.month)} FCFA ce mois-ci`}
        percent={occupancyRate(counts.all)}
        percentLabel="occupés"
        stats={[
          { label: "Arrivées", value: String(overview.arrivals.length), href: "/reservations" },
          { label: "Départs", value: String(overview.departures.length), href: "/locations" },
          { label: "À venir", value: String(overview.upcomingReservations), href: "/reservations" },
        ]}
      />

      <KpiGrid>
        <KpiTile
          label="Taux d'occupation"
          display="hidden lg:block"
          value={`${occupancyRate(counts.all)} %`}
          hint={`${counts.all.occupied} occupé(s) sur ${counts.all.total - counts.all.unavailable}`}
          icon={BedIcon}
          mode="HOTEL"
          href="/logements"
        />
        <KpiTile
          label="Chambres libres"
          value={String(counts.rooms.available)}
          unit={`/ ${counts.rooms.total}`}
          hint="Prêtes à louer"
          icon={CheckCircleIcon}
          mode="HOTEL"
          tone="good"
          href="/logements?type=ROOM"
        />
        <KpiTile
          label="Chambres occupées"
          value={String(counts.rooms.occupied)}
          hint={`${counts.rooms.reserved} réservée(s)`}
          icon={DoorIcon}
          mode="HOTEL"
          href="/logements?type=ROOM"
        />
        <KpiTile
          label="Arrivées du jour"
          display="hidden lg:block"
          value={String(overview.arrivals.length)}
          hint={`${overview.upcomingReservations} réservation(s) à venir`}
          icon={CalendarIcon}
          mode="HOTEL"
          href="/reservations"
        />
        <KpiTile
          label="Départs du jour"
          display="hidden lg:block"
          value={String(overview.departures.length)}
          hint="À traiter"
          icon={ClockIcon}
          mode="HOTEL"
          href="/locations"
        />
        <KpiTile
          label="Recettes du jour"
          display="hidden lg:block"
          value={formatFcfa(revenue.today)}
          unit="FCFA"
          hint={`${revenue.paymentCountToday} règlement(s)`}
          icon={CashIcon}
          mode="HOTEL"
          href="/caisse"
        />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel
          title="Rack des chambres"
          subtitle="Chaque tuile ouvre la fiche de la chambre"
          action={{ href: "/logements", label: "Gérer" }}
          className="lg:col-span-2"
        >
          {rooms.length === 0 && apartments.length === 0 ? (
            <EmptyState text="Aucune chambre enregistrée." action={{ href: "/logements/new", label: "Ajouter une chambre" }} />
          ) : (
            <div className="flex flex-col gap-5">
              {rooms.length > 0 ? <UnitTiles units={rooms} /> : null}
              {apartments.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-app-muted"><T>Appartements</T></h3>
                  <UnitTiles units={apartments} />
                </div>
              ) : null}
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel title="À traiter" subtitle="Calculé sur vos données du jour">
            <ul className="-mx-3">
              <TodoRow label="Arrivées prévues" count={overview.arrivals.length} href="/reservations" detail="Aujourd'hui" />
              <TodoRow label="Départs à traiter" count={overview.departures.length} href="/locations" detail="Séjours à clôturer" />
              <TodoRow
                label="Paiements à encaisser"
                count={unpaidStays.length}
                href="/locations"
                detail={unpaidStays.length > 0 ? `${formatFcfa(overview.receivables.total)} FCFA restant dus` : "Tout est soldé"}
              />
              <TodoRow label="Réservations à venir" count={overview.upcomingReservations} href="/reservations" />
            </ul>
          </Panel>
          <Panel title="Argent encaissé" subtitle="Paiements enregistrés" action={{ href: "/caisse", label: "Caisse" }}>
            <dl>
              <MoneyRow label="Aujourd'hui" value={revenue.today} />
              <MoneyRow label="Ce mois-ci" value={revenue.month} />
              <MoneyRow label="Cette année" value={revenue.year} />
              <MoneyRow label="Dépenses du jour" value={expenses.today} />
            </dl>
          </Panel>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="5 dernières chambres occupées" action={{ href: "/logements?type=ROOM", label: "Voir toutes" }}>
          {overview.recentRooms.length === 0 ? (
            <EmptyState text="Aucune chambre occupée en ce moment." />
          ) : (
            <RecentOccupiedTable stays={overview.recentRooms} now={now} noun="chambres" />
          )}
        </Panel>

        <Panel title="5 derniers appartements occupés" action={{ href: "/logements?type=APARTMENT", label: "Voir tous" }}>
          {overview.recentApartments.length === 0 ? (
            <EmptyState text="Aucun appartement occupé en ce moment." />
          ) : (
            <RecentOccupiedTable stays={overview.recentApartments} now={now} noun="appartements" />
          )}
        </Panel>

      </div>
    </div>
  );
}
