import Link from "next/link";
import { notFound } from "next/navigation";
import { TariffForm } from "@/app/logements/[id]/tariffs/tariff-form";
import { getPropertyById } from "@/lib/properties-data";
import { getTariffById } from "@/lib/tariffs-data";
import { updateTariff } from "@/app/actions/tariffs";

export default async function EditTariffPage(
  props: PageProps<"/logements/[id]/tariffs/[tariffId]/edit">,
) {
  const { id, tariffId } = await props.params;
  const [property, tariff] = await Promise.all([getPropertyById(id), getTariffById(tariffId)]);

  if (!property || !tariff || tariff.propertyId !== property.id) {
    notFound();
  }

  const action = updateTariff.bind(null, tariff.id);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-6 pb-10">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href={`/logements/${property.id}`}
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-navy"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="truncate text-xl font-extrabold text-navy">Modifier le tarif</h1>
      </div>

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
  );
}
