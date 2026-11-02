import {
  AlertCircleIcon,
  CalendarIcon,
  CashIcon,
  CheckCircleIcon,
  ClockIcon,
  KeyIcon,
  WalletIcon,
} from "@/components/ui/icons";
import {
  DashboardHeader,
  EmptyState,
  KpiGrid,
  KpiTile,
  MoneyRow,
  Panel,
  MobileSummary,
  StatusBar,
  WeeklyBars,
} from "@/components/dashboard/dashboard-ui";
import { STAY_ACTIONS } from "@/components/dashboard/dashboard-actions";
import { ArrivalList, ReceivableList, StayList } from "@/components/dashboard/dashboard-lists";
import { formatFcfa, occupancyRate } from "@/lib/dashboard-metrics";
import type { DashboardOverview } from "@/lib/dashboard-overview";
import { T } from "@/components/i18n/i18n-provider";

/**
 * Tableau de bord Résidence (guide Résidence §4). Questions auxquelles il répond : quels logements
 * sont libres, quels séjours sont en cours, arrivent ou partent aujourd'hui, combien a été
 * encaissé, qui doit encore de l'argent. Chiffres réels uniquement.
 */
export function DashboardResidenceView({ overview }: { overview: DashboardOverview }) {
  const { counts, revenue, expenses, receivables, now } = overview;
  const rate = occupancyRate(counts.all);

  return (
    <div className="flex flex-col gap-5">
      <DashboardHeader
        userName={overview.userName}
        spaceName={overview.spaceName}
        mode="RESIDENCE"
        now={now}
        actions={STAY_ACTIONS}
      />

      <MobileSummary
        mode="RESIDENCE"
        title="Recettes du jour"
        value={formatFcfa(revenue.today)}
        caption={`${revenue.paymentCountToday} règlement(s) · ${formatFcfa(revenue.month)} FCFA ce mois-ci`}
        percent={rate}
        percentLabel="occupés"
        stats={[
          { label: "Arrivées", value: String(overview.arrivals.length), href: "/reservations" },
          { label: "Départs", value: String(overview.departures.length), href: "/locations" },
          { label: "Séjours", value: String(overview.activeStays.length), href: "/locations" },
        ]}
      />

      <KpiGrid>
        <KpiTile
          label="Logements libres"
          value={String(counts.all.available)}
          unit={`/ ${counts.all.total}`}
          hint={`${rate} % occupés`}
          icon={CheckCircleIcon}
          mode="RESIDENCE"
          tone="good"
          href="/logements"
        />
        <KpiTile
          label="Séjours en cours"
          display="hidden lg:block"
          value={String(overview.activeStays.length)}
          hint="Clients présents"
          icon={KeyIcon}
          mode="RESIDENCE"
          href="/locations"
        />
        <KpiTile
          label="Arrivées du jour"
          display="hidden lg:block"
          value={String(overview.arrivals.length)}
          hint={`${overview.upcomingReservations} réservation(s) à venir`}
          icon={CalendarIcon}
          mode="RESIDENCE"
          href="/reservations"
        />
        <KpiTile
          label="Départs du jour"
          display="hidden lg:block"
          value={String(overview.departures.length)}
          hint="Séjours à clôturer"
          icon={ClockIcon}
          mode="RESIDENCE"
          href="/locations"
        />
        <KpiTile
          label="Recettes du jour"
          display="hidden lg:block"
          value={formatFcfa(revenue.today)}
          unit="FCFA"
          hint={`${revenue.paymentCountToday} règlement(s)`}
          icon={CashIcon}
          mode="RESIDENCE"
          href="/caisse"
        />
        <KpiTile
          label="Soldes à recouvrer"
          value={formatFcfa(receivables.total)}
          unit="FCFA"
          hint={`${receivables.count} séjour(s) concerné(s)`}
          icon={AlertCircleIcon}
          mode="RESIDENCE"
          tone={receivables.total > 0 ? "warn" : "default"}
          href="/locations"
        />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel title="Vos logements" subtitle="Statut calculé à l'instant" action={{ href: "/logements", label: "Tout voir" }}>
          {counts.all.total === 0 ? (
            <EmptyState text="Aucun logement enregistré." action={{ href: "/logements/new", label: "Ajouter un logement" }} />
          ) : (
            <>
              <StatusBar counts={counts.all} noun="logements" />
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-app-line pt-4 text-xs">
                <div>
                  <dt className="text-app-muted"><T>Chambres</T></dt>
                  <dd className="mt-0.5 text-sm font-bold text-app-text">
                    {counts.rooms.occupied} <T>occupée(s) sur</T> {counts.rooms.total}
                  </dd>
                </div>
                <div>
                  <dt className="text-app-muted"><T>Appartements</T></dt>
                  <dd className="mt-0.5 text-sm font-bold text-app-text">
                    {counts.apartments.occupied} <T>occupé(s) sur</T> {counts.apartments.total}
                  </dd>
                </div>
              </dl>
            </>
          )}
        </Panel>

        <Panel title="Arrivées du jour" subtitle="Réservations attendues aujourd'hui" action={{ href: "/reservations", label: "Réservations" }}>
          {overview.arrivals.length === 0 ? (
            <EmptyState text="Aucune arrivée prévue aujourd'hui." action={{ href: "/reservations/new", label: "Planifier une arrivée" }} />
          ) : (
            <ArrivalList arrivals={overview.arrivals} />
          )}
        </Panel>

        <Panel title="Départs du jour" subtitle="Séjours dont le départ est prévu aujourd'hui" action={{ href: "/locations", label: "Séjours" }}>
          {overview.departures.length === 0 ? (
            <EmptyState text="Aucun départ prévu aujourd'hui." />
          ) : (
            <StayList stays={overview.departures} />
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel
          title="Séjours en cours"
          subtitle="Du départ le plus proche au plus lointain"
          action={{ href: "/locations", label: "Tous les séjours" }}
          className="lg:col-span-2"
        >
          {overview.activeStays.length === 0 ? (
            <EmptyState text="Aucun séjour en cours." action={{ href: "/locations/new", label: "Enregistrer un séjour" }} />
          ) : (
            <StayList stays={overview.activeStays.slice(0, 6)} mobileLimit={3} />
          )}
        </Panel>

        <Panel title="Soldes à recouvrer" subtitle="Les plus gros restants dus" action={{ href: "/locations", label: "Séjours" }}>
          {receivables.top.length === 0 ? (
            <EmptyState text="Aucun solde en attente. Tous les séjours en cours sont payés." />
          ) : (
            <ReceivableList stays={receivables.top} />
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel title="Argent encaissé" subtitle="Paiements enregistrés, jamais des réservations" action={{ href: "/caisse", label: "Caisse" }}>
          <dl>
            <MoneyRow label="Aujourd'hui" value={revenue.today} />
            <MoneyRow label="Ce mois-ci" value={revenue.month} />
            <MoneyRow label="Cette année" value={revenue.year} />
            <MoneyRow label="Dépenses du mois" value={expenses.month} />
            <MoneyRow label="Solde du mois" value={revenue.month - expenses.month} strong />
          </dl>
        </Panel>

        <Panel title="7 derniers jours" subtitle="Recettes et dépenses par jour" className="lg:col-span-2">
          <WeeklyBars data={overview.weekly} />
        </Panel>
      </div>

      <p className="flex items-center gap-2 text-xs text-app-faint">
        <WalletIcon className="h-3.5 w-3.5" aria-hidden />
        {overview.clientCount} <T>client(s) dans votre fichier.</T>
      </p>
    </div>
  );
}
