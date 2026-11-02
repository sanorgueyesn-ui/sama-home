import { PageHeader } from "@/components/ui/page-kit";
import { RentalForm } from "@/app/locations/rental-form";
import { createRentalDirect } from "@/app/actions/rentals";
import { listClientsForSelect } from "@/lib/clients-data";
import { listActivePropertiesWithActiveTariffs } from "@/lib/reservations-data";
import { getActiveSpace } from "@/lib/active-mode";
import { pageVocabulary } from "@/lib/page-vocabulary";

export default async function NewRentalPage(props: PageProps<"/locations/new">) {
  const { propertyId, clientId } = await props.searchParams;
  const vocab = pageVocabulary((await getActiveSpace()).mode);

  const [clients, properties] = await Promise.all([
    listClientsForSelect(),
    listActivePropertiesWithActiveTariffs(),
  ]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-7">
      <div className="mb-5">
        <PageHeader back={{ href: "/locations", label: "Retour" }} title={vocab.newStay} />
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
        <RentalForm
          action={createRentalDirect}
          clients={clients}
          properties={properties}
          guestWord={vocab.guest}
          submitLabel={vocab.newStay === "Check-in direct" ? "ENREGISTRER L'ARRIVÉE" : "ENREGISTRER LA LOCATION"}
          defaultPropertyId={typeof propertyId === "string" ? propertyId : undefined}
          defaultClientId={typeof clientId === "string" ? clientId : undefined}
        />
      </div>
    </div>
  );
}
