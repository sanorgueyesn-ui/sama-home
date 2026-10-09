import Link from "next/link";
import { RentalForm } from "@/app/locations/rental-form";
import { createRentalDirect } from "@/app/actions/rentals";
import { listClientsForSelect } from "@/lib/clients-data";
import { listActivePropertiesWithActiveTariffs } from "@/lib/reservations-data";

export default async function NewRentalPage(props: PageProps<"/locations/new">) {
  const { propertyId, clientId } = await props.searchParams;

  const [clients, properties] = await Promise.all([
    listClientsForSelect(),
    listActivePropertiesWithActiveTariffs(),
  ]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pt-6 pb-10 md:max-w-none md:px-8 lg:px-10">
      <div className="mb-5 flex items-center gap-3 lg:mx-auto lg:w-full lg:max-w-2xl">
        <Link
          href="/locations"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-fg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="text-xl font-extrabold text-fg">Nouvelle location</h1>
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
        <RentalForm
          action={createRentalDirect}
          clients={clients}
          properties={properties}
          defaultPropertyId={typeof propertyId === "string" ? propertyId : undefined}
          defaultClientId={typeof clientId === "string" ? clientId : undefined}
        />
      </div>
    </div>
  );
}
