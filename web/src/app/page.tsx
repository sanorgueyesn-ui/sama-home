import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  AvailableIcon,
  OccupiedIcon,
  ReservationsIcon,
  RevenueIcon,
  ExpenseIcon,
  BalanceIcon,
} from "@/components/dashboard/stat-icons";
import { PropertyStatusGrid, type PropertyGridItem } from "@/components/dashboard/property-status-grid";
import { PropertyHero } from "@/components/dashboard/property-hero";
import { TodayActivityTable, type ActivityRow } from "@/components/dashboard/today-activity-table";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { ReservationStatusBadge } from "@/app/reservations/status-badge";
import { RentalStatusBadge } from "@/app/locations/status-badge";
import {
  getFinancialSummary,
  getPropertyStatusCounts,
  getTodayArrivals,
  getTodayDepartures,
  getActiveRentalsWithPayments,
  getWeeklyFinancialTrend,
} from "@/lib/dashboard-data";
import { listProperties } from "@/lib/properties-data";
import { listReservations } from "@/lib/reservations-data";
import { getPropertyStatuses, PROPERTY_STATUS_META } from "@/lib/property-status";
import { computeRentalTimeState } from "@/lib/rental-status";
import { formatDuration } from "@/lib/duration";
import { prisma } from "@/lib/prisma";

