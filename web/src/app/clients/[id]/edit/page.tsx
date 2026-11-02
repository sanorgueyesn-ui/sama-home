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
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-7">
      <div className="mb-5 flex items-center gap-3 lg:mx-auto lg:w-full lg:max-w-2xl">
        <Link
          href={`/clients/${client.id}`}
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-fg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="truncate text-xl font-extrabold text-fg">Modifier {client.name}</h1>
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
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
    </div>
  );
}
