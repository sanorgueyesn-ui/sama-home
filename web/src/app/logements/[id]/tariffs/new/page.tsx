import { PageHeader } from "@/components/ui/page-kit";
import { notFound, redirect } from "next/navigation";
import { TariffForm } from "@/app/logements/[id]/tariffs/tariff-form";
import { getPropertyById } from "@/lib/properties-data";
import { createTariff } from "@/app/actions/tariffs";
import { getCurrentUser } from "@/lib/dal";
import { hasEstablishmentPermission } from "@/lib/permissions";

export default async function NewTariffPage(props: PageProps<"/logements/[id]/tariffs/new">) {
  const { id } = await props.params;
  const [currentUser, property] = await Promise.all([
    getCurrentUser(),
    getPropertyById(id),
  ]);
  if (!property) {
    notFound();
  }
  if (!hasEstablishmentPermission(currentUser, "CAN_EDIT_TARIFFS")) {
    redirect(`/logements/${property.id}`);
  }

  const action = createTariff.bind(null, property.id);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-7">
      <div className="mb-5">
        <PageHeader back={{ href: `/logements/${property.id}`, label: "Retour" }} title={`Nouveau tarif — ${property.name}`} />
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
        <TariffForm action={action} submitLabel="ENREGISTRER LE TARIF" />
      </div>
    </div>
  );
}
