import { EmptyPanel, ListCard, PageHeader, PageShell } from "@/components/ui/page-kit";
import { getActiveSpace } from "@/lib/active-mode";
import { pageVocabulary } from "@/lib/page-vocabulary";
import { ClientSearchInput } from "./search-input";
import { listClients } from "@/lib/clients-data";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function ClientsPage(props: PageProps<"/clients">) {
  const { q } = await props.searchParams;
  const query = typeof q === "string" ? q : undefined;
  const { items, truncated } = await listClients(query);
  const space = await getActiveSpace();
  const vocab = pageVocabulary(space.mode);

  return (
    <PageShell>
      <PageHeader
        eyebrow={space.name}
        title={vocab.guestsTitle}
        subtitle={`${items.length}${truncated ? "+" : ""} ${items.length > 1 ? vocab.guests : vocab.guest}`}
        actions={[{ href: "/clients/new", label: `+ Ajouter un ${vocab.guest}` }]}
      />

      <ClientSearchInput defaultValue={query ?? ""} />

      {items.length === 0 ? (
        <EmptyPanel
          title={query ? "Aucun résultat" : `Aucun ${vocab.guest} pour le moment`}
          text={query ? `Aucun ${vocab.guest} ne correspond à « ${query} ».` : `Ajoutez votre premier ${vocab.guest}, ou il apparaîtra automatiquement lors d'une réservation.`}
          action={!query ? { href: "/clients/new", label: `+ Ajouter un ${vocab.guest}` } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((client) => (
            <ListCard key={client.id} href={`/clients/${client.id}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-orange/15 text-xs font-extrabold text-brand-orange">
                  {initials(client.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-app-text">{client.name}</p>
                  <p className="text-xs font-medium tabular-nums text-app-muted">{client.phone}</p>
                </div>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-app-faint">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </div>
            </ListCard>
          ))}
          {truncated && <p className="col-span-full pt-1 text-center text-xs font-medium text-app-faint">Affinez votre recherche pour voir plus de résultats.</p>}
        </div>
      )}
    </PageShell>
  );
}
