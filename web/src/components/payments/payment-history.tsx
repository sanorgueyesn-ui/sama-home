import { Card } from "@/components/ui/card";
import { T } from "@/components/i18n/i18n-provider";
import { dateLocale } from "@/lib/i18n/date-locale";

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
  return new Intl.DateTimeFormat(dateLocale(), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
}

/** Bloc 15 — "30/09 10:05 — 5 000 — Wave", plus référence/note quand présentes. */
export function PaymentHistory({ payments, ticketHref }: { payments: PaymentRow[]; ticketHref?: (paymentId: string) => string }) {
  return (
    <Card className="px-4">
      <p className="pt-3 text-[11px] font-bold text-app-muted"><T>HISTORIQUE DES PAIEMENTS</T></p>
      {payments.length === 0 ? (
        <p className="py-3 text-sm font-medium text-app-faint"><T>Aucun paiement enregistré.</T></p>
      ) : (
        payments.map((p) => (
          <div key={p.id} className="border-b border-app-line py-3 last:border-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-fg">
                {fmtDateTime(p.paidAt)} — {fmtFcfa(p.amount)} — <T>{METHOD_LABELS[p.method] ?? p.method}</T>
              </span>
            </div>
            {p.reference ? (
              <p className="mt-0.5 text-xs font-medium text-app-muted"><T>Référence :</T> {p.reference}</p>
            ) : null}
            {p.note ? <p className="mt-0.5 text-xs font-medium text-app-muted">{p.note}</p> : null}
            {ticketHref ? (
              <a href={ticketHref(p.id)} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex text-xs font-bold text-brand-orange underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-app-focus">
                <T>Ticket de caisse</T>
              </a>
            ) : null}
          </div>
        ))
      )}
    </Card>
  );
}
