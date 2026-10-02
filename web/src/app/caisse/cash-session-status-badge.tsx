export function CashSessionStatusBadge({ open }: { open: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${open ? "bg-success-bg" : "bg-neutral-bg"}`}
    >
      <span className={`h-2 w-2 rounded-full ${open ? "bg-success" : "bg-neutral"}`} />
      <span className={`text-xs font-extrabold ${open ? "text-success" : "text-neutral"}`}>
        {open ? "Caisse ouverte" : "Caisse fermée"}
      </span>
    </div>
  );
}
