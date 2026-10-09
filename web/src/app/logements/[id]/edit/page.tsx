import Link from "next/link";
import { notFound } from "next/navigation";
import { PropertyForm } from "@/app/logements/property-form";
import { getPropertyById } from "@/lib/properties-data";
import { updateProperty } from "@/app/actions/properties";

export default async function EditPropertyPage(props: PageProps<"/logements/[id]/edit">) {
  const { id } = await props.params;
  const property = await getPropertyById(id);
  if (!property) {
    notFound();
  }

  const action = updateProperty.bind(null, property.id);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pt-6 pb-10 md:max-w-none md:px-8 lg:px-10">
      <div className="mb-5 flex items-center gap-3 lg:mx-auto lg:w-full lg:max-w-2xl">
        <Link
          href={`/logements/${property.id}`}
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-fg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="truncate text-xl font-extrabold text-fg">Modifier {property.name}</h1>
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
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
      </div>
    </div>
  );
}
