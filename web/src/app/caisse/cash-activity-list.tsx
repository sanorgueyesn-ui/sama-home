import type { CashActivityEntry } from "@/lib/cash-breakdown-data";

function fmtFcfa(amount: number) {
  const sign = amount < 0 ? "-" : "";
  return `${sign}${Math.abs(amount).toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}
function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}

const TYPE_META: Record<CashActivityEntry["type"], { label: string; text: string; bg: string }> = {
  PAYMENT_CASH: { label: "Entrée", text: "text-success", bg: "bg-success-bg" },
  EXPENSE_CASH: { label: "Sortie", text: "text-danger", bg: "bg-danger-bg" },
  BANK_TRANSFER: { label: "Versement", text: "text-info", bg: "bg-info-bg" },
  CORRECTION: { label: "Correction", text: "text-warning", bg: "bg-warning-bg" },
};

/** Bloc E, section 9 — construite à partir de Payment/Expense/BankTransfer/CashCorrection existants, jamais d'un CashMovement. */
export function CashActivityList({ entries }: { entries: CashActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-xl bg-surface-sunken px-4 py-6 text-center text-sm font-medium text-fg/50">
        Aucune activité pour cette session.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => {
        const meta = TYPE_META[entry.type];
        return (
          <div
            key={`${entry.type}-${entry.id}`}
            className="flex items-center justify-between gap-3 rounded-xl bg-surface-raised px-4 py-3 shadow-card"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.text} ${meta.bg}`}>
                  {meta.label}
                </span>
                <span className="truncate text-xs font-semibold text-fg/60">{fmtDateTime(entry.date)}</span>
              </div>
              <p className="mt-1 truncate text-sm font-bold text-fg">{entry.label}</p>
              {entry.reference ? (
                <p className="truncate text-xs font-medium text-fg/50">Réf. {entry.reference}</p>
              ) : null}
            </div>
            <p className={`shrink-0 text-sm font-extrabold ${entry.amount >= 0 ? "text-success" : "text-danger"}`}>
              {entry.amount >= 0 ? "+" : ""}
              {fmtFcfa(entry.amount)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
