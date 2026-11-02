import { redirect } from "next/navigation";
import { switchSpace } from "@/app/actions/space";
import { verifySession } from "@/lib/dal";
import { listMySpaces } from "@/lib/spaces-data";
import { BUSINESS_MODE_LABELS, SPACE_STATUS_LABELS } from "@/lib/business-mode";
import { T } from "@/components/i18n/i18n-provider";

export const metadata = { title: "Choisir un espace — SAMA HOME" };

/**
 * Page de choix d'espace professionnel. N'utilise volontairement PAS `getCurrentUser()` : celui-ci
 * redirige ici tant qu'aucun espace n'est choisi, ce qui ferait une boucle. L'identité vient de
 * la session (`verifySession`), la liste de ses appartenances ; le choix lui-même est revérifié
 * côté serveur par `switchSpace`.
 */
export default async function SpacesPage() {
  const { userId } = await verifySession();
  const spaces = await listMySpaces(userId);

  // Zéro ou un seul espace : rien à choisir.
  if (spaces.length <= 1) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-6 px-4 py-10">
      <header>
        <h1 className="text-2xl font-black"><T>Choisissez votre espace</T></h1>
        <p className="mt-1 text-sm text-fg/70">
          <T>Votre compte donne accès à plusieurs activités. Chacune a ses propres données : rien n&apos;est mélangé.</T>
        </p>
      </header>
      <ul className="flex flex-col gap-3">
        {spaces.map((space) => {
          const usable = space.status === "ACTIVE";
          return (
            <li key={space.id}>
              <form action={switchSpace}>
                <input type="hidden" name="establishmentId" value={space.id} />
                <button
                  type="submit"
                  disabled={!usable}
                  className="flex w-full items-center justify-between rounded-2xl border border-fg/15 bg-surface-raised px-5 py-4 text-left transition-colors enabled:hover:border-fg/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex flex-col">
                    <span className="text-base font-bold">{space.name}</span>
                    <span className="text-xs text-fg/70">
                      <T>{BUSINESS_MODE_LABELS[space.businessMode]}</T>
                      {usable ? "" : ` · ${SPACE_STATUS_LABELS[space.status]}`}
                    </span>
                  </span>
                  {usable ? <span aria-hidden="true">→</span> : null}
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
