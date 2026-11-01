import Link from "next/link";
import { switchSpace } from "@/app/actions/space";
import { BUSINESS_MODE_LABELS, SPACE_STATUS_LABELS, type SpaceOption } from "@/lib/business-mode";

/**
 * Sélecteur d'espace professionnel du menu du compte. Menu déroulant natif (`<details>`) : aucun
 * JavaScript client, il fonctionne avant le chargement complet de la page. Chaque espace est un
 * petit formulaire vers `switchSpace` ; un espace non actif est affiché désactivé avec son statut.
 * Le serveur revérifie de toute façon l'appartenance et le statut (voir actions/space.ts).
 */
export function SpaceSwitcher({
  spaces,
  activeId,
  triggerClassName,
  iconBgClassName,
  canAddSpace = false,
}: {
  spaces: SpaceOption[];
  activeId: string | null;
  triggerClassName: string;
  iconBgClassName: string;
  /** Affichage seulement : `createSpace` revérifie le rôle et le plafond côté serveur. */
  canAddSpace?: boolean;
}) {
  const active = spaces.find((space) => space.id === activeId);
  return (
    <details className="relative">
      <summary
        className={`${triggerClassName} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}
        aria-label="Changer d'espace professionnel"
      >
        <span className={`w-5 h-5 rounded-lg ${iconBgClassName} flex items-center justify-center text-white shrink-0`}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <rect width="16" height="20" x="4" y="2" rx="2" />
            <path d="M9 22v-4h6v4" />
          </svg>
        </span>
        <span className="max-w-[10rem] truncate" title={active?.name}>
          {active?.name ?? "Choisir un espace"}
        </span>
        <span className="text-app-faint text-[10px]" aria-hidden="true">▾</span>
      </summary>
      <ul className="absolute right-0 mt-2 w-64 rounded-xl border border-app-line bg-app-panel p-1.5 shadow-lg z-50">
        {spaces.map((space) => {
          const selectable = space.status === "ACTIVE" && space.id !== activeId;
          return (
            <li key={space.id}>
              <form action={switchSpace}>
                <input type="hidden" name="establishmentId" value={space.id} />
                <button
                  type="submit"
                  disabled={!selectable}
                  aria-current={space.id === activeId ? "true" : undefined}
                  className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left text-xs transition-colors enabled:hover:bg-app-hover disabled:cursor-default"
                >
                  <span className={`font-bold ${space.id === activeId ? "text-app-text" : "text-app-text-2"}`}>
                    {space.name}
                    {space.id === activeId ? " ✓" : ""}
                  </span>
                  <span className="text-[10px] text-app-faint">
                    {BUSINESS_MODE_LABELS[space.businessMode]}
                    {space.status !== "ACTIVE" ? ` · ${SPACE_STATUS_LABELS[space.status]}` : ""}
                  </span>
                </button>
              </form>
            </li>
          );
        })}
        {canAddSpace ? (
          <li className="mt-1 border-t border-app-line pt-1">
            <Link href="/espaces/nouveau" className="block rounded-lg px-3 py-2 text-xs font-bold text-app-text-2 hover:bg-app-hover">
              + Ajouter un espace professionnel
            </Link>
          </li>
        ) : null}
      </ul>
    </details>
  );
}
