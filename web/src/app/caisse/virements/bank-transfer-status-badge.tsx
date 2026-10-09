/** Bloc G, section 8 — mêmes 4 couleurs du langage visuel SAMA HOME (tokens sémantiques, cohérent avec CashSessionStatusBadge), même structure que ReservationStatusBadge/RentalStatusBadge. */
const STATUS_META: Record<string, { label: string; text: string; dot: string; bg: string }> = {
  DRAFT: { label: "Brouillon", text: "text-neutral", dot: "bg-neutral", bg: "bg-neutral-bg" },
  SCHEDULED: { label: "Programmé", text: "text-info", dot: "bg-info", bg: "bg-info-bg" },
  EFFECTED: { label: "Effectué", text: "text-success", dot: "bg-success", bg: "bg-success-bg" },
  CANCELLED: { label: "Annulé", text: "text-danger", dot: "bg-danger", bg: "bg-danger-bg" },
};

export function BankTransferStatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.DRAFT;
  return (
    <div className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 ${meta.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      <span className={`text-[10.5px] font-bold ${meta.text}`}>{meta.label}</span>
    </div>
  );
}
