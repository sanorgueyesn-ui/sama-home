import { Card } from "@/components/ui/card";

type PaymentRow = {
  id: string;
  amount: number;
  method: string;
  paidAt: Date;
  reference: string | null;
  note: string | null;
};

const METHOD_LABELS: Record<string, string> = {
  CASH: "Espèces",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
  OTHER: "Autre",
};

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}
function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
}

/** Bloc 15 — "30/09 10:05 — 5 000 — Wave", plus référence/note quand présentes. */
export function PaymentHistory({ payments }: { payments: PaymentRow[] }) {
  return (
    <Card className="mt-3 px-4">
      <p className="pt-3 text-[11px] font-bold text-navy/50">HISTORIQUE DES PAIEMENTS</p>
      {payments.length === 0 ? (
        <p className="py-3 text-sm font-medium text-navy/40">Aucun paiement enregistré.</p>
      ) : (
        payments.map((p) => (
          <div key={p.id} className="border-b border-[#E7EAEE] py-3 last:border-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-navy">
                {fmtDateTime(p.paidAt)} — {fmtFcfa(p.amount)} — {METHOD_LABELS[p.method] ?? p.method}
              </span>
            </div>
            {p.reference ? (
              <p className="mt-0.5 text-xs font-medium text-navy/50">Référence : {p.reference}</p>
            ) : null}
            {p.note ? <p className="mt-0.5 text-xs font-medium text-navy/50">{p.note}</p> : null}
          </div>
        ))
      )}
    </Card>
  );
}
