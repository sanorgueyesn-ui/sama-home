import { PageHeader } from "@/components/ui/page-kit";
import { notFound } from "next/navigation";
import { PropertyForm } from "@/app/logements/property-form";
import { getPropertyById } from "@/lib/properties-data";
import { updateProperty } from "@/app/actions/properties";
import { DeletePropertyButton } from "../delete-property-button";
import { getCurrentUser } from "@/lib/dal";
import { hasEstablishmentPermission } from "@/lib/permissions";

export default async function EditPropertyPage(props: PageProps<"/logements/[id]/edit">) {
  const { id } = await props.params;
  const [currentUser, property] = await Promise.all([
    getCurrentUser(),
    getPropertyById(id),
  ]);
  if (!property) {
    notFound();
  }

  const canDeleteProperty = hasEstablishmentPermission(currentUser, "CAN_DELETE_PROPERTY");
  const action = updateProperty.bind(null, property.id);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-7">
      <div className="mb-5">
        <PageHeader back={{ href: `/logements/${property.id}`, label: "Retour" }} title={`Modifier ${property.name}`} />
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl space-y-6">
        <PropertyForm
          action={action}
          submitLabel="ENREGISTRER LES MODIFICATIONS"
          showActiveToggle
          defaultValues={{
            name: property.name,
            type: property.type,
            description: property.description ?? undefined,
            capacity: property.capacity,
            photo: property.photo ?? undefined,
            active: property.active,
          }}
        />

        {/* Zone de suppression */}
        {canDeleteProperty ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/5 p-4 sm:p-5">
            <div className="mb-3">
              <h2 className="text-sm font-black text-app-bad uppercase tracking-wide">Supprimer ce logement</h2>
              <p className="mt-1 text-xs text-fg/60">
                Supprime définitivement ce logement ainsi que ses tarifs et historiques associés.
              </p>
            </div>
            <DeletePropertyButton id={property.id} name={property.name} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
