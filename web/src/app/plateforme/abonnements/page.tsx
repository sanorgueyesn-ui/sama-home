import {
  listPendingSubscriptionPayments,
  type PendingSubscriptionPaymentView,
} from "@/lib/subscription-data";
import { ConfirmPaymentButton } from "../confirm-payment-button";

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}
function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(d);
}

/**
 * Phase 3G / Lot D12-P86 — contenu déplacé tel quel depuis l'ancien
 * `/plateforme` (Lot D12-P60), seule la présentation (styles sombres de la
 * console) change. `listPendingSubscriptionPayments()`/`ConfirmPaymentButton`
 * strictement inchangées.
 */
function PaymentRow({ payment }: { payment: PendingSubscriptionPaymentView }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-extrabold text-white">{payment.establishmentName}</p>
        <p className="mt-0.5 text-[11px] font-medium text-white/50">Demande envoyée le {fmtDate(payment.createdAt)}</p>
        <p className="mt-1 text-sm font-semibold text-white/90">
          {fmtFcfa(payment.amount)} / {payment.periodMonths} mois
        </p>
        <p className="mt-0.5 text-[11px] font-medium text-white/40">
          Référence : {payment.reference ?? "—"}
        </p>
      </div>
      <ConfirmPaymentButton paymentId={payment.id} establishmentName={payment.establishmentName} />
    </div>
  );
}

export default async function PlatformSubscriptionPaymentsPage() {
  let payments: PendingSubscriptionPaymentView[] = [];
  let loadError: string | null = null;
  try {
    payments = await listPendingSubscriptionPayments();
  } catch (error) {
    // D12-P172 — même correction que PlatformDashboardPage() : ne jamais
    // avaler le signal interne redirect() de Next.js (digest "NEXT_REDIRECT").
    if (error && typeof error === "object" && "digest" in error && typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("PlatformSubscriptionPaymentsPage() — échec du chargement des demandes :", error);
    loadError = "Impossible de charger les demandes de paiement pour le moment. Rechargez la page pour réessayer.";
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pt-6 pb-10 md:max-w-none md:px-8 lg:px-10">
      <h1 className="text-2xl font-extrabold text-white">Demandes de renouvellement</h1>
      <p className="mt-1 text-xs font-medium text-white/50">
        Demandes de paiement d&apos;abonnement en attente de confirmation, tous établissements.
      </p>

      {loadError ? (
        <p className="mt-5 rounded-xl bg-danger-bg px-4 py-3 text-sm font-bold text-danger">{loadError}</p>
      ) : payments.length === 0 ? (
        <p className="mt-5 text-sm font-semibold text-white/70">Aucune demande en attente.</p>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {payments.map((payment) => (
            <PaymentRow key={payment.id} payment={payment} />
          ))}
        </div>
      )}
    </div>
  );
}
