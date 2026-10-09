// Reconstruction UI — voir le commentaire équivalent dans
// app/locations/status-badge.tsx (même pattern, même raison).
const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  CONFIRMED: { label: "Confirmée", color: "var(--color-warning)", bg: "var(--color-warning-bg)" },
  ARRIVED: { label: "Arrivée", color: "var(--color-info)", bg: "var(--color-info-bg)" },
  CANCELLED: { label: "Annulée", color: "var(--color-danger)", bg: "var(--color-danger-bg)" },
  COMPLETED: { label: "Terminée", color: "var(--color-neutral)", bg: "var(--color-neutral-bg)" },
};

export function ReservationStatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.CONFIRMED;
  return (
    <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: meta.bg }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      <span className="text-[10.5px] font-bold" style={{ color: meta.color }}>
        {meta.label}
      </span>
    </div>
  );
}
