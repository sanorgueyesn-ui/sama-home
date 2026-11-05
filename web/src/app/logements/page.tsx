import { EmptyPanel, ListCard, PageHeader, PageShell } from "@/components/ui/page-kit";
import { CleaningControls } from "./cleaning-controls";
import { supportsHousekeeping } from "@/lib/housekeeping";
import { getActiveSpace } from "@/lib/active-mode";
import { pageVocabulary } from "@/lib/page-vocabulary";
import { PropertyFilters } from "./filters";
import { StatusBadge } from "./status-badge";
import { PropertyPhoto } from "./property-photo";
import { listProperties } from "@/lib/properties-data";
import { getPropertyStatuses } from "@/lib/property-status";
import { T } from "@/components/i18n/i18n-provider";

export default async function PropertiesPage(props: PageProps<"/logements">) {
  const { q, type, deleted } = await props.searchParams;
  const query = typeof q === "string" ? q : undefined;
  const typeFilter = type === "ROOM" || type === "APARTMENT" ? type : undefined;

  const { items, truncated } = await listProperties(query, typeFilter);
  // One query for the whole page instead of one per card (Phase 7).
  const statuses = await getPropertyStatuses(items);
  const space = await getActiveSpace();
  const vocab = pageVocabulary(space.mode);

  const title = space.mode === "HOTEL" ? "Chambres et appartements" : "Logements";
  return (
    <PageShell>
      <PageHeader
        eyebrow={space.name}
        title={title}
        subtitle={`${items.length}${truncated ? "+" : ""} ${vocab.unitsSingular}${items.length > 1 ? "s" : ""}`}
        actions={[
          { href: "/logements/new", label: space.mode === "HOTEL" ? "+ Ajouter une chambre" : "+ Ajouter un logement" },
          ...(supportsHousekeeping(space.mode) ? [{ href: "/menage", label: space.mode === "HOTEL" ? "Ménage des chambres" : "Ménage des logements" }] : []),
        ]}
      />

      {deleted ? (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-3 text-xs font-bold text-app-good">
          <span aria-hidden>✓</span>
          <span><T>Logement et ses données associées supprimés avec succès.</T></span>
        </div>
      ) : null}

      <PropertyFilters defaultQuery={query ?? ""} defaultType={typeFilter ?? ""} />

      {items.length === 0 ? (
        <EmptyPanel
          title={query || typeFilter ? "Aucun résultat" : `Aucun ${vocab.unitsSingular} pour le moment`}
          text={query || typeFilter ? "Aucun logement ne correspond à ces critères." : "Ajoutez votre première chambre ou votre premier appartement."}
          action={!query && !typeFilter ? { href: "/logements/new", label: "+ Ajouter un logement" } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((property) => (
            <div key={property.id} className="flex flex-col gap-2">
            <ListCard href={`/logements/${property.id}`}>
              <div className="flex gap-3">
                <PropertyPhoto photo={property.photo} type={property.type} className="h-16 w-16 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-extrabold text-app-text">{property.name}</p>
                    <StatusBadge status={statuses.get(property.id) ?? "UNAVAILABLE"} />
                  </div>
                  <p className="mt-0.5 text-xs font-medium text-app-muted">
                    {property.type === "ROOM" ? <T>{"Chambre meublée"}</T> : <T>{"Appartement meublé"}</T>} · {property.capacity} personne{property.capacity > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </ListCard>
            {/* Hôtel et résidence : état du ménage et gestes rapides (à nettoyer, en cours, prête), sans quitter la liste. */}
            {supportsHousekeeping(space.mode) && property.active ? (
              <div className="px-1">
                <CleaningControls propertyId={property.id} status={property.cleaningStatus} />
              </div>
            ) : null}
            </div>
          ))}
          {truncated && <p className="col-span-full pt-1 text-center text-xs font-medium text-app-faint"><T>Affinez votre recherche pour voir plus de résultats.</T></p>}
        </div>
      )}
    </PageShell>
  );
}
