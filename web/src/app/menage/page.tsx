import { redirect } from "next/navigation";
import { setCleaningStatus } from "@/app/actions/housekeeping";
import { Badge, EmptyPanel, PageHeader, PageShell, StatTile } from "@/components/ui/page-kit";
import { getActiveSpace } from "@/lib/active-mode";
import { getCurrentUser } from "@/lib/dal";
import { CLEANING_LABELS, cleaningActions, compareForHousekeeping, readiness, supportsHousekeeping, type CleaningStatusValue } from "@/lib/housekeeping";
import { prisma } from "@/lib/prisma";
import { getPropertyStatuses } from "@/lib/property-status";
import { T } from "@/components/i18n/i18n-provider";

export const metadata = { title: "Ménage — SAMA HOME" };
export const dynamic = "force-dynamic";

const OCCUPANCY_LABEL = { AVAILABLE: "Libre", OCCUPIED: "Occupée", RESERVED: "Réservée", UNAVAILABLE: "Indisponible" } as const;

const CLEANING_TONE: Record<CleaningStatusValue, "bad" | "warn" | "good"> = { DIRTY: "bad", IN_PROGRESS: "warn", CLEAN: "good" };

function sinceLabel(date: Date | null, now: Date) {
  if (!date) return null;
  const minutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000));
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `depuis ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `depuis ${hours} h`;
  return `depuis ${Math.floor(hours / 24)} j`;
}

export default async function HousekeepingPage() {
  const space = await getActiveSpace();
  // Le ménage concerne les hôtels et les résidences ; une agence n'a ni la page ni le lien.
  if (!supportsHousekeeping(space.mode)) redirect("/dashboard");
  const user = await getCurrentUser();
  if (!user.establishmentId) redirect("/dashboard");

  const properties = await prisma.property.findMany({
    where: { establishmentId: user.establishmentId, active: true },
    select: { id: true, name: true, type: true, cleaningStatus: true, cleaningUpdatedAt: true },
  });
  const statuses = await getPropertyStatuses(properties.map((p) => ({ id: p.id, active: true })));
  const now = new Date();
  const rows = properties
    .map((p) => ({ ...p, cleaning: p.cleaningStatus, occupancy: statuses.get(p.id) ?? "UNAVAILABLE" }))
    .sort(compareForHousekeeping);

  const toClean = rows.filter((r) => r.cleaning === "DIRTY").length;
  const inProgress = rows.filter((r) => r.cleaning === "IN_PROGRESS").length;
  const ready = rows.filter((r) => readiness(r.cleaning, r.occupancy) === "READY").length;

  return (
    <PageShell>
      <PageHeader eyebrow={space.name} title="Ménage" subtitle={space.mode === "HOTEL" ? "Quelles chambres sont prêtes à recevoir un client" : "Quels logements sont prêts à accueillir un locataire"} />

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <StatTile label="À nettoyer" value={String(toClean)} tone={toClean > 0 ? "bad" : "default"} sub="chambres" />
        <StatTile label="En cours" value={String(inProgress)} tone={inProgress > 0 ? "warn" : "default"} sub="chambres" />
        <StatTile label="Prêtes" value={String(ready)} tone="good" sub="libres et propres" />
      </div>

      {rows.length === 0 ? (
        <EmptyPanel title="Aucune chambre" text="Ajoutez vos chambres et appartements pour suivre leur ménage." action={{ href: "/logements/new", label: "+ Ajouter une chambre" }} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const since = sinceLabel(row.cleaningUpdatedAt, now);
            return (
              <li key={row.id} className="rounded-2xl border border-app-line bg-app-panel p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-app-text">{row.name}</p>
                    <p className="mt-0.5 text-xs text-app-muted">
                      {row.type === "ROOM" ? <T>{"Chambre"}</T> : <T>{"Appartement"}</T>} · <T>{OCCUPANCY_LABEL[row.occupancy]}</T>
                    </p>
                  </div>
                  <Badge tone={CLEANING_TONE[row.cleaning]}><T>{CLEANING_LABELS[row.cleaning]}</T></Badge>
                </div>
                {since ? <p className="mt-2 text-[11px] text-app-faint">{since}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {cleaningActions(row.cleaning).map((action, index) => (
                    <form key={action.to} action={setCleaningStatus.bind(null, row.id, action.to)}>
                      <button
                        type="submit"
                        className={`inline-flex h-10 items-center rounded-lg px-4 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus ${
                          index === 0 ? "bg-brand-orange text-ink hover:brightness-110" : "border border-app-line-strong bg-app-panel text-app-text-2 hover:bg-app-hover"
                        }`}
                      >
                        <T>{action.label}</T>
                      </button>
                    </form>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
