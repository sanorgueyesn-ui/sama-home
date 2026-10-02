/** Bloc G, section 8 — mêmes 4 couleurs du langage visuel SAMA HOME, même structure que ReservationStatusBadge/RentalStatusBadge. */
const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: "Brouillon", color: "#52606D", bg: "#EBEDEE" },
  SCHEDULED: { label: "Programmé", color: "#2563EB", bg: "#E7EEFC" },
  EFFECTED: { label: "Effectué", color: "#16A34A", bg: "#E8F5EC" },
  CANCELLED: { label: "Annulé", color: "#E5484D", bg: "#FBEAEA" },
};

export function BankTransferStatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.DRAFT;
  return (
    <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: meta.bg }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      <span className="text-[10.5px] font-bold" style={{ color: meta.color }}>
        {meta.label}
      </span>
    </div>
  );
}
