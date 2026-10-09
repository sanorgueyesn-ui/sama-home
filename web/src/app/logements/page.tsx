import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PropertyFilters } from "./filters";
import { StatusBadge } from "./status-badge";
import { PropertyPhoto } from "./property-photo";
import { listProperties } from "@/lib/properties-data";
import { getPropertyStatuses } from "@/lib/property-status";

export default async function PropertiesPage(props: PageProps<"/logements">) {
  const { q, type } = await props.searchParams;
  const query = typeof q === "string" ? q : undefined;
  const typeFilter = type === "ROOM" || type === "APARTMENT" ? type : undefined;

  const { items, truncated } = await listProperties(query, typeFilter);
  // One query for the whole page instead of one per card (Phase 7).
  const statuses = await getPropertyStatuses(items);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pt-6 pb-10 md:max-w-none md:px-8 lg:px-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-fg">Logements</h1>
        <Link
          href="/logements/new"
          className="flex h-10 items-center rounded-xl bg-navy px-4 text-sm font-bold text-white"
        >
          + Ajouter
        </Link>
      </div>

      <PropertyFilters defaultQuery={query ?? ""} defaultType={typeFilter ?? ""} />

      {items.length === 0 ? (
        <EmptyState
          icon={
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="8" width="16" height="13" rx="1" />
              <path d="M9 4h6v4H9z" />
              <path d="M9 21v-5h6v5" />
            </svg>
          }
          title={query || typeFilter ? "Aucun résultat" : "Aucun logement pour le moment"}
          description={
            query || typeFilter
              ? "Aucun logement ne correspond à ces critères."
              : "Ajoutez votre première chambre ou votre premier appartement."
          }
          action={
            !query && !typeFilter ? (
              <Link
                href="/logements/new"
                className="flex h-11 items-center rounded-xl bg-navy px-5 text-sm font-bold text-white"
              >
                + Ajouter un logement
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((property) => (
            <Link key={property.id} href={`/logements/${property.id}`}>
              <Card className="flex gap-3 p-3.5">
                <PropertyPhoto
                  photo={property.photo}
                  type={property.type}
                  className="h-16 w-16 shrink-0 rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-extrabold text-fg">{property.name}</p>
                    <StatusBadge status={statuses.get(property.id) ?? "UNAVAILABLE"} />
                  </div>
                  <p className="mt-0.5 text-xs font-medium text-fg/60">
                    {property.type === "ROOM" ? "Chambre meublée" : "Appartement meublé"} ·{" "}
                    {property.capacity} personne{property.capacity > 1 ? "s" : ""}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
          {truncated && (
            <p className="col-span-full pt-1 text-center text-xs font-medium text-fg/50">
              Affinez votre recherche pour voir plus de résultats.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
