import { Badge, EmptyPanel, ListCard, PageHeader, PageShell } from "@/components/ui/page-kit";
import { getActiveSpace } from "@/lib/active-mode";
import { pageVocabulary } from "@/lib/page-vocabulary";
import { ReservationFilters } from "./filters";
import { ReservationStatusBadge } from "./status-badge";
import { listReservations } from "@/lib/reservations-data";
import { RESERVATION_TIME_FILTERS, isArrivalOverdue, type ReservationTimeFilter } from "@/lib/reservation-filters";
import { listAllPropertiesForSelect } from "@/lib/properties-data";


function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(d);
}

function fmtTime(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(d);
}

export default async function ReservationsPage(props: PageProps<"/reservations">) {
  const { q, time, propertyId } = await props.searchParams;
  const query = typeof q === "string" ? q : undefined;
  const timeFilter = RESERVATION_TIME_FILTERS.includes(time as ReservationTimeFilter)
    ? (time as ReservationTimeFilter)
    : "upcoming";
  const propertyFilter = typeof propertyId === "string" ? propertyId : undefined;

  const now = new Date();
  const space = await getActiveSpace();
  const vocab = pageVocabulary(space.mode);

  const [{ items, truncated }, properties] = await Promise.all([
    listReservations({ timeFilter, propertyId: propertyFilter, query }),
    listAllPropertiesForSelect(),
  ]);

  return (
    <PageShell>
      <PageHeader
        eyebrow={space.name}
        title="Réservations"
        subtitle={`${items.length}${truncated ? "+" : ""} ${items.length > 1 ? "réservations" : "réservation"}`}
        actions={[{ href: "/reservations/new", label: "+ Nouvelle réservation" }]}
      />

      <ReservationFilters
        defaultQuery={query ?? ""}
        defaultTime={timeFilter}
        defaultPropertyId={propertyFilter ?? ""}
        properties={properties}
      />

      {items.length === 0 ? (
        <EmptyPanel
          title="Aucune réservation ici"
          text={timeFilter === "upcoming" || timeFilter === "all" ? vocab.reservationsEmpty : "Aucune réservation ne correspond à ces critères."}
          action={{ href: "/reservations/new", label: "+ Nouvelle réservation" }}
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((r) => (
            <ListCard key={r.id} href={`/reservations/${r.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-app-text">{r.client?.name ?? "Sans client"}</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-app-muted">{r.property.name}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <ReservationStatusBadge status={r.status} />
                  {isArrivalOverdue(r.status, r.arrivalTime, now) ? <Badge tone="bad">Arrivée à enregistrer</Badge> : null}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-app-text-2">
                <span>{fmtDate(r.date)}</span>
                <span className="tabular-nums">
                  {fmtTime(r.arrivalTime)} → {fmtTime(r.departureTime)}
                </span>
              </div>
              <div className="mt-3 border-t border-app-line pt-2.5 text-sm font-extrabold tabular-nums text-app-text">{fmtFcfa(r.amount)}</div>
            </ListCard>
          ))}
          {truncated && <p className="col-span-full pt-1 text-center text-xs font-medium text-app-faint">Affinez la recherche pour voir plus de résultats.</p>}
        </div>
      )}
    </PageShell>
  );
}
