import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RentalFilters } from "./filters";
import { RentalStatusBadge } from "./status-badge";
import { RentalTimeIndicator } from "./time-indicator";
import { listRentals, type RentalTimeFilter } from "@/lib/rentals-data";
import { listAllPropertiesForSelect } from "@/lib/properties-data";

const TIME_VALUES: RentalTimeFilter[] = ["active", "completed", "cancelled", "all"];

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}
function fmtTime(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(d);
}

export default async function LocationsPage(props: PageProps<"/locations">) {
  const { q, time, propertyId } = await props.searchParams;
  const query = typeof q === "string" ? q : undefined;
  const timeFilter = TIME_VALUES.includes(time as RentalTimeFilter) ? (time as RentalTimeFilter) : "active";
  const propertyFilter = typeof propertyId === "string" ? propertyId : undefined;

  const now = new Date();
  const [{ items, truncated }, properties] = await Promise.all([
    listRentals({ timeFilter, propertyId: propertyFilter, query }),
    listAllPropertiesForSelect(),
  ]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 pt-6 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-navy">Locations</h1>
        <Link
          href="/locations/new"
          className="flex h-10 items-center rounded-xl bg-navy px-4 text-sm font-bold text-white"
        >
          + Nouvelle
        </Link>
      </div>

      <RentalFilters
        defaultQuery={query ?? ""}
        defaultTime={timeFilter}
        defaultPropertyId={propertyFilter ?? ""}
        properties={properties}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5V12l3.2 2" />
            </svg>
          }
          title={timeFilter === "active" ? "Aucune location en cours." : "Aucune location ici"}
          description={
            timeFilter === "active"
              ? "Faites entrer un client depuis une réservation, ou créez une nouvelle location directe."
              : "Aucune location ne correspond à ces critères."
          }
          action={
            <Link
              href="/locations/new"
              className="flex h-11 items-center rounded-xl bg-navy px-5 text-sm font-bold text-white"
            >
              + Nouvelle location
            </Link>
          }
        />
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {items.map((r) => {
            const reste = Math.max(r.amount - r.deposit, 0);
            return (
              <Link key={r.id} href={`/locations/${r.id}`}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-extrabold text-navy">{r.client.name}</p>
                      <p className="mt-0.5 text-xs font-semibold text-navy/60">
                        {r.property.name} · {r.client.phone}
                      </p>
                    </div>
                    <RentalStatusBadge status={r.status} />
                  </div>
                  <div className="mt-2.5 flex items-center gap-4 text-xs font-semibold text-navy">
                    <span>Arrivée {fmtTime(r.arrivalAt)}</span>
                    <span>Départ prévu {fmtTime(r.plannedDepartureAt)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-xs font-semibold text-navy/60">
                      {fmtFcfa(r.amount)} · Acompte {fmtFcfa(r.deposit)} · Reste {fmtFcfa(reste)}
                    </div>
                  </div>
                  {r.status === "ACTIVE" ? (
                    <div className="mt-2.5">
                      <RentalTimeIndicator now={now} plannedDepartureAt={r.plannedDepartureAt} />
                    </div>
                  ) : null}
                </Card>
              </Link>
            );
          })}
          {truncated && (
            <p className="pt-1 text-center text-xs font-medium text-navy/50">
              Affinez la recherche pour voir plus de résultats.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
