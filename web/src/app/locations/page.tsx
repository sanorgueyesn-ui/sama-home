import { EmptyPanel, ListCard, PageHeader, PageShell } from "@/components/ui/page-kit";
import { getActiveSpace } from "@/lib/active-mode";
import { pageVocabulary } from "@/lib/page-vocabulary";
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
  const space = await getActiveSpace();
  const vocab = pageVocabulary(space.mode);
  const [{ items, truncated }, properties] = await Promise.all([
    listRentals({ timeFilter, propertyId: propertyFilter, query }),
    listAllPropertiesForSelect(),
  ]);
  // Real Payment-based totals (never the raw, potentially-stale
  // `deposit` field — see the Phase 9 report for why this card was fixed).
  const paymentSummaries = await getRentalPaymentSummaries(prisma, items);

  return (
    <PageShell>
      <PageHeader
        eyebrow={space.name}
        title={vocab.stays}
        subtitle={`${items.length}${truncated ? "+" : ""} ${items.length > 1 ? "résultats" : "résultat"} · ${
          timeFilter === "active" ? "en cours" : timeFilter === "completed" ? "terminés" : timeFilter === "cancelled" ? "annulés" : "tous statuts"
        }`}
        actions={[{ href: "/locations/new", label: `+ ${vocab.newStay}` }]}
      />

      <RentalFilters
        defaultQuery={query ?? ""}
        defaultTime={timeFilter}
        defaultPropertyId={propertyFilter ?? ""}
        properties={properties}
        allUnitsLabel={vocab.allUnits}
      />

      {items.length === 0 ? (
        <EmptyPanel
          title={timeFilter === "active" ? `Aucun ${vocab.staysSingular} en cours` : `Aucun ${vocab.staysSingular} ici`}
          text={timeFilter === "active" ? vocab.staysEmpty : "Aucun résultat ne correspond à ces critères."}
          action={{ href: "/locations/new", label: `+ ${vocab.newStay}` }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((r) => {
            const summary = paymentSummaries.get(r.id);
            const remaining = summary?.remaining ?? r.amount;
            return (
              <ListCard key={r.id} href={`/locations/${r.id}`}>
                {/* Hiérarchie : 1. unité 2. statut 3. temps 4. client 5. montant / reste. */}
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-extrabold text-app-text">{r.property.name}</p>
                  <RentalStatusBadge status={r.status} />
                </div>

                {r.status === "ACTIVE" ? (
                  <div className="mt-2.5">
                    <RentalTimeIndicator now={now} plannedDepartureAt={r.plannedDepartureAt} />
                  </div>
                ) : (
                  <div className="mt-2.5 flex items-center gap-4 text-xs font-semibold text-app-muted">
                    <span>
                      {vocab.arrival} {fmtTime(r.arrivalAt)}
                    </span>
                    <span>
                      {vocab.departure} {fmtTime(r.plannedDepartureAt)}
                    </span>
                  </div>
                )}

                <p className="mt-2.5 truncate text-xs font-semibold text-app-text-2">
                  {r.client.name} · {r.client.phone}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-app-line pt-2.5 text-xs font-semibold text-app-muted">
                  <span className="tabular-nums">{fmtFcfa(r.amount)}</span>
                  <span className={`font-bold tabular-nums ${remaining > 0 ? "text-app-warn" : "text-app-good"}`}>
                    {remaining > 0 ? `Reste ${fmtFcfa(remaining)}` : "Payé en totalité"}
                  </span>
                </div>
              </ListCard>
            );
          })}
          {truncated && <p className="col-span-full pt-1 text-center text-xs font-medium text-app-faint">Affinez la recherche pour voir plus de résultats.</p>}
        </div>
      )}
    </PageShell>
  );
}
