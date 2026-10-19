import type { CashActivityEntry } from "@/lib/cash-breakdown-data";

function fmtFcfa(amount: number) {
  const sign = amount < 0 ? "-" : "";
  return `${sign}${Math.abs(amount).toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}

function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}

const TYPE_META: Record<string, { label: string; text: string; bg: string }> = {
  PAYMENT: { label: "Entrée", text: "text-success", bg: "bg-success-bg" },
  PAYMENT_CASH: { label: "Entrée", text: "text-success", bg: "bg-success-bg" },
  EXPENSE: { label: "Dépense", text: "text-danger", bg: "bg-danger-bg" },
  EXPENSE_CASH: { label: "Dépense", text: "text-danger", bg: "bg-danger-bg" },
  BANK_TRANSFER: { label: "Versement", text: "text-info", bg: "bg-info-bg" },
  CORRECTION: { label: "Ajustement", text: "text-warning", bg: "bg-warning-bg" },
};

export function CashActivityList({ entries }: { entries: CashActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-xl bg-surface-sunken px-4 py-6 text-center text-sm font-medium text-fg/50">
        Aucune activité enregistrée pour cette session.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => {
        const meta = TYPE_META[entry.type] || { label: "Mouvement", text: "text-fg", bg: "bg-surface-sunken" };
        return (
          <div
            key={`${entry.type}-${entry.id}`}
            className="flex items-center justify-between gap-3 rounded-xl bg-surface-raised px-4 py-3 shadow-card border border-white/5 hover:border-brand-orange/20 transition-colors"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.text} ${meta.bg}`}>
                  {meta.label}
                </span>
                {entry.method ? (
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    entry.method === "WAVE" ? "bg-sky-500/15 text-sky-400 border border-sky-500/30" :
                    entry.method === "ORANGE_MONEY" ? "bg-orange-500/15 text-orange-400 border border-orange-500/30" :
                    "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  }`}>
                    {entry.method === "WAVE" ? "Wave" : entry.method === "ORANGE_MONEY" ? "OM" : "Espèces"}
                  </span>
                ) : null}
                <span className="truncate text-xs font-semibold text-fg/60">{fmtDateTime(entry.date)}</span>
              </div>
              <p className="mt-1 truncate text-sm font-bold text-fg">{entry.label}</p>
              {entry.reference ? (
                <p className="truncate text-xs font-medium text-fg/50">Réf. {entry.reference}</p>
              ) : null}
              {entry.note ? (
                <p className="truncate text-[11px] text-fg/40 italic">{entry.note}</p>
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
