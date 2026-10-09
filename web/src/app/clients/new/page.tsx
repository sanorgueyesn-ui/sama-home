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
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pt-6 pb-10 md:max-w-none md:px-8 lg:px-10">
      <div className="mb-5 flex items-center gap-3 lg:mx-auto lg:w-full lg:max-w-2xl">
        <Link
          href={returnTo ?? "/clients"}
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-fg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="text-xl font-extrabold text-fg">Nouveau client</h1>
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
        <ClientForm action={createClient} submitLabel="ENREGISTRER LE CLIENT" returnTo={returnTo} />
      </div>
    </div>
  );
}
