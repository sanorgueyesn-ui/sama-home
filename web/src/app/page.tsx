import { existsSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { StatCard } from "@/components/dashboard/stat-card";
import { AvailableIcon, OccupiedIcon, ReservationsIcon, RevenueIcon } from "@/components/dashboard/stat-icons";
import { MyProperties, type MyPropertyItem } from "@/components/dashboard/my-properties";
import { getFinancialSummary, getPropertyStatusCounts, getTodayArrivals, getTodayDepartures } from "@/lib/dashboard-data";
import { listProperties } from "@/lib/properties-data";
import { listActivePropertiesWithActiveTariffs } from "@/lib/reservations-data";
import { listExpenses } from "@/lib/expenses-data";
import { getPropertyStatuses, PROPERTY_STATUS_META } from "@/lib/property-status";
import { prisma } from "@/lib/prisma";

// Reconstruction stricte Stitch (Accueil) — background d'ambiance GLOBAL,
// jamais dérivé de Property.photo (règle absolue de ce lot). Même asset de
// marque que les tours précédents, utilisé ici uniquement comme fond —
// jamais un bandeau Hero, jamais lié à un logement précis. Vérifié une fois
// par rendu serveur, aucune nouvelle dépendance ; si l'asset n'existe pas,
// aucune image n'est affichée (jamais inventée).
const BRAND_AMBIANCE_PUBLIC_PATH = "/images/hero/sama-home-default-hero.png";
const brandAmbianceExists = existsSync(join(process.cwd(), "public", "images", "hero", "sama-home-default-hero.png"));

function fmtFcfa(amount: number) {
  const sign = amount < 0 ? "-" : "";
  return `${sign}${Math.abs(amount).toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}
function fmtDateHeader(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(d);
}
function fmtTime(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(d);
}

export default async function Dashboard() {
  // Server-side, database-backed check — see src/lib/dal.ts. Redirects to
  // /login on its own if there is no valid session (Bloc 17).
  const user = await getCurrentUser();
  const now = new Date();

  // Phase 3C / Lot C2 — `establishmentId` résolu depuis `user` ci-dessus
  // (déjà présent), jamais depuis une donnée transmise par le navigateur.
  // Sans établissement, 0 plutôt que le total de tous les établissements.
  const propertyCount = user.establishmentId
    ? await prisma.property.count({ where: { establishmentId: user.establishmentId } })
    : 0;

  const [financial, propertyCounts, arrivals, departures, propertiesForGrid, tariffProperties, recentExpenses] =
    await Promise.all([
      getFinancialSummary(now),
      getPropertyStatusCounts(),
      getTodayArrivals(),
      getTodayDepartures(now),
      listProperties(),
      // Reconstruction UI (Accueil, "Mes biens") — même fonction déjà
      // utilisée et validée par /sejour, pour le "Dès X FCFA" : aucune
      // nouvelle requête inventée, juste réutilisée ici aussi.
      listActivePropertiesWithActiveTariffs(),
      // Reconstruction stricte Stitch — "Dépenses récentes" (colonne
      // droite desktop) : fonction déjà existante (module Dépenses),
      // jamais touchée, simplement réutilisée ici.
      listExpenses({ period: "today" }),
    ]);

  // Pourcentages (maquette Stitch) — calculés localement à partir des
  // compteurs réels déjà chargés, jamais une valeur inventée.
  const pct = (n: number) => (propertyCount > 0 ? Math.round((n / propertyCount) * 100) : 0);

  // "Mes biens" — même combo listProperties + getPropertyStatuses déjà
  // utilisé par /logements, pas une nouvelle requête. `capacity` :
  // Property.capacity, déjà en base (donnée réelle, jamais 0 en pratique).
  // `fromPrice` : même calcul que sejour/page.tsx (tarif actif le moins
  // cher, `null` si aucun — jamais inventé).
  const gridStatuses = await getPropertyStatuses(propertiesForGrid.items, now);
  const fromPriceByProperty = new Map<string, number>();
  for (const p of tariffProperties) {
    if (p.tariffs.length === 0) continue;
    fromPriceByProperty.set(p.id, Math.min(...p.tariffs.map((t) => t.amount)));
  }
  const myPropertiesItems: MyPropertyItem[] = propertiesForGrid.items.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    photo: p.photo,
    capacity: p.capacity,
    status: gridStatuses.get(p.id) ?? "UNAVAILABLE",
    fromPrice: fromPriceByProperty.get(p.id) ?? null,
  }));

  // "Planning du jour" (colonne droite desktop, maquette Stitch) — fusion
  // des mêmes `arrivals`/`departures` déjà chargés, triée par heure. Même
  // données que les lots précédents, juste reprises ici pour la colonne
  // latérale plutôt qu'un tableau en zone centrale (Stitch n'a pas de
  // tableau d'activité en zone centrale).
  const planningRows = [
    ...arrivals.map((r) => ({
      id: `res-${r.id}`,
      href: `/reservations/${r.id}`,
      time: r.arrivalTime,
      clientName: r.client?.name ?? "Sans client",
      propertyName: r.property?.name ?? "Logement",
    })),
    ...departures.map((r) => ({
      id: `dep-${r.id}`,
      href: `/locations/${r.id}`,
      time: r.plannedDepartureAt,
      clientName: r.client?.name ?? "Client",
      propertyName: r.property?.name ?? "Logement",
    })),
  ].sort((a, b) => a.time.getTime() - b.time.getTime());

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-5 pt-6 pb-28 md:max-w-none md:px-8 md:pb-10 lg:px-10">
      {/* Background d'ambiance GLOBAL (maquette Stitch) — fixed, derrière
          tout le contenu, jamais lié à Property.photo (règle absolue de ce
          lot : aucune `heroProperty`/recherche du premier logement avec
          photo). Asset de marque statique uniquement. Aucune hauteur
          réservée dans le flux (position fixed, pas de place prise). */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {brandAmbianceExists ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={BRAND_AMBIANCE_PUBLIC_PATH} alt="" className="h-full w-full object-cover opacity-15" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-navy/70 via-surface/92 to-surface" />
      </div>

      {/* HEADER — commun aux 3 largeurs */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-fg sm:truncate sm:text-2xl">Bonjour {user.name.split(" ")[0]} 👋</h1>
          <p className="mt-0.5 truncate text-sm font-medium capitalize text-fg/60">{fmtDateHeader(now)}</p>
        </div>
        {/* CTA desktop — maquette Stitch (couleurs exactes : orange plein +
            navy plein, pas un style neutre). */}
        <div className="hidden lg:flex lg:items-center lg:gap-2">
          <Link
            href="/locations/new"
            className="flex h-10 items-center rounded-xl bg-brand-orange px-4 text-xs font-bold text-ink"
          >
            🔑 Nouveau séjour (Louer)
          </Link>
          <Link
            href="/reservations/new"
            className="flex h-10 items-center rounded-xl border border-border/15 bg-navy px-4 text-xs font-semibold text-white"
          >
            📅 Enregistrer réservation
          </Link>
        </div>
      </div>
      <p className="mt-1 text-xs font-medium text-fg/40">
        Connecté en tant que {user.name} ({user.role}).
      </p>

      {/* CTA tablette — mêmes routes, libellés Stitch tablette. */}
      <div className="mt-3 hidden gap-2 md:flex lg:hidden">
        <Link
          href="/locations/new"
          className="flex h-10 flex-1 items-center justify-center rounded-xl bg-brand-orange text-xs font-bold text-ink"
        >
          + Louer un bien
        </Link>
        <Link
          href="/reservations/new"
          className="flex h-10 flex-1 items-center justify-center rounded-xl border border-border/15 bg-navy text-xs font-semibold text-white"
        >
          + Réserver
        </Link>
      </div>

      {/* ===================== STATISTIQUES — AVANT MES BIENS (maquette Stitch, les 3 largeurs) ===================== */}

      {/* MOBILE : bloc Recettes du jour mis en avant + matrice compacte 4 cases */}
      <div className="mt-5 md:hidden">
        <div className="rounded-2xl border border-brand-orange/25 bg-surface-raised p-4">
          <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-brand-orange">
            <RevenueIcon className="h-4 w-4" /> Recettes du jour
          </span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-fg">{fmtFcfa(financial.revenueToday)}</span>
            <span className="text-[11px] font-semibold text-fg/50">
              {financial.paymentCountToday} règlement{financial.paymentCountToday > 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          <StatCard label="BIENS" value={String(propertyCount)} sub="Total" />
          <StatCard
            label="DISPO"
            value={String(propertyCounts.AVAILABLE)}
            sub={`${pct(propertyCounts.AVAILABLE)}%`}
            color={PROPERTY_STATUS_META.AVAILABLE.color}
          />
          <StatCard
            label="OCCUPÉS"
            value={String(propertyCounts.OCCUPIED)}
            sub={`${pct(propertyCounts.OCCUPIED)}%`}
            color={PROPERTY_STATUS_META.OCCUPIED.color}
          />
          <StatCard
            label="RÉSERVÉS"
            value={String(propertyCounts.RESERVED)}
            sub={`${pct(propertyCounts.RESERVED)}%`}
            color={PROPERTY_STATUS_META.RESERVED.color}
          />
        </div>
      </div>

      {/* TABLETTE : grille 4 colonnes (Biens / Disponibles / Occupés / Recettes) */}
      <div className="hidden md:block lg:hidden">
        <div className="mt-5 grid grid-cols-4 gap-3">
          <StatCard label="BIENS" value={String(propertyCount)} sub="Total gérés" />
          <StatCard
            label="DISPONIBLES"
            value={String(propertyCounts.AVAILABLE)}
            sub={`${pct(propertyCounts.AVAILABLE)}% prêts`}
            color={PROPERTY_STATUS_META.AVAILABLE.color}
            icon={AvailableIcon}
            iconBg="var(--color-success-bg)"
          />
          <StatCard
            label="OCCUPÉS"
            value={String(propertyCounts.OCCUPIED)}
            sub={`${pct(propertyCounts.OCCUPIED)}% en séjour`}
            color={PROPERTY_STATUS_META.OCCUPIED.color}
            icon={OccupiedIcon}
            iconBg="var(--color-danger-bg)"
          />
          <StatCard
            label="RECETTES"
            value={fmtFcfa(financial.revenueToday)}
            sub={`${financial.paymentCountToday} règlement${financial.paymentCountToday > 1 ? "s" : ""}`}
            color="var(--color-success)"
            icon={RevenueIcon}
            iconBg="var(--color-success-bg)"
          />
        </div>
      </div>

      {/* DESKTOP : grille 5 colonnes (Biens / Disponibles / Occupés / Réservés / Recettes) */}
      <div className="hidden lg:block">
        <div className="mt-5 grid grid-cols-5 gap-3">
          <StatCard label="BIENS" value={String(propertyCount)} sub="Logements inscrits" />
          <StatCard
            label="DISPONIBLES"
            value={String(propertyCounts.AVAILABLE)}
            sub={`${pct(propertyCounts.AVAILABLE)}%`}
            color={PROPERTY_STATUS_META.AVAILABLE.color}
            icon={AvailableIcon}
            iconBg="var(--color-success-bg)"
          />
          <StatCard
            label="OCCUPÉS"
            value={String(propertyCounts.OCCUPIED)}
            sub={`${pct(propertyCounts.OCCUPIED)}%`}
            color={PROPERTY_STATUS_META.OCCUPIED.color}
            icon={OccupiedIcon}
            iconBg="var(--color-danger-bg)"
          />
          <StatCard
            label="RÉSERVÉS"
            value={String(propertyCounts.RESERVED)}
            sub={`${pct(propertyCounts.RESERVED)}%`}
            color={PROPERTY_STATUS_META.RESERVED.color}
            icon={ReservationsIcon}
            iconBg="var(--color-warning-bg)"
          />
          <StatCard
            label="RECETTES JOUR"
            value={fmtFcfa(financial.revenueToday)}
            sub={`${financial.paymentCountToday} règlement${financial.paymentCountToday > 1 ? "s" : ""}`}
            color="var(--color-success)"
            icon={RevenueIcon}
            iconBg="var(--color-success-bg)"
          />
        </div>
      </div>

      {/* ===================== MES BIENS (titre commun aux 3 largeurs) ===================== */}
      <div className="mt-5 flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-fg">
          Mes biens <span className="font-normal text-fg/40">({propertyCount})</span>
        </h2>
        <Link href="/logements" className="text-xs font-bold text-fg underline">
          Voir tout
        </Link>
      </div>

      {/* Desktop : Mes biens (colonne principale) + colonne droite
          Planning/Dépenses/Accès rapide (maquette Stitch). Mobile/tablette :
          pas de colonne droite, Mes biens pleine largeur (grid-cols ne
          s'applique qu'à partir de lg). */}
      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-6">
        <div>
          <MyProperties items={myPropertiesItems} />
        </div>

        <aside className="mt-5 hidden lg:mt-0 lg:flex lg:flex-col lg:gap-5">
          {/* Planning du jour */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-fg">Planning du jour</h3>
            <div className="mt-2.5 flex flex-col gap-2">
              {planningRows.length === 0 ? (
                <p className="text-xs font-medium text-fg/50">Aucune arrivée ni départ prévu aujourd&apos;hui.</p>
              ) : (
                planningRows.map((row) => (
                  <Link
                    key={row.id}
                    href={row.href}
                    className="rounded-xl border-l-2 border-brand-orange bg-surface-sunken p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-bold text-fg">
                      <span className="truncate">{row.propertyName}</span>
                      <span className="shrink-0 text-brand-orange">{fmtTime(row.time)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-fg/50">{row.clientName}</p>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Dépenses récentes */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide text-fg">Dépenses récentes</h3>
              <Link href="/depenses/new" className="text-[11px] font-bold text-brand-orange hover:underline">
                + Ajouter
              </Link>
            </div>
            <div className="mt-2.5 flex flex-col gap-2">
              {recentExpenses.items.length === 0 ? (
                <p className="text-xs font-medium text-fg/50">Aucune dépense aujourd&apos;hui.</p>
              ) : (
                recentExpenses.items.slice(0, 4).map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border/10 bg-surface-sunken px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-fg">{expense.categoryNameSnapshot}</p>
                      <p className="text-[10px] text-fg/50">{fmtTime(expense.paidAt)}</p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-coral">-{fmtFcfa(expense.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Accès Rapide Séjour */}
          <div className="rounded-2xl border border-border/10 bg-gradient-to-br from-navy to-surface-raised p-4">
            <p className="text-xs font-bold text-fg">🔑 Espace Séjour Unifié</p>
            <p className="mt-1 text-[11px] leading-snug text-fg/60">
              Un seul concept pour louer immédiatement ou réserver à l&apos;avance sans changer de vue.
            </p>
            <Link
              href="/sejour"
              className="mt-2.5 block rounded-xl bg-brand-orange py-1.5 text-center text-xs font-bold text-ink"
            >
              Ouvrir Séjour
            </Link>
          </div>
        </aside>
      </div>

      {/* ===================== FLUX OPÉRATIONNELS RAPIDES — mobile uniquement (maquette Stitch) ===================== */}
      <div className="mt-5 md:hidden">
        <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-fg/40">Flux opérationnels rapides</p>
        <div className="mt-2 grid grid-cols-2 gap-2.5">
          <Link href="/sejour" className="rounded-xl border border-border/10 bg-surface-raised p-3.5">
            <span className="text-lg">🔑</span>
            <p className="mt-1.5 text-sm font-bold text-fg">Gérer Séjour</p>
            <p className="text-[11px] text-fg/50">Check-in / Check-out</p>
          </Link>
          <Link href="/depenses/new" className="rounded-xl border border-border/10 bg-surface-raised p-3.5">
            <span className="text-lg">💸</span>
            <p className="mt-1.5 text-sm font-bold text-fg">Saisir Dépense</p>
            <p className="text-[11px] text-fg/50">Factures &amp; Achats</p>
          </Link>
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
