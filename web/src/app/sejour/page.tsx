import Link from "next/link";
import { KeyIcon, CalendarIcon } from "@/components/ui/icons";
import { Card } from "@/components/ui/card";
import { RentalStatusBadge } from "@/app/locations/status-badge";
import { ReservationStatusBadge } from "@/app/reservations/status-badge";
import { SejourAvailableGrid, type GridProperty } from "./available-grid";
import {
  getPropertyStatusCounts,
  getTodayArrivals,
  getTodayDepartures,
  getActiveRentalsWithPayments,
} from "@/lib/dashboard-data";
import { listReservations, listActivePropertiesWithActiveTariffs } from "@/lib/reservations-data";
import { listProperties } from "@/lib/properties-data";
import { getPropertyStatuses } from "@/lib/property-status";
import { formatDuration } from "@/lib/duration";

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}
function fmtTime(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(d);
}
// Même logique que page.tsx (Accueil) — dupliquée plutôt que partagée,
// cohérent avec le reste du projet (chaque page a ses propres petits
// formatteurs locaux, ex. locations/[id]/page.tsx vs page.tsx).
function formatRemaining(now: Date, departureAt: Date) {
  const diffMs = departureAt.getTime() - now.getTime();
  if (diffMs <= 0) return "Départ dépassé";
  const totalMinutes = Math.round(diffMs / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}j ${hours}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes} min`;
}
function plural(n: number, word: string) {
  return `${word}${n > 1 ? "s" : ""}`;
}

// Correctif Lot 2 — tuile ultra-compacte (padding/texte réduits) pour que
// les 4 statistiques tiennent sur une seule ligne même à 390px, comme la
// maquette. Remplace l'ancien StatTile (basé sur Card, trop large à 4 sur
// une ligne en mobile).
function CompactStatTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-surface-raised px-1 py-2 text-center shadow-card">
      <p className="truncate text-[8px] font-bold uppercase tracking-wide text-fg/50">{label}</p>
      <p className="mt-0.5 text-sm font-extrabold leading-none sm:text-base" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

export default async function SejourPage() {
  const now = new Date();

  const [propertyCounts, arrivals, departures, activeRentals, upcomingReservations, propertiesResult, tariffProperties] =
    await Promise.all([
      getPropertyStatusCounts(),
      getTodayArrivals(),
      getTodayDepartures(now),
      getActiveRentalsWithPayments(),
      listReservations({ timeFilter: "upcoming" }),
      listProperties(),
      // Correctif Lot 2, section 10 — "Dès X FCFA" : calculé uniquement si
      // le logement a au moins un tarif actif réel, jamais inventé. Réutilise
      // listActivePropertiesWithActiveTariffs (déjà utilisée par le
      // formulaire Réserver), étendue d'un champ `photo` (voir
      // lib/reservations-data.ts) — aucune nouvelle requête, aucun nouveau
      // calcul métier.
      listActivePropertiesWithActiveTariffs(),
    ]);

  const statuses = await getPropertyStatuses(propertiesResult.items, now);

  const fromPriceByProperty = new Map<string, number>();
  for (const p of tariffProperties) {
    if (p.tariffs.length === 0) continue;
    fromPriceByProperty.set(p.id, Math.min(...p.tariffs.map((t) => t.amount)));
  }
  const photoByProperty = new Map(tariffProperties.map((p) => [p.id, p.photo]));

  // Grille "Logements" (desktop) — tous les logements, statut + photo réels
  // + prix uniquement quand il est réellement calculable (voir ci-dessus).
  const gridProperties: GridProperty[] = propertiesResult.items.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    photo: photoByProperty.get(p.id) ?? p.photo,
    status: statuses.get(p.id) ?? "UNAVAILABLE",
    fromPrice: fromPriceByProperty.get(p.id) ?? null,
  }));

  // "Disponibles pour entrée rapide" (mobile/tablette uniquement, maquette
  // mobile) — inchangé du Lot 2.
  const quickAvailable = propertiesResult.items.filter((p) => statuses.get(p.id) === "AVAILABLE").slice(0, 6);

  // "Planning du jour" (desktop, maquette PC) — fusion arrivées/départs du
  // jour déjà chargés pour les statistiques, même logique que la fusion déjà
  // faite dans l'Accueil (page.tsx::activityRows), pas un nouveau moteur.
  const planningRows = [
    ...arrivals.map((r) => ({
      id: `arr-${r.id}`,
      time: r.arrivalTime,
      kind: "arrival" as const,
      clientName: r.client?.name ?? "Sans client",
      propertyName: r.property.name,
      href: `/reservations/${r.id}`,
    })),
    ...departures.map((r) => ({
      id: `dep-${r.id}`,
      time: r.plannedDepartureAt,
      kind: "departure" as const,
      clientName: r.client.name,
      propertyName: r.property.name,
      href: `/locations/${r.id}`,
    })),
  ].sort((a, b) => a.time.getTime() - b.time.getTime());

  const stats = [
    { label: "En cours", value: activeRentals.items.length, color: "var(--color-info)" },
    { label: "Arrivées", value: arrivals.length, color: "var(--color-success)" },
    { label: "Départs", value: departures.length, color: "var(--color-danger)" },
    { label: "Réservés", value: upcomingReservations.total, color: "var(--color-warning)" },
  ];

  const ctaButtons = (
    <div className="grid grid-cols-2 gap-3">
      <Link
        href="/locations/new"
        className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-brand-orange px-4 py-4 text-ink shadow-card transition active:scale-[0.98] hover:brightness-105"
      >
        <KeyIcon className="h-6 w-6" />
        <span className="text-sm font-extrabold">Louer</span>
        <span className="text-[11px] font-medium text-ink/70">Entrée client direct</span>
      </Link>
      <Link
        href="/reservations/new"
        className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-brand-orange/40 bg-navy text-white shadow-card transition active:scale-[0.98] hover:bg-navy/80"
      >
        <CalendarIcon className="h-6 w-6 text-brand-orange" />
        <span className="text-sm font-extrabold">Réserver</span>
        <span className="text-[11px] font-medium text-white/70">Planifier un séjour</span>
      </Link>
    </div>
  );

  const statsGrid = (
    <div className="grid grid-cols-4 gap-1.5">
      {stats.map((s) => (
        <CompactStatTile key={s.label} label={s.label} value={s.value} color={s.color} />
      ))}
    </div>
  );

  const activeRentalsSection = (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-extrabold uppercase tracking-wide text-fg">
          Locations en cours ({activeRentals.items.length})
        </h2>
        <Link href="/locations" className="text-xs font-bold text-fg underline">
          Voir tout
        </Link>
      </div>
      {activeRentals.items.length === 0 ? (
        <p className="mt-2.5 text-sm font-medium text-fg/50">Aucune location en cours.</p>
      ) : (
        <div className="mt-2.5 flex flex-col gap-2.5">
          {activeRentals.items.map((rental) => (
            <Card key={rental.id} className="p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-bold text-fg">{rental.property.name}</p>
                    <RentalStatusBadge status={rental.status} />
                  </div>
                  <p className="mt-0.5 truncate text-xs font-semibold text-fg/70">{rental.client.name}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-bold text-brand-orange">{fmtFcfa(rental.amount)}</p>
                  <p className="text-[11px] text-fg/50">{formatDuration(rental.durationValue, rental.durationUnit)}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between rounded-lg bg-surface-sunken px-2.5 py-1.5 text-[11px] text-fg/60">
                <span>Entrée : {fmtTime(rental.arrivalAt)}</span>
                <span className="font-semibold text-danger">{formatRemaining(now, rental.plannedDepartureAt)}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link
                  href={`/locations/${rental.id}`}
                  className="flex h-8 items-center justify-center rounded-lg bg-surface-sunken text-[11px] font-bold text-fg"
                >
                  Voir
                </Link>
                <Link
                  href={`/locations/${rental.id}/extend`}
                  className="flex h-8 items-center justify-center rounded-lg border border-brand-orange/40 bg-brand-orange/15 text-[11px] font-bold text-brand-orange"
                >
                  Prolonger
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const upcomingSection = (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-extrabold uppercase tracking-wide text-fg">
          Prochaines réservations ({upcomingReservations.total})
        </h2>
        <Link href="/reservations" className="text-xs font-bold text-fg underline">
          Planning complet
        </Link>
      </div>
      {upcomingReservations.items.length === 0 ? (
        <p className="mt-2.5 text-sm font-medium text-fg/50">Aucune réservation à venir.</p>
      ) : (
        <div className="mt-2.5 flex flex-col gap-2.5">
          {upcomingReservations.items.map((r) => (
            <Link
              key={r.id}
              href={`/reservations/${r.id}`}
              className="flex items-center justify-between gap-3 rounded-xl bg-surface-raised px-3.5 py-3 shadow-card"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-bold text-fg">{r.property.name}</p>
                  <ReservationStatusBadge status={r.status} />
                </div>
                <p className="mt-0.5 truncate text-[11px] text-fg/60">
                  {r.client?.name ?? "Sans client"} · {formatDuration(r.durationValue, r.durationUnit)} ·{" "}
                  {fmtFcfa(r.amount)}
                </p>
              </div>
              <span className="shrink-0 text-xs font-bold text-warning">{fmtTime(r.arrivalTime)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  const quickAvailableSection =
    quickAvailable.length > 0 ? (
      <div>
        <h2 className="text-xs font-extrabold uppercase tracking-wide text-fg">Disponibles pour entrée rapide</h2>
        <div className="mt-2.5 flex flex-col gap-2">
          {quickAvailable.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-success/25 bg-success-bg px-3 py-2.5"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-fg">
                <span className="h-2 w-2 rounded-full bg-success" />
                {p.name}
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Link
                  href={`/locations/new?propertyId=${p.id}`}
                  className="inline-flex h-7 items-center gap-1 rounded-lg bg-brand-orange px-2.5 text-[11px] font-bold text-ink hover:brightness-105"
                >
                  <KeyIcon className="h-3 w-3" />
                  <span>Louer</span>
                </Link>
                <Link
                  href={`/reservations/new?propertyId=${p.id}`}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-sunken text-fg hover:bg-surface-raised"
                  aria-label={`Réserver ${p.name}`}
                >
                  <CalendarIcon className="h-3.5 w-3.5 text-brand-orange" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : null;

  const planningSection = (
    <div>
      <h2 className="text-xs font-extrabold uppercase tracking-wide text-fg">Planning du jour</h2>
      {planningRows.length === 0 ? (
        <p className="mt-2.5 text-sm font-medium text-fg/50">Rien de prévu aujourd&apos;hui.</p>
      ) : (
        <div className="mt-2.5 flex flex-col gap-2">
          {planningRows.map((row) => (
            <Link
              key={row.id}
              href={row.href}
              className="flex items-center justify-between gap-2 rounded-xl bg-surface-raised px-3 py-2.5 shadow-card"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-fg">{row.propertyName}</p>
                <p className="truncate text-[11px] text-fg/60">{row.clientName}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-xs font-bold ${row.kind === "arrival" ? "text-success" : "text-danger"}`}>
                  {row.kind === "arrival" ? "Arrivée" : "Départ"}
                </p>
                <p className="text-[11px] text-fg/50">{fmtTime(row.time)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-5 pt-6 pb-28 md:max-w-none md:px-8 md:pb-10 lg:px-10">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold text-fg">Séjour</h1>
        <span className="shrink-0 rounded-full border border-success/30 bg-success-bg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
          En direct
        </span>
      </div>
      <p className="mt-0.5 text-sm font-medium text-fg/60">Gérez vos locations et réservations en temps réel.</p>

      {/* Bandeau du jour — correctif Lot 2, section 2 : mêmes 4 valeurs que
          les tuiles juste en dessous, aucune donnée supplémentaire. */}
      <div className="mt-3 rounded-lg border border-border/10 bg-surface-sunken px-3 py-2 text-[11px] text-fg/70">
        <span className="font-semibold text-brand-orange">Aujourd&apos;hui :</span> {stats[0].value} en cours ·{" "}
        {stats[1].value} {plural(stats[1].value, "arrivée")} · {stats[2].value} {plural(stats[2].value, "départ")} ·{" "}
        {stats[3].value} {plural(stats[3].value, "réservée")}
      </div>

      <div className="mt-4">{ctaButtons}</div>
      <div className="mt-4">{statsGrid}</div>

      {/* Mobile + tablette — Locations en cours / Prochaines réservations en
          2 colonnes dès `md` (768px, indépendant du breakpoint `lg` du
          Shell/sidebar — correctif Lot 2, section 6), Disponibles en dessous
          sur toute la largeur. */}
      <div className="mt-5 lg:hidden">
        <div className="md:grid md:grid-cols-2 md:gap-5">
          {activeRentalsSection}
          <div className="mt-6 md:mt-0">{upcomingSection}</div>
        </div>
        {quickAvailableSection ? <div className="mt-6">{quickAvailableSection}</div> : null}
      </div>

      {/* Desktop — composition proche de la maquette PC : recherche +
          filtres + grille de logements (statut + photo réelle + "Dès X
          FCFA" si calculable) à gauche, Planning du jour à droite. */}
      <div className="mt-5 hidden lg:grid lg:grid-cols-[2fr_1fr] lg:gap-5">
        <div>
          <h2 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-fg">Logements</h2>
          <SejourAvailableGrid properties={gridProperties} />
        </div>
        <div>{planningSection}</div>
      </div>

      {/* Rappel discret des compteurs bruts (statut logements) — cohérent
          avec Accueil, pas une nouvelle donnée. */}
      <p className="mt-6 text-center text-[11px] font-medium text-fg/35">
        {propertyCounts.AVAILABLE} {plural(propertyCounts.AVAILABLE, "logement")} disponible
        {propertyCounts.AVAILABLE > 1 ? "s" : ""} au total
      </p>
    </div>
  );
}
