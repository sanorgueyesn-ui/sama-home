import { AlertCircleIcon, BuildingIcon, CashIcon, CheckCircleIcon, KeyIcon, UsersIcon } from "@/components/ui/icons";
import {
  DashboardHeader,
  EmptyState,
  KpiGrid,
  KpiTile,
  MoneyRow,
  Panel,
  MobileSummary,
  SoonCard,
  StatusBar,
  WeeklyBars,
} from "@/components/dashboard/dashboard-ui";
import { AGENCY_ACTIONS } from "@/components/dashboard/dashboard-actions";
import { ReceivableList, StayList } from "@/components/dashboard/dashboard-lists";
import { formatFcfa, occupancyRate } from "@/lib/dashboard-metrics";
import type { DashboardOverview } from "@/lib/dashboard-overview";

/** Espace insécable : empêche un montant de se couper sur deux lignes (« 645 / 000 »). */
const NBSP = "\u00a0";

/**
 * Tableau de bord Agence immobilière (guide Agence §4). Il montre ce que les données permettent
 * déjà : biens, occupation, locations en cours, loyers encaissés, impayés, dépenses. Mandats,
 * propriétaires, visites, commissions et reversements n'existent pas encore : ils sont annoncés
 * sans aucun chiffre, jamais simulés (le guide l'interdit).
 */
export function DashboardAgencyView({ overview }: { overview: DashboardOverview }) {
  const { counts, revenue, expenses, receivables, now } = overview;
  const rentedRate = occupancyRate(counts.all);

  return (
    <div className="flex flex-col gap-5">
      <DashboardHeader
        userName={overview.userName}
        spaceName={overview.spaceName}
        mode="AGENCY"
        now={now}
        actions={AGENCY_ACTIONS}
      />

      <MobileSummary
        mode="AGENCY"
        title="Loyers encaissés ce mois-ci"
        value={formatFcfa(revenue.month)}
        caption={`Dépenses ${formatFcfa(expenses.month)} · solde ${formatFcfa(revenue.month - expenses.month)} FCFA`.replaceAll(" ", NBSP)}
        percent={rentedRate}
        percentLabel="loués"
        stats={[
          { label: "Loués", value: String(counts.all.occupied), href: "/logements" },
          { label: "Disponibles", value: String(counts.all.available), href: "/logements" },
          { label: "Locations", value: String(overview.activeStays.length), href: "/locations" },
        ]}
      />

      <KpiGrid>
        <KpiTile
          label="Biens enregistrés"
          value={String(counts.all.total)}
          hint={`${counts.apartments.total} appartement(s), ${counts.rooms.total} chambre(s)`}
          icon={BuildingIcon}
          mode="AGENCY"
          href="/logements"
        />
        <KpiTile
          label="Biens disponibles"
          display="hidden lg:block"
          value={String(counts.all.available)}
          hint="Libres à la location"
          icon={CheckCircleIcon}
          mode="AGENCY"
          tone="good"
          href="/logements"
        />
        <KpiTile
          label="Biens loués"
          display="hidden lg:block"
          value={String(counts.all.occupied)}
          hint={`${counts.all.reserved} réservé(s)`}
          icon={KeyIcon}
          mode="AGENCY"
          href="/logements"
        />
        <KpiTile
          label="Locations en cours"
          display="hidden lg:block"
          value={String(overview.activeStays.length)}
          hint={`${overview.clientCount} client(s) au fichier`}
          icon={UsersIcon}
          mode="AGENCY"
          href="/locations"
        />
        <KpiTile
          label="Loyers encaissés"
          display="hidden lg:block"
          value={formatFcfa(revenue.month)}
          unit="FCFA"
          hint="Ce mois-ci"
          icon={CashIcon}
          mode="AGENCY"
          href="/caisse"
        />
        <KpiTile
          label="Impayés"
          value={formatFcfa(receivables.total)}
          unit="FCFA"
          hint={`${receivables.count} location(s) concernée(s)`}
          icon={AlertCircleIcon}
          mode="AGENCY"
          tone={receivables.total > 0 ? "warn" : "default"}
          href="/locations"
        />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel title="Portefeuille" subtitle="Occupation de vos biens" action={{ href: "/logements", label: "Tous les biens" }}>
          {counts.all.total === 0 ? (
            <EmptyState text="Aucun bien enregistré." action={{ href: "/logements/new", label: "Ajouter un bien" }} />
          ) : (
            <>
              <StatusBar counts={counts.all} noun="biens" />
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-app-line pt-4 text-xs">
                <div>
                  <dt className="text-app-muted">Appartements</dt>
                  <dd className="mt-0.5 text-sm font-bold text-app-text">
                    {counts.apartments.occupied} loué(s) sur {counts.apartments.total}
                  </dd>
                </div>
                <div>
                  <dt className="text-app-muted">Chambres</dt>
                  <dd className="mt-0.5 text-sm font-bold text-app-text">
                    {counts.rooms.occupied} louée(s) sur {counts.rooms.total}
                  </dd>
                </div>
              </dl>
            </>
          )}
        </Panel>

        <Panel title="Loyers et dépenses" subtitle="Paiements enregistrés" action={{ href: "/caisse", label: "Caisse" }}>
          <dl>
            <MoneyRow label="Loyers du mois" value={revenue.month} />
            <MoneyRow label="Loyers de l'année" value={revenue.year} />
            <MoneyRow label="Dépenses du mois" value={expenses.month} />
            <MoneyRow label="Solde du mois" value={revenue.month - expenses.month} strong />
          </dl>
        </Panel>

        <Panel title="Impayés" subtitle="Les plus gros restants dus" action={{ href: "/locations", label: "Locations" }}>
          {receivables.top.length === 0 ? (
            <EmptyState text="Aucun impayé. Toutes les locations en cours sont à jour." />
          ) : (
            <ReceivableList stays={receivables.top} />
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel
          title="Locations en cours"
          subtitle="De la fin prévue la plus proche à la plus lointaine"
          action={{ href: "/locations", label: "Toutes les locations" }}
          className="lg:col-span-2"
        >
          {overview.activeStays.length === 0 ? (
            <EmptyState text="Aucune location en cours." action={{ href: "/locations/new", label: "Enregistrer une location" }} />
          ) : (
            <StayList stays={overview.activeStays.slice(0, 6)} endLabel="Fin" mobileLimit={3} />
          )}
        </Panel>

        <Panel title="7 derniers jours" subtitle="Encaissements et dépenses par jour">
          <WeeklyBars data={overview.weekly} />
        </Panel>
      </div>

      <section aria-labelledby="agence-bientot" className="flex flex-col gap-3">
        <div>
          <h2 id="agence-bientot" className="text-sm font-bold text-app-text">
            Prochains modules de l&apos;agence
          </h2>
          <p className="mt-0.5 text-xs text-app-muted">En préparation : aucun chiffre n&apos;est affiché tant qu&apos;ils n&apos;existent pas.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SoonCard title="Mandats et propriétaires" text="Biens confiés par les propriétaires, mandats et dates d'expiration, fiches propriétaires." />
          <SoonCard title="Visites et prospects" text="Demandes, visites planifiées, suivi des prospects à relancer, offres en cours." />
          <SoonCard title="Commissions et reversements" text="Commissions de l'agence, loyers à reverser aux propriétaires, relevés." />
        </div>
      </section>
    </div>
  );
}
