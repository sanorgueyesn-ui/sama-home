import Link from "next/link";
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
        <h1 className="truncate text-xl font-extrabold text-fg">Nouveau tarif — {property.name}</h1>
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
        <TariffForm action={action} submitLabel="ENREGISTRER LE TARIF" />
      </div>
    </div>
  );
}
