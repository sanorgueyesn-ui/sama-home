import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader, PageShell, StatTile, SECONDARY_BUTTON } from "@/components/ui/page-kit";
import { getActiveSpace } from "@/lib/active-mode";
import { getCurrentUser } from "@/lib/dal";
import { buildPlanningGrid, occupiedShare, planningDays, startOfUtcDay, type PlanningBooking } from "@/lib/planning";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Planning — SAMA HOME" };
export const dynamic = "force-dynamic";

const DAYS = 14;
const DAY_MS = 86_400_000;

/** `?debut=AAAA-MM-JJ` : date valide ou, à défaut, aujourd'hui. Une valeur forgée n'a aucun effet. */
function parseStart(raw: string | undefined, now: Date): Date {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = new Date(`${raw}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(raw)) return parsed;
  }
  return startOfUtcDay(now);
}

const iso = (date: Date) => date.toISOString().slice(0, 10);
const dayLabel = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" });
const dayNumber = new Intl.DateTimeFormat("fr-FR", { day: "numeric", timeZone: "UTC" });
const rangeLabel = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });

export default async function PlanningPage(props: { searchParams: Promise<{ debut?: string }> }) {
  const space = await getActiveSpace();
  if (space.mode !== "HOTEL") redirect("/dashboard");
  const user = await getCurrentUser();
  if (!user.establishmentId) redirect("/dashboard");
  const establishmentId = user.establishmentId;

  const now = new Date();
  const search = await props.searchParams;
  const start = parseStart(search.debut, now);
  const days = planningDays(start, DAYS);
  const end = new Date(start.getTime() + DAYS * DAY_MS);

  const [properties, rentals, reservations] = await Promise.all([
    prisma.property.findMany({ where: { establishmentId, active: true }, select: { id: true, name: true, type: true } }),
    prisma.rental.findMany({
      // Un séjour en cours reste dans la grille tant qu'il n'est pas terminé, même au-delà du départ prévu.
      where: { establishmentId, status: "ACTIVE", arrivalAt: { lt: end } },
      select: { id: true, propertyId: true, arrivalAt: true, plannedDepartureAt: true },
    }),
    prisma.reservation.findMany({
      where: { establishmentId, status: "CONFIRMED", arrivalTime: { lt: end }, departureTime: { gt: start } },
      select: { id: true, propertyId: true, arrivalTime: true, departureTime: true },
    }),
  ]);
  properties.sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }));

  const bookings: PlanningBooking[] = [
    ...rentals.map((r) => ({ id: r.id, kind: "STAY" as const, propertyId: r.propertyId, start: r.arrivalAt, end: r.plannedDepartureAt.getTime() > now.getTime() ? r.plannedDepartureAt : now })),
    ...reservations.map((r) => ({ id: r.id, kind: "RESERVATION" as const, propertyId: r.propertyId, start: r.arrivalTime, end: r.departureTime })),
  ];
  const grid = buildPlanningGrid(properties.map((p) => p.id), bookings, days);
  const share = occupiedShare(grid);
  const todayIso = iso(startOfUtcDay(now));
  const prev = iso(new Date(start.getTime() - 7 * DAY_MS));
  const next = iso(new Date(start.getTime() + 7 * DAY_MS));

  return (
    <PageShell>
      <PageHeader eyebrow={space.name} title="Planning" subtitle={`Du ${rangeLabel.format(days[0])} au ${rangeLabel.format(days[DAYS - 1])}`} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Période" className="flex gap-2">
          <Link href={`/planning?debut=${prev}`} className={SECONDARY_BUTTON} aria-label="Semaine précédente">
            ← Semaine
          </Link>
          <Link href="/planning" className={SECONDARY_BUTTON}>
            Aujourd&apos;hui
          </Link>
          <Link href={`/planning?debut=${next}`} className={SECONDARY_BUTTON} aria-label="Semaine suivante">
            Semaine →
          </Link>
        </nav>
        <ul className="flex items-center gap-4 text-xs font-semibold text-app-muted" aria-label="Légende">
          <li className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-danger" aria-hidden /> Séjour en cours
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-info" aria-hidden /> Réservée
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-app-line-strong" aria-hidden /> Libre
          </li>
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:max-w-md sm:gap-3">
        <StatTile label="Occupation" value={`${share} %`} sub={`sur ${DAYS} jours`} />
        <StatTile label="Chambres" value={String(properties.length)} sub="actives" />
      </div>

      {properties.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-app-line-strong px-6 py-12 text-center text-sm text-app-muted">Aucune chambre à afficher.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-app-line bg-app-panel">
          <table className="w-max min-w-full border-collapse text-xs">
            <caption className="sr-only">Occupation des chambres sur {DAYS} jours</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-10 min-w-[7.5rem] border-b border-app-line bg-app-panel px-3 py-2 text-left font-bold text-app-muted">
                  Chambre
                </th>
                {days.map((day) => {
                  const isToday = iso(day) === todayIso;
                  return (
                    <th key={day.toISOString()} scope="col" className={`w-10 border-b border-app-line px-0.5 py-1.5 text-center font-semibold ${isToday ? "text-brand-orange" : "text-app-muted"}`}>
                      <span className="block text-[10px] capitalize">{dayLabel.format(day).replace(".", "")}</span>
                      <span className={`block text-sm font-extrabold ${isToday ? "text-brand-orange" : "text-app-text"}`}>{dayNumber.format(day)}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => {
                const cells = grid.get(property.id) ?? [];
                return (
                  <tr key={property.id}>
                    <th scope="row" className="sticky left-0 z-10 max-w-[10rem] truncate border-t border-app-line bg-app-panel px-3 py-2 text-left text-xs font-bold text-app-text">
                      {property.name}
                    </th>
                    {cells.map((cell, index) => {
                      const key = `${property.id}-${index}`;
                      if (cell.state === "FREE") return <td key={key} className="h-9 border-l border-t border-app-line" />;
                      const href = cell.kind === "STAY" ? `/locations/${cell.bookingId}` : `/reservations/${cell.bookingId}`;
                      const label = `${property.name}, ${dayNumber.format(days[index])} : ${cell.state === "STAY" ? "séjour en cours" : "réservée"}`;
                      return (
                        <td key={key} className="h-9 border-l border-t border-app-line p-0.5">
                          <Link href={href} aria-label={label} title={label} className={`block h-full min-h-8 rounded ${cell.state === "STAY" ? "bg-danger" : "bg-info"} focus-visible:outline-2 focus-visible:outline-app-focus`} />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
