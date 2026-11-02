// Ticket de caisse d'un paiement réel (hôtel) : construction pure du document, aucune base. Rien n'est
// inventé : ce qui n'est pas connu (TVA, caissier, numérotation officielle) reste vide.
import type { DocumentBrand, PaymentMethodLabel, TicketDoc, TicketLine } from "./types";

const METHOD_LABELS: Record<string, PaymentMethodLabel> = {
  CASH: "Espèces",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
};

export const paymentMethodLabel = (method: string): PaymentMethodLabel => METHOD_LABELS[method] ?? "Autre";

/** Référence courte et stable d'un paiement (fin de son identifiant). Provisoire : ce n'est PAS une numérotation officielle. */
export const paymentReference = (paymentId: string) => paymentId.slice(-6).toUpperCase();

export type PaymentTicketInput = {
  brand: DocumentBrand;
  payment: { id: string; amount: number; method: string; paidAt: Date; reference: string | null };
  clientName: string | null;
  propertyName: string;
  arrival: Date;
  departure: Date;
  durationLabel: string;
  /** Montant courant du séjour (hébergement + extras). */
  rentalAmount: number;
  /** Extras et remises déjà imputés au séjour. */
  charges: { label: string; amount: number }[];
  /** Ce paiement est le plus récent du séjour : seul cas où le solde restant actuel le concerne. */
  isLatestPayment: boolean;
  /** Solde restant actuel du séjour. */
  remaining: number;
};

export function buildPaymentTicket(input: PaymentTicketInput): TicketDoc {
  const chargesTotal = input.charges.reduce((sum, charge) => sum + charge.amount, 0);
  const lines: TicketLine[] = [
    { label: `${input.propertyName}, ${input.durationLabel.toLowerCase()}`, amount: input.rentalAmount - chargesTotal },
    ...input.charges.map((charge) => ({ label: charge.label, amount: charge.amount })),
  ];
  const remaining = input.isLatestPayment ? input.remaining : null;
  return {
    kind: remaining === 0 ? "BALANCE" : "PAYMENT",
    number: paymentReference(input.payment.id),
    issuedAt: input.payment.paidAt,
    brand: input.brand,
    cashier: null,
    client: input.clientName,
    property: input.propertyName,
    stay: { arrival: input.arrival, departure: input.departure },
    lines,
    total: input.rentalAmount,
    amount: input.payment.amount,
    method: paymentMethodLabel(input.payment.method),
    reference: input.payment.reference,
    remaining,
    tax: null,
    note: null,
  };
}
