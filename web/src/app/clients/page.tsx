import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 pt-6 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-navy">Clients</h1>
        <Link
          href="/clients/new"
          className="flex h-10 items-center rounded-xl bg-navy px-4 text-sm font-bold text-white"
        >
          + Ajouter
        </Link>
      </div>

      <div className="mt-4">
        <ClientSearchInput defaultValue={query ?? ""} />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="8" r="3.4" />
              <path d="M2.5 20c0-3.9 2.9-6 6.5-6s6.5 2.1 6.5 6" />
              <circle cx="17.5" cy="8.5" r="2.6" />
              <path d="M16 14.3c2.9.3 5 2.2 5 5.7" />
            </svg>
          }
          title={query ? "Aucun résultat" : "Aucun client pour le moment"}
          description={
            query
              ? `Aucun client ne correspond à « ${query} ».`
              : "Ajoutez votre premier client, ou il apparaîtra automatiquement lors d'une réservation."
          }
          action={
            !query ? (
              <Link
                href="/clients/new"
                className="flex h-11 items-center rounded-xl bg-navy px-5 text-sm font-bold text-white"
              >
                + Ajouter un client
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="mt-4 flex flex-col gap-2.5">
          {items.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <Card className="flex items-center gap-3 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy text-xs font-extrabold text-white">
                  {initials(client.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-navy">{client.name}</p>
                  <p className="text-xs font-medium text-navy/60">{client.phone}</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B7C0C8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </Card>
            </Link>
          ))}
          {truncated && (
            <p className="pt-1 text-center text-xs font-medium text-navy/50">
              Affinez votre recherche pour voir plus de résultats.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
