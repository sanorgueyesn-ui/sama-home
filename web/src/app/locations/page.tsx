import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RentalFilters } from "./filters";
import { RentalStatusBadge } from "./status-badge";
import { RentalTimeIndicator } from "./time-indicator";
import { listRentals, type RentalTimeFilter } from "@/lib/rentals-data";
import { listAllPropertiesForSelect } from "@/lib/properties-data";
import { getRentalPaymentSummaries } from "@/lib/payment-summary";
import { prisma } from "@/lib/prisma";

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
  // Real Payment-based totals (never the raw, potentially-stale
  // `deposit` field — see the Phase 9 report for why this card was fixed).
  const paymentSummaries = await getRentalPaymentSummaries(prisma, items);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pt-6 pb-28 md:max-w-none md:px-8 md:pb-10 lg:px-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-fg">Locations</h1>
        <Link
          href="/locations/new"
          className="flex h-10 items-center rounded-xl bg-brand-orange px-4 text-sm font-bold text-ink"
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
              className="flex h-11 items-center rounded-xl bg-brand-orange px-5 text-sm font-bold text-ink"
            >
              + Nouvelle location
            </Link>
          }
        />
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((r) => {
            const summary = paymentSummaries.get(r.id);
            const remaining = summary?.remaining ?? r.amount;
            return (
              <Link key={r.id} href={`/locations/${r.id}`}>
                {/* Hiérarchie Lot 4 §6 : 1. logement 2. statut 3. temps
                    4. client 5. montant/restant. */}
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-extrabold text-fg">{r.property.name}</p>
                    <RentalStatusBadge status={r.status} />
                  </div>

                  {r.status === "ACTIVE" ? (
                    <div className="mt-2">
                      <RentalTimeIndicator now={now} plannedDepartureAt={r.plannedDepartureAt} />
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-4 text-xs font-semibold text-fg/60">
                      <span>Arrivée {fmtTime(r.arrivalAt)}</span>
                      <span>Départ {fmtTime(r.plannedDepartureAt)}</span>
                    </div>
                  )}

                  <p className="mt-2.5 truncate text-xs font-semibold text-fg/70">
                    {r.client.name} · {r.client.phone}
                  </p>

                  <div className="mt-2 flex items-center justify-between border-t border-border/10 pt-2 text-xs font-semibold text-fg/60">
                    <span>{fmtFcfa(r.amount)}</span>
                    <span className={remaining > 0 ? "font-bold text-warning" : "font-bold text-success"}>
                      {remaining > 0 ? `Reste ${fmtFcfa(remaining)}` : "Payé en totalité"}
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
          {truncated && (
            <p className="col-span-full pt-1 text-center text-xs font-medium text-fg/50">
              Affinez la recherche pour voir plus de résultats.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