function fmtFcfa(amount: number) {
  const sign = amount < 0 ? "-" : "";
  return `${sign}${Math.abs(amount).toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}
function fmtDateHeader(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(d);
}

function ActivityCountRow({ label, value, dotColor }: { label: string; value: number; dotColor: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-paper px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className="h-2 w-2 rounded-full" style={{ background: dotColor }} />
        <span className="text-sm font-semibold text-navy">{label}</span>
      </div>
      <span className="text-sm font-extrabold text-navy">{value}</span>
    </div>
  );
}

export default async function Dashboard() {
  // Server-side, database-backed check — see src/lib/dal.ts. Redirects to
  // /login on its own if there is no valid session (Bloc 17).
  const user = await getCurrentUser();
  const now = new Date();

  const propertyCount = await prisma.property.count();

  const [financial, propertyCounts, arrivals, departures, activeRentals, propertiesForGrid, weeklyTrend, upcomingReservations] =
    await Promise.all([
      getFinancialSummary(now),
      getPropertyStatusCounts(),
      getTodayArrivals(),
      getTodayDepartures(now),
      getActiveRentalsWithPayments(),
      listProperties(),
      getWeeklyFinancialTrend(now),
      listReservations({ timeFilter: "upcoming" }),
    ]);

  // Hero dashboard (identité visuelle) — dérivé du résultat déjà chargé par
  // listProperties() ci-dessus, aucune nouvelle requête. Règle validée :
  // premier logement ACTIF avec une photo, dans l'ordre déjà renvoyé par
  // listProperties() (tri par nom) ; aucune photo -> composant en repli.
  const heroProperty = propertiesForGrid.items.find((p) => p.active && p.photo) ?? null;

  // "État des logements" (maquettes tablette/PC) — même combo listProperties +
  // getPropertyStatuses déjà utilisé par /logements, pas une nouvelle requête.
  const gridStatuses = await getPropertyStatuses(propertiesForGrid.items, now);
  const gridItems: PropertyGridItem[] = propertiesForGrid.items.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    photo: p.photo,
    status: gridStatuses.get(p.id) ?? "UNAVAILABLE",
  }));

  // "Locations et réservations du jour" (maquettes tablette/PC) — fusion des
  // mêmes `arrivals`/`departures` déjà chargés pour la section "Activité du
  // jour" mobile, juste rendus en table plutôt qu'en deux listes séparées.
  const activityRows: ActivityRow[] = [
    ...arrivals.map((r) => ({
      id: `res-${r.id}`,
      href: `/reservations/${r.id}`,
      time: r.arrivalTime,
      clientName: r.client.name,
      propertyName: r.property.name,
      typeLabel: formatDuration(r.durationValue, r.durationUnit),
      amount: r.amount,
      badge: <ReservationStatusBadge status={r.status} />,
    })),
    ...departures.map((r) => ({
      id: `dep-${r.id}`,
      href: `/locations/${r.id}`,
      time: r.plannedDepartureAt,
      clientName: r.client.name,
      propertyName: r.property.name,
      typeLabel: formatDuration(r.durationValue, r.durationUnit),
      amount: r.amount,
      badge: <RentalStatusBadge status={r.status} />,
    })),
  ].sort((a, b) => a.time.getTime() - b.time.getTime());

  // "Locations à échéance" (maquette mobile, bloc Activité du jour) — réutilise
  // exactement computeRentalTimeState (Phase 7) sur les locations actives déjà
  // chargées, aucun nouveau seuil inventé.
  const dueRentalsCount = activeRentals.items.filter(
    (r) => computeRentalTimeState(now, r.plannedDepartureAt) !== "normal",
  ).length;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-5 pt-6 pb-28 md:max-w-none md:px-8 md:pb-10 lg:px-10">
      {/* HEADER — commun aux 3 largeurs */}
      <div className="flex items-center justify-between gap-3">
        {/* min-w-0 : un enfant flex refuse par défaut de rétrécir sous la
            largeur naturelle de son contenu (min-width:auto, pas 0) — sans
            cette classe, "Tableau de bord" + la date pousse la ligne, et donc
            la page entière, plus large que le viewport en mobile/tablette. */}
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-navy">Tableau de bord</h1>
          <p className="mt-0.5 truncate text-sm font-medium capitalize text-navy/60">{fmtDateHeader(now)}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Actions rapides en en-tête — maquette PC uniquement */}
          <div className="hidden lg:flex lg:items-center lg:gap-2">
            <Link
              href="/reservations/new"
              className="flex h-10 items-center rounded-xl bg-success px-4 text-xs font-bold text-white"
            >
              + Nouvelle réservation
            </Link>
            <Link
              href="/locations/new"
              className="flex h-10 items-center rounded-xl bg-info px-4 text-xs font-bold text-white"
            >
              + Nouvelle location
            </Link>
          </div>
          <form action={logout}>
            <button type="submit" className="h-10 rounded-xl border border-navy/15 px-4 text-xs font-bold text-navy">
              Déconnexion
            </button>
          </form>
        </div>
      </div>
      <p className="mt-1 text-xs font-medium text-navy/40">
        Connecté en tant que {user.name} ({user.role}).
      </p>

      <PropertyHero
        property={
          heroProperty ? { name: heroProperty.name, type: heroProperty.type, photo: heroProperty.photo } : null
        }
      />

      {/* ===================== MOBILE (< md) ===================== */}
      <div className="md:hidden">
        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatCard
            label="DISPONIBLES"
            value={String(propertyCounts.AVAILABLE)}
            color={PROPERTY_STATUS_META.AVAILABLE.color}
            icon={AvailableIcon}
            iconBg="#E8F5EC"
          />
          <StatCard
            label="OCCUPÉS"
            value={String(propertyCounts.OCCUPIED)}
            color={PROPERTY_STATUS_META.OCCUPIED.color}
            icon={OccupiedIcon}
            iconBg="#FBEAEA"
          />
          <StatCard
            label="RÉSERVÉS"
            value={String(propertyCounts.RESERVED)}
            color={PROPERTY_STATUS_META.RESERVED.color}
          />
          <StatCard
            label="INDISPONIBLE"
            value={String(propertyCounts.UNAVAILABLE)}
            color={PROPERTY_STATUS_META.UNAVAILABLE.color}
          />
          <StatCard
            label="RECETTES DU JOUR"
            value={fmtFcfa(financial.revenueToday)}
            color="#16A34A"
            icon={RevenueIcon}
            iconBg="#E8F5EC"
          />
          <StatCard
            label="DÉPENSES DU JOUR"
            value={fmtFcfa(financial.expenseToday)}
            color="#E5484D"
            icon={ExpenseIcon}
            iconBg="#FBEAEA"
          />
        </div>

        <div className="mt-3 rounded-2xl bg-success-bg px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/60">
              <BalanceIcon className="h-4 w-4 text-success" />
            </span>
            <p className="text-[11px] font-bold text-success">SOLDE DU JOUR</p>
          </div>
          <p className="mt-1 text-xl font-extrabold text-success">{fmtFcfa(financial.balanceToday)}</p>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-navy">Activité du jour</h2>
          <Link href="/reservations" className="text-xs font-bold text-navy underline">
            Voir tout
          </Link>
        </div>
        <div className="mt-2.5 flex flex-col gap-2">
          <ActivityCountRow label="Arrivées" value={arrivals.length} dotColor="#16A34A" />
          <ActivityCountRow label="Départs" value={departures.length} dotColor="#F59E0B" />
          <ActivityCountRow label="Réservations à venir" value={upcomingReservations.total} dotColor="#2563EB" />
          <ActivityCountRow label="Locations à échéance" value={dueRentalsCount} dotColor="#52606D" />
        </div>
      </div>

      {/* ===================== TABLETTE (md à <lg) ===================== */}
      <div className="hidden md:block lg:hidden">
        <div className="mt-4 grid grid-cols-4 gap-3">
          <StatCard
            label="DISPONIBLES"
            value={String(propertyCounts.AVAILABLE)}
            color={PROPERTY_STATUS_META.AVAILABLE.color}
            icon={AvailableIcon}
            iconBg="#E8F5EC"
          />
          <StatCard
            label="OCCUPÉS"
            value={String(propertyCounts.OCCUPIED)}
            color={PROPERTY_STATUS_META.OCCUPIED.color}
            icon={OccupiedIcon}
            iconBg="#FBEAEA"
          />
          <StatCard
            label="RÉSERVÉS"
            value={String(propertyCounts.RESERVED)}
            color={PROPERTY_STATUS_META.RESERVED.color}
          />
          <StatCard
            label="RECETTES DU JOUR"
            value={fmtFcfa(financial.revenueToday)}
            color="#16A34A"
            icon={RevenueIcon}
            iconBg="#E8F5EC"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <StatCard
            label="DÉPENSES DU JOUR"
            value={fmtFcfa(financial.expenseToday)}
            color="#E5484D"
            icon={ExpenseIcon}
            iconBg="#FBEAEA"
          />
          <StatCard
            label="SOLDE DU JOUR"
            value={fmtFcfa(financial.balanceToday)}
            color={financial.balanceToday >= 0 ? "#16A34A" : "#E5484D"}
            icon={BalanceIcon}
            iconBg={financial.balanceToday >= 0 ? "#E8F5EC" : "#FBEAEA"}
          />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-navy">État des logements</h2>
          <Link href="/logements" className="text-xs font-bold text-navy underline">
            Voir tout
          </Link>
        </div>
        <PropertyStatusGrid items={gridItems.slice(0, 4)} />

        <div className="mt-5 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-navy">Locations et réservations du jour</h2>
          <Link href="/reservations" className="text-xs font-bold text-navy underline">
            Voir tout
          </Link>
        </div>
        <TodayActivityTable rows={activityRows} showAmount={false} />
      </div>

      {/* ===================== PC (lg+) ===================== */}
      <div className="hidden lg:block">
        <div className="mt-4 grid grid-cols-5 gap-3">
          <StatCard
            label="LOGEMENTS DISPONIBLES"
            value={`${propertyCounts.AVAILABLE}/${propertyCount}`}
            color={PROPERTY_STATUS_META.AVAILABLE.color}
            icon={AvailableIcon}
            iconBg="#E8F5EC"
          />
          <StatCard
            label="LOGEMENTS OCCUPÉS"
            value={`${propertyCounts.OCCUPIED}/${propertyCount}`}
            color={PROPERTY_STATUS_META.OCCUPIED.color}
            icon={OccupiedIcon}
            iconBg="#FBEAEA"
          />
          <StatCard
            label="RÉSERVATIONS AUJOURD'HUI"
            value={String(arrivals.length)}
            color="#2563EB"
            icon={ReservationsIcon}
            iconBg="#E7EEFC"
          />
          <StatCard
            label="RECETTES DU JOUR"
            value={fmtFcfa(financial.revenueToday)}
            color="#16A34A"
            icon={RevenueIcon}
            iconBg="#E8F5EC"
          />
          <StatCard
            label="DÉPENSES DU JOUR"
            value={fmtFcfa(financial.expenseToday)}
            color="#E5484D"
            icon={ExpenseIcon}
            iconBg="#FBEAEA"
          />
        </div>

        <div className="mt-5 grid grid-cols-[2fr_1fr] gap-5">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-navy">État des logements</h2>
              <Link href="/logements" className="text-xs font-bold text-navy underline">
                Voir tout
              </Link>
            </div>
            <PropertyStatusGrid items={gridItems.slice(0, 8)} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-navy">Locations du jour</h2>
              <Link href="/reservations" className="text-xs font-bold text-navy underline">
                Voir tout
              </Link>
            </div>
            <TodayActivityTable rows={activityRows} showAmount={true} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-[2fr_1fr] gap-5">
          <div>
            <h2 className="text-sm font-extrabold text-navy">Recettes et dépenses (7 derniers jours)</h2>
            <RevenueChart data={weeklyTrend} />
          </div>
          <div className="flex flex-col justify-center rounded-2xl bg-success-bg px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/60">
                <BalanceIcon className="h-3.5 w-3.5 text-success" />
              </span>
              <p className="text-xs font-bold text-success">SOLDE</p>
            </div>
            <p className="mt-1 text-2xl font-extrabold text-success">{fmtFcfa(financial.balanceToday)}</p>
          </div>
        </div>
      </div>

      {/* FAB mobile uniquement — maquette mobile, cliquable vers Nouvelle
          réservation (décision validée). */}
      <Link
        href="/reservations/new"
        aria-label="Nouvelle réservation"
        className="fixed right-5 bottom-20 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-coral text-white shadow-lg md:hidden"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </Link>
    </div>
  );
}
