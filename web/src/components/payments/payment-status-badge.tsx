import type { PaymentStatus } from "@/lib/payment-summary";

// Same three tokens already used across the app (globals.css --color-danger/
// -warning/-success) — not new colors invented for this badge.
const STATUS_META: Record<PaymentStatus, { label: string; color: string; bg: string }> = {
  NON_PAYE: { label: "Non payé", color: "#E5484D", bg: "#FBEAEA" },
  PARTIEL: { label: "Partiel", color: "#F59E0B", bg: "#FDF1DC" },
  PAYE: { label: "Payé", color: "#16A34A", bg: "#E8F5EC" },
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
