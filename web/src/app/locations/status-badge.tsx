const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: "En cours", color: "#2563EB", bg: "#E7EEFC" },
  COMPLETED: { label: "Terminée", color: "#52606D", bg: "#EBEDEE" },
  CANCELLED: { label: "Annulée", color: "#E5484D", bg: "#FBEAEA" },
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
