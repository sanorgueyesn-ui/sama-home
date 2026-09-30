const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  CONFIRMED: { label: "Confirmée", color: "#F59E0B", bg: "#FDF1DC" },
  ARRIVED: { label: "Arrivée", color: "#2563EB", bg: "#E7EEFC" },
  CANCELLED: { label: "Annulée", color: "#E5484D", bg: "#FBEAEA" },
  COMPLETED: { label: "Terminée", color: "#52606D", bg: "#EBEDEE" },
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
