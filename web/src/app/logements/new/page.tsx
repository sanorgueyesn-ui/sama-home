import { PageHeader } from "@/components/ui/page-kit";
import { PropertyForm } from "@/app/logements/property-form";
import { createProperty } from "@/app/actions/properties";

export default function NewPropertyPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-7">
      <div className="mb-5">
        <PageHeader back={{ href: "/logements", label: "Retour" }} title="Nouveau logement" />
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
        <PropertyForm action={createProperty} submitLabel="ENREGISTRER LE LOGEMENT" />
      </div>
    </div>
  );
}
