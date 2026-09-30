import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ReservationFilters } from "./filters";
import { ReservationStatusBadge } from "./status-badge";
import { listReservations, type ReservationTimeFilter } from "@/lib/reservations-data";
import { listAllPropertiesForSelect } from "@/lib/properties-data";

const TIME_VALUES: ReservationTimeFilter[] = ["today", "upcoming", "past", "cancelled", "all"];

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
  const timeFilter = TIME_VALUES.includes(time as ReservationTimeFilter)
    ? (time as ReservationTimeFilter)
    : "upcoming";
  const propertyFilter = typeof propertyId === "string" ? propertyId : undefined;

  const [{ items, truncated }, properties] = await Promise.all([
    listReservations({ timeFilter, propertyId: propertyFilter, query }),
    listAllPropertiesForSelect(),
  ]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 pt-6 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-navy">Réservations</h1>
        <Link
          href="/reservations/new"
          className="flex h-10 items-center rounded-xl bg-navy px-4 text-sm font-bold text-white"
        >
          + Nouvelle
        </Link>
      </div>

      <ReservationFilters
        defaultQuery={query ?? ""}
        defaultTime={timeFilter}
        defaultPropertyId={propertyFilter ?? ""}
        properties={properties}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3.5" y="5" width="17" height="16" rx="2" />
              <path d="M3.5 10h17M8 3v4M16 3v4" />
            </svg>
          }
          title="Aucune réservation ici"
          description="Il n'y a aucune réservation correspondant à ces critères pour le moment."
          action={
            <Link
              href="/reservations/new"
              className="flex h-11 items-center rounded-xl bg-navy px-5 text-sm font-bold text-white"
            >
              + Nouvelle réservation
            </Link>
          }
        />
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {items.map((r) => (
            <Link key={r.id} href={`/reservations/${r.id}`}>
              <Card className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-extrabold text-navy">{r.client.name}</p>
                    <p className="mt-0.5 text-xs font-semibold text-navy/60">{r.property.name}</p>
                  </div>
                  <ReservationStatusBadge status={r.status} />
                </div>
                <div className="mt-2.5 flex items-center gap-4 text-xs font-semibold text-navy">
                  <span>{fmtDate(r.date)}</span>
                  <span>
                    {fmtTime(r.arrivalTime)} → {fmtTime(r.departureTime)}
                  </span>
                </div>
                <div className="mt-2 text-sm font-extrabold text-navy">{fmtFcfa(r.amount)}</div>
              </Card>
            </Link>
          ))}
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
