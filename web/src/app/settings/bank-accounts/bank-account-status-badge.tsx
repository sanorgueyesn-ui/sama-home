export function BankAccountStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 ${active ? "bg-success-bg" : "bg-neutral-bg"}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-success" : "bg-neutral"}`} />
      <span className={`text-[10.5px] font-bold ${active ? "text-success" : "text-neutral"}`}>
        {active ? "Actif" : "Inactif"}
      </span>
    </span>
  );
}
