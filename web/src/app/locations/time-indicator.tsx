import { computeRentalTimeState, formatRentalTimeText } from "@/lib/rental-status";

// Lot 4 — couleurs en var(--color-X) (globals.css) pour suivre le thème
// dark, même pattern que les autres badges de statut de l'app.
const STATE_META = {
  normal: { color: "var(--color-success)", bg: "var(--color-success-bg)" },
  near: { color: "var(--color-warning)", bg: "var(--color-warning-bg)" },
  overdue: { color: "var(--color-danger)", bg: "var(--color-danger-bg)" },
};

/**
 * Color AND text together (Bloc 12: "ne pas utiliser uniquement la
 * couleur") — "Normal" / "Départ dans 24 min" / "Dépassé de 12 min".
 */
export function RentalTimeIndicator({ now, plannedDepartureAt }: { now: Date; plannedDepartureAt: Date }) {
  const state = computeRentalTimeState(now, plannedDepartureAt);
  const meta = STATE_META[state];
  const text = formatRentalTimeText(now, plannedDepartureAt);
  return (
    <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5" style={{ background: meta.bg }}>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} />
      <span className="text-xs font-bold" style={{ color: meta.color }}>
        {text}
      </span>
    </div>
  );
}
