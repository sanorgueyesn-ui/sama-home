import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { ReservationStatusBadge } from "@/app/reservations/status-badge";
import { RentalTimeIndicator } from "@/app/locations/time-indicator";
import {
  getFinancialSummary,
  getPropertyStatusCounts,
  getTodayArrivals,
  getTodayDepartures,
  getActiveRentalsWithPayments,
} from "@/lib/dashboard-data";
import { PROPERTY_STATUS_META } from "@/lib/property-status";
import { prisma } from "@/lib/prisma";

function fmtFcfa(amount: number) {
  const sign = amount < 0 ? "-" : "";
  return `${sign}${Math.abs(amount).toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}
function fmtTime(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(d);
}
function fmtDateHeader(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(d);
}

export default async function Dashboard() {
  // Server-side, database-backed check — see src/lib/dal.ts. Redirects to
  // /login on its own if there is no valid session (Bloc 17).
  const user = await getCurrentUser();
  const now = new Date();

  const propertyCount = await prisma.property.count();

  const [financial, propertyCounts, arrivals, departures, activeRentals] = await Promise.all([
    getFinancialSummary(now),
    getPropertyStatusCounts(),
    getTodayArrivals(),
    getTodayDepartures(now),
    getActiveRentalsWithPayments(),
  ]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-4xl flex-col px-5 pt-6 pb-10">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Tableau de bord</h1>
          <p className="mt-0.5 text-sm font-medium capitalize text-navy/60">{fmtDateHeader(now)}</p>
        </div>
        <form action={logout}>
          <button type="submit" className="h-10 rounded-xl border border-navy/15 px-4 text-xs font-bold text-navy">
            Déconnexion
          </button>
        </form>
      </div>
      <p className="mt-1 text-xs font-medium text-navy/40">
        Connecté en tant que {user.name} ({user.role}).
      </p>

      {/* Modules — navigation vers les listes complètes (fonctionnalité déjà
          validée, conservée intégralement ici plutôt que supprimée). */}
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { href: "/clients", label: "Clients" },
          { href: "/logements", label: "Logements" },
          { href: "/reservations", label: "Réservations" },
          { href: "/locations", label: "Locations" },
          { href: "/depenses", label: "Dépenses" },
          { href: "/settings", label: "Paramètres" },
        ].map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="h-9 rounded-lg border border-navy/15 px-3.5 text-xs font-bold text-navy flex items-center"
          >
            {m.label}
          </Link>
        ))}
      </div>

      {/* SECTION 1 — Aujourd'hui (finances) */}
      <section className="mt-6">
        <h2 className="text-sm font-extrabold text-navy">Aujourd&apos;hui</h2>
        <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="REVENUS" value={fmtFcfa(financial.revenueToday)} color="#16A34A" />
          <StatCard label="DÉPENSES" value={fmtFcfa(financial.expenseToday)} color="#E5484D" />
          <StatCard
            label="SOLDE"
            value={fmtFcfa(financial.balanceToday)}
            color={financial.balanceToday >= 0 ? "#16A34A" : "#E5484D"}
          />
        </div>
      </section>

      {/* SECTION 2 — Ce mois (finances) */}
      <section className="mt-5">
        <h2 className="text-sm font-extrabold text-navy">Ce mois</h2>
        <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="REVENUS" value={fmtFcfa(financial.revenueMonth)} color="#16A34A" />
          <StatCard label="DÉPENSES" value={fmtFcfa(financial.expenseMonth)} color="#E5484D" />
          <StatCard
            label="SOLDE"
            value={fmtFcfa(financial.balanceMonth)}
            color={financial.balanceMonth >= 0 ? "#16A34A" : "#E5484D"}
          />
        </div>
      </section>

      {/* SECTION 3 — Logements */}
      <section className="mt-5">
        <h2 className="text-sm font-extrabold text-navy">Logements</h2>
        {propertyCount === 0 ? (
          <p className="mt-2.5 text-sm font-medium text-navy/50">Aucun logement enregistré.</p>
        ) : (
          <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-4">
            {(["AVAILABLE", "OCCUPIED", "RESERVED", "UNAVAILABLE"] as const).map((status) => (
              <StatCard
                key={status}
                label={PROPERTY_STATUS_META[status].label.toUpperCase()}
                value={String(propertyCounts[status])}
                color={PROPERTY_STATUS_META[status].color}
              />
            ))}
          </div>
        )}
      </section>

      {/* SECTION 4 — Activité du jour */}
      <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-extrabold text-navy">Arrivées prévues</h2>
          {arrivals.length === 0 ? (
            <p className="mt-2.5 text-sm font-medium text-navy/50">Aucune arrivée prévue aujourd&apos;hui.</p>
          ) : (
            <div className="mt-2.5 flex flex-col gap-2">
              {arrivals.map((r) => (
                <Link key={r.id} href={`/reservations/${r.id}`}>
                  <Card className="p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-extrabold text-navy">{r.client.name}</p>
                        <p className="mt-0.5 text-xs font-semibold text-navy/60">
                          {r.property.name} · {fmtTime(r.arrivalTime)}
                        </p>
                      </div>
                      <ReservationStatusBadge status={r.status} />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-extrabold text-navy">Départs prévus</h2>
          {departures.length === 0 ? (
            <p className="mt-2.5 text-sm font-medium text-navy/50">Aucun départ prévu aujourd&apos;hui.</p>
          ) : (
            <div className="mt-2.5 flex flex-col gap-2">
              {departures.map((r) => (
                <Link key={r.id} href={`/locations/${r.id}`}>
                  <Card className="p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-extrabold text-navy">{r.client.name}</p>
                        <p className="mt-0.5 text-xs font-semibold text-navy/60">
                          {r.property.name} · {fmtTime(r.plannedDepartureAt)}
                        </p>
                      </div>
                      <RentalTimeIndicator now={now} plannedDepartureAt={r.plannedDepartureAt} />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SECTION 5 — Locations en cours */}
      <section id="locations-en-cours" className="mt-5">
        <h2 className="text-sm font-extrabold text-navy">Locations en cours</h2>
        {activeRentals.items.length === 0 ? (
          <p className="mt-2.5 text-sm font-medium text-navy/50">Aucune location en cours.</p>
        ) : (
          <div className="mt-2.5 flex flex-col gap-3">
            {activeRentals.items.map((r) => {
              const summary = activeRentals.summaries.get(r.id);
              return (
                <Link key={r.id} href={`/locations/${r.id}`}>
                  <Card className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-extrabold text-navy">{r.client.name}</p>
                        <p className="mt-0.5 text-xs font-semibold text-navy/60">{r.property.name}</p>
                      </div>
                      <RentalTimeIndicator now={now} plannedDepartureAt={r.plannedDepartureAt} />
                    </div>
                    <div className="mt-2.5 flex items-center gap-4 text-xs font-semibold text-navy">
                      <span>Arrivée {fmtTime(r.arrivalAt)}</span>
                      <span>Départ prévu {fmtTime(r.plannedDepartureAt)}</span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-navy/60">
                      {fmtFcfa(r.amount)} · Payé {fmtFcfa(summary?.totalPaid ?? 0)} · Reste{" "}
                      {fmtFcfa(summary?.remaining ?? r.amount)}
                    </div>
                  </Card>
                </Link>
              );
            })}
            {activeRentals.truncated && (
              <p className="pt-1 text-center text-xs font-medium text-navy/50">
                <Link href="/locations?time=active" className="underline">
                  Voir toutes les locations en cours
                </Link>
              </p>
            )}
          </div>
        )}
      </section>

      {/* SECTION 6 — Actions rapides */}
      <section className="mt-6 mb-2">
        <h2 className="text-sm font-extrabold text-navy">Actions rapides</h2>
        <div className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link
            href="/reservations/new"
            className="flex h-14 items-center justify-center rounded-2xl bg-navy px-3 text-center text-sm font-extrabold text-white"
          >
            Nouvelle réservation
          </Link>
          <Link
            href="/locations/new"
            className="flex h-14 items-center justify-center rounded-2xl bg-navy px-3 text-center text-sm font-extrabold text-white"
          >
            Nouvelle location
          </Link>
          <Link
            href="/depenses/new"
            className="flex h-14 items-center justify-center rounded-2xl bg-navy px-3 text-center text-sm font-extrabold text-white"
          >
            Nouvelle dépense
          </Link>
          {/* Pas de flux d'encaissement générique (Payment exige toujours
              une réservation/location précise, Phase 8) : ce bouton mène à
              la section "Locations en cours" ci-dessus, où chaque carte
              porte son propre lien "Encaisser" contextuel — aucune nouvelle
              route créée (Bloc 9). */}
          <a
            href="#locations-en-cours"
            className="flex h-14 items-center justify-center rounded-2xl border border-navy/15 px-3 text-center text-sm font-extrabold text-navy"
          >
            Encaisser
          </a>
        </div>
      </section>
    </div>
  );
}
