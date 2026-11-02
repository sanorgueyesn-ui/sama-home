import { PageHeader } from "@/components/ui/page-kit";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TariffForm } from "@/app/logements/[id]/tariffs/tariff-form";
import { getPropertyById } from "@/lib/properties-data";
import { getTariffById } from "@/lib/tariffs-data";
import { updateTariff } from "@/app/actions/tariffs";
import { getCurrentUser } from "@/lib/dal";
import { hasEstablishmentPermission } from "@/lib/permissions";

export default async function EditTariffPage(
  props: PageProps<"/logements/[id]/tariffs/[tariffId]/edit">,
) {
  const { id, tariffId } = await props.params;
  const [currentUser, property, tariff] = await Promise.all([
    getCurrentUser(),
    getPropertyById(id),
    getTariffById(tariffId),
  ]);

  if (!property || !tariff || tariff.propertyId !== property.id) {
    notFound();
  }

  if (!hasEstablishmentPermission(currentUser, "CAN_EDIT_TARIFFS")) {
    redirect(`/logements/${property.id}`);
  }

  const action = updateTariff.bind(null, tariff.id);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-7">
      <div className="mb-5">
        <PageHeader back={{ href: `/logements/${property.id}`, label: "Retour" }} title="Modifier le tarif" />
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
        <TariffForm
          action={action}
          submitLabel="ENREGISTRER LES MODIFICATIONS"
          showActiveToggle
          defaultValues={{
            label: tariff.label,
            type: tariff.type,
            durationValue: tariff.durationValue,
            durationUnit: tariff.durationUnit,
            amount: tariff.amount,
            active: tariff.active,
          }}
        />
      </div>
    </div>
  );
}
