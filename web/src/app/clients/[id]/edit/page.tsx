import { PageHeader } from "@/components/ui/page-kit";
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
      <div className="mb-5">
        <PageHeader back={{ href: `/clients/${client.id}`, label: "Retour" }} title={`Modifier ${client.name}`} />
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
