import { PageHeader } from "@/components/ui/page-kit";
import Link from "next/link";
import { ClientForm } from "@/app/clients/client-form";
import { createClient } from "@/app/actions/clients";

// Phase 12, Bloc 6 — mirrors the exact allowlist enforced server-side in
// actions/clients.ts (safeReturnTo). Duplicated here only to decide the
// "Retour" link's target — the server never trusts this page's own check,
// createClient re-validates independently.
const RETURN_TO_PATTERN = /^\/(reservations|locations)\/new(\?[\w=&%.-]*)?$/;

export default async function NewClientPage(props: PageProps<"/clients/new">) {
  const { returnTo: rawReturnTo } = await props.searchParams;
  const returnTo =
    typeof rawReturnTo === "string" && RETURN_TO_PATTERN.test(rawReturnTo) ? rawReturnTo : undefined;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-7">
      <div className="mb-5">
        <PageHeader back={{ href: returnTo ?? "/clients", label: "Retour" }} title="Nouveau client" />
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
        <ClientForm action={createClient} submitLabel="ENREGISTRER LE CLIENT" returnTo={returnTo} />
      </div>
    </div>
  );
}
