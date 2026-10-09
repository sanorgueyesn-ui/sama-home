import type { PaymentStatus } from "@/lib/payment-summary";

// Mêmes 3 tokens déjà utilisés partout dans l'app (globals.css
// --color-danger/-warning/-success), exprimés en var() pour suivre le thème
// dark — pas de nouvelle couleur inventée pour ce badge.
const STATUS_META: Record<PaymentStatus, { label: string; color: string; bg: string }> = {
  NON_PAYE: { label: "Non payé", color: "var(--color-danger)", bg: "var(--color-danger-bg)" },
  PARTIEL: { label: "Partiel", color: "var(--color-warning)", bg: "var(--color-warning-bg)" },
  PAYE: { label: "Payé", color: "var(--color-success)", bg: "var(--color-success-bg)" },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const meta = STATUS_META[status];
  return (
    <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: meta.bg }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      <span className="text-[10.5px] font-bold" style={{ color: meta.color }}>
        {meta.label}
      </span>
    </div>
  );
}
