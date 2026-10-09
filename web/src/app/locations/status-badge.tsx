// Reconstruction UI — couleurs en var(--color-X) (voir globals.css) plutôt
// qu'en hex figé, pour suivre le thème clair/sombre actif (même pattern que
// PROPERTY_STATUS_META, lib/property-status.ts). Les 3 statuts et leurs
// libellés sont inchangés.
const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: "En cours", color: "var(--color-info)", bg: "var(--color-info-bg)" },
  COMPLETED: { label: "Terminée", color: "var(--color-neutral)", bg: "var(--color-neutral-bg)" },
  CANCELLED: { label: "Annulée", color: "var(--color-danger)", bg: "var(--color-danger-bg)" },
};

export function RentalStatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.ACTIVE;
  return (
    <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: meta.bg }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      <span className="text-[10.5px] font-bold" style={{ color: meta.color }}>
        {meta.label}
      </span>
    </div>
  );
}
