import { Card } from "@/components/ui/card";
import { PaymentStatusBadge } from "@/components/payments/payment-status-badge";
import type { PaymentSummary } from "@/lib/payment-summary";

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-[#E7EAEE] py-3 last:border-0">
      <span className="text-[11px] font-bold text-navy/50">{label}</span>
      <span className={strong ? "text-base font-extrabold text-navy" : "text-sm font-semibold text-navy"}>
        {value}
      </span>
    </div>
  );
}

/**
 * Bloc 6/13/14 — the single financial summary card used on both the
 * reservation and rental detail pages. `extraRows` carries the rental-only
 * breakdown (montant initial / extensions) computed by the caller from data
 * it already has — this component itself stays purely presentational.
 */
export function PaymentSummaryCard({
  summary,
  extraRows,
}: {
  summary: PaymentSummary;
  extraRows?: { label: string; value: string }[];
}) {
  return (
    <Card className="mt-3 px-4">
      <div className="flex items-center justify-between pt-3">
        <p className="text-[11px] font-bold text-navy/50">SITUATION FINANCIÈRE</p>
        <PaymentStatusBadge status={summary.status} />
      </div>
      {extraRows?.map((r) => <Row key={r.label} label={r.label} value={r.value} />)}
      <Row label="TOTAL DÛ" value={fmtFcfa(summary.totalDue)} />
      <Row label="DÉJÀ PAYÉ" value={fmtFcfa(summary.totalPaid)} />
      <Row label="RESTE À PAYER" value={fmtFcfa(summary.remaining)} strong />
    </Card>
  );
}
