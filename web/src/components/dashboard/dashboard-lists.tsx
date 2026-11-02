import Link from "next/link";
import { formatElapsed, formatFcfa } from "@/lib/dashboard-metrics";
import type { DashboardArrival, DashboardStay, DashboardUnit } from "@/lib/dashboard-overview";
import { shortDateTime, timeLabel } from "@/components/dashboard/dashboard-ui";
import { T } from "@/components/i18n/i18n-provider";

// Classe écrite en toutes lettres : Tailwind ne détecte pas une classe construite à l'exécution.
const MOBILE_LIMIT_3 = "max-lg:[&>li:nth-child(n+4)]:hidden";

const ROW = "flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-app-hover focus-visible:outline-2 focus-visible:outline-app-focus";

/** Séjours en cours : unité, client, départ prévu et, s'il y en a un, le reste à payer. */
export function StayList({
  stays,
  showClient = true,
  endLabel = "Départ",
  mobileLimit,
}: {
  stays: DashboardStay[];
  showClient?: boolean;
  endLabel?: string;
  /** Sur téléphone, n'affiche que les 3 premières lignes (la liste complète est sur la page dédiée). */
  mobileLimit?: 3;
}) {
  const limitClass = mobileLimit === 3 ? MOBILE_LIMIT_3 : "";
  return (
    <ul className={`-mx-3 divide-y divide-app-line-soft ${limitClass}`}>
      {stays.map((stay) => (
        <li key={stay.id}>
          <Link href={`/locations/${stay.id}`} className={ROW}>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-app-text">{stay.propertyName}</span>
              {showClient && stay.clientName ? (
                <span className="block truncate text-xs text-app-muted">{stay.clientName}</span>
              ) : null}
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-xs text-app-muted"><T>{endLabel}</T> {shortDateTime(stay.plannedDepartureAt)}</span>
              {stay.remaining > 0 ? (
                <span className="block text-xs font-bold tabular-nums text-app-warn"><T>Reste</T> {formatFcfa(stay.remaining)} FCFA</span>
              ) : (
                <span className="block text-xs font-semibold text-app-good"><T>Soldé</T></span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Soldes à recouvrer : les plus gros restants dus, du plus élevé au plus faible. */
export function ReceivableList({ stays }: { stays: DashboardStay[] }) {
  return (
    <ul className="-mx-3 divide-y divide-app-line-soft">
      {stays.map((stay) => (
        <li key={stay.id}>
          <Link href={`/locations/${stay.id}`} className={ROW}>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-app-text">{stay.clientName ?? stay.propertyName}</span>
              <span className="block truncate text-xs text-app-muted">{stay.propertyName}</span>
            </span>
            <span className="shrink-0 text-right text-sm font-extrabold tabular-nums text-app-warn">
              {formatFcfa(stay.remaining)} <span className="text-[10px] font-bold text-app-muted">FCFA</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const ARRIVAL_STATUS: Record<string, string> = {
  CONFIRMED: "Attendue",
  ARRIVED: "Arrivée",
  COMPLETED: "Terminée",
};

export function ArrivalList({ arrivals }: { arrivals: DashboardArrival[] }) {
  return (
    <ul className="-mx-3 divide-y divide-app-line-soft">
      {arrivals.map((arrival) => (
        <li key={arrival.id}>
          <Link href={`/reservations/${arrival.id}`} className={ROW}>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-app-text">{arrival.propertyName}</span>
              {arrival.clientName ? <span className="block truncate text-xs text-app-muted">{arrival.clientName}</span> : null}
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-sm font-bold tabular-nums text-app-text">{timeLabel(arrival.arrivalTime)}</span>
              <span className="block text-xs text-app-muted">{ARRIVAL_STATUS[arrival.status] ?? arrival.status}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Dernières occupations (guide Hôtel §4.3) : uniquement des informations opérationnelles, SANS le
 * nom du client : unité, début, durée écoulée, statut.
 */
export function RecentOccupiedTable({ stays, now, noun }: { stays: DashboardStay[]; now: Date; noun: string }) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[22rem] text-left text-sm">
        <caption className="sr-only"><T>Dernières occupations :</T> <T>{noun}</T></caption>
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-app-faint">
            <th scope="col" className="px-1 pb-2 font-bold"><T>N°</T></th>
            <th scope="col" className="px-1 pb-2 font-bold"><T>Depuis le</T></th>
            <th scope="col" className="px-1 pb-2 font-bold"><T>Durée</T></th>
            <th scope="col" className="px-1 pb-2 text-right font-bold"><T>Statut</T></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-app-line-soft">
          {stays.map((stay) => (
            <tr key={stay.id}>
              <td className="px-1 py-2.5 font-semibold text-app-text">
                <Link href={`/locations/${stay.id}`} className="hover:underline focus-visible:outline-2 focus-visible:outline-app-focus">
                  {stay.propertyName}
                </Link>
              </td>
              <td className="px-1 py-2.5 text-app-text-2">{shortDateTime(stay.arrivalAt)}</td>
              <td className="px-1 py-2.5 tabular-nums text-app-text-2">{formatElapsed(stay.arrivalAt, now)}</td>
              <td className="px-1 py-2.5 text-right">
                <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-bold text-app-bad"><T>Occupé</T></span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TILE_STATUS = {
  AVAILABLE: { label: "Disponible", tile: "border-success/30 bg-success/10", dot: "bg-success" },
  OCCUPIED: { label: "Occupé", tile: "border-danger/35 bg-danger/10", dot: "bg-danger" },
  RESERVED: { label: "Réservé", tile: "border-info/35 bg-info/10", dot: "bg-info" },
  UNAVAILABLE: { label: "Indisponible", tile: "border-neutral/30 bg-neutral/10", dot: "bg-neutral" },
} as const;

/** Rack : une tuile par unité, colorée par son statut calculé. */
export function UnitTiles({ units }: { units: DashboardUnit[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {units.map((unit) => {
        const meta = TILE_STATUS[unit.status];
        return (
          <li key={unit.id}>
            <Link
              href={`/logements/${unit.id}`}
              className={`block rounded-xl border px-3 py-2.5 transition-colors hover:brightness-125 focus-visible:outline-2 focus-visible:outline-app-focus ${meta.tile}`}
            >
              <span className="block truncate text-sm font-bold text-app-text">{unit.name}</span>
              <span className="mt-1 flex items-center gap-1.5 text-xs text-app-text-2">
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden />
                <T>{meta.label}</T>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
