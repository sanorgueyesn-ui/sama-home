import { computeRentalTimeState, formatRentalTimeText } from "@/lib/rental-status";

const STATE_META = {
  normal: { color: "#16A34A", bg: "#E8F5EC" },
  near: { color: "#F59E0B", bg: "#FDF1DC" },
  overdue: { color: "#E5484D", bg: "#FBEAEA" },
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
