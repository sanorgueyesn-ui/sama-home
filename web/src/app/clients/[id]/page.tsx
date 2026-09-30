import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getClientById } from "@/lib/clients-data";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[#E7EAEE] py-3 last:border-0">
      <p className="text-[11px] font-bold text-navy/50">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-navy">{value}</p>
    </div>
  );
}

export default async function ClientDetailPage(props: PageProps<"/clients/[id]">) {
  const { id } = await props.params;
  const { created, updated } = await props.searchParams;

  const client = await getClientById(id);
  if (!client) {
    notFound();
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-6 pb-10">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/clients"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-navy"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="flex-1 truncate text-xl font-extrabold text-navy">{client.name}</h1>
      </div>

      {created ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Client créé avec succès.
        </p>
      ) : null}
      {updated ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Modifications enregistrées.
        </p>
      ) : null}

      <Card className="px-4">
        <Row label="TÉLÉPHONE" value={client.phone} />
        <Row label="EMAIL" value={client.email ?? "—"} />
        <Row label="ADRESSE" value={client.address ?? "—"} />
        <Row
          label="PIÈCE D'IDENTITÉ"
          value={
            client.idDocumentType || client.idDocumentNumber
              ? [client.idDocumentType, client.idDocumentNumber].filter(Boolean).join(" · ")
              : "—"
          }
        />
        <Row label="NOTES" value={client.notes ?? "—"} />
        <Row
          label="CLIENT DEPUIS"
          value={new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(client.createdAt)}
        />
      </Card>

      <Link
        href={`/clients/${client.id}/edit`}
        className="mt-5 flex h-14 items-center justify-center rounded-2xl border border-navy/15 text-sm font-extrabold text-navy"
      >
        Modifier
      </Link>
    </div>
  );
}
