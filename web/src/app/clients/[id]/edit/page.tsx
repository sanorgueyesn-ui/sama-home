import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientForm } from "@/app/clients/client-form";
import { getClientById } from "@/lib/clients-data";
import { updateClient } from "@/app/actions/clients";

export default async function EditClientPage(props: PageProps<"/clients/[id]/edit">) {
  const { id } = await props.params;
  const client = await getClientById(id);
  if (!client) {
    notFound();
  }

  const action = updateClient.bind(null, client.id);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-6 pb-10">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href={`/clients/${client.id}`}
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-navy"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="truncate text-xl font-extrabold text-navy">Modifier {client.name}</h1>
      </div>

      <ClientForm
        action={action}
        submitLabel="ENREGISTRER LES MODIFICATIONS"
        defaultValues={{
          name: client.name,
          phone: client.phone,
          email: client.email ?? undefined,
          address: client.address ?? undefined,
          idDocumentType: client.idDocumentType ?? undefined,
          idDocumentNumber: client.idDocumentNumber ?? undefined,
          notes: client.notes ?? undefined,
        }}
      />
    </div>
  );
}
