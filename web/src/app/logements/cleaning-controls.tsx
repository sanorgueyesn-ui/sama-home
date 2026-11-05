import { setCleaningStatus } from "@/app/actions/housekeeping";
import { Badge } from "@/components/ui/page-kit";
import { CLEANING_LABELS, cleaningActions, type CleaningStatusValue } from "@/lib/housekeeping";
import { T } from "@/components/i18n/i18n-provider";

const CLEANING_TONE: Record<CleaningStatusValue, "bad" | "warn" | "good"> = { DIRTY: "bad", IN_PROGRESS: "warn", CLEAN: "good" };

/**
 * Hôtel : état du ménage d'une chambre et gestes rapides (à nettoyer, nettoyage en cours, prête).
 * Composant serveur : chaque bouton est un petit formulaire qui appelle l'action `setCleaningStatus`.
 * À placer HORS d'un lien (un formulaire ne peut pas être imbriqué dans un <a>).
 */
export function CleaningControls({ propertyId, status }: { propertyId: string; status: CleaningStatusValue }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={CLEANING_TONE[status]}>
        <T>{CLEANING_LABELS[status]}</T>
      </Badge>
      {cleaningActions(status).map((action) => (
        <form key={action.to} action={setCleaningStatus.bind(null, propertyId, action.to)}>
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-lg border border-app-line-strong bg-app-panel px-3.5 text-xs font-bold text-app-text-2 transition hover:bg-app-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
          >
            <T>{action.label}</T>
          </button>
        </form>
      ))}
    </div>
  );
}
