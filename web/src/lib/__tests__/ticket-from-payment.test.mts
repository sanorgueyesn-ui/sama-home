// Ticket d'un paiement réel : rien d'inventé, solde seulement quand il a un sens.
import test from "node:test";
import assert from "node:assert/strict";
import { buildPaymentTicket, paymentMethodLabel, paymentReference } from "../documents/ticket-from-payment";
import { sampleBrand } from "../documents/samples";

const base = {
  brand: sampleBrand(),
  payment: { id: "cmabcdef123456", amount: 30_000, method: "WAVE", paidAt: new Date("2026-11-02T10:00:00Z"), reference: "WV-1" },
  clientName: "Awa Diop",
  propertyName: "Chambre 12",
  arrival: new Date("2026-11-01T14:00:00Z"),
  departure: new Date("2026-11-04T11:00:00Z"),
  durationLabel: "3 nuits",
  rentalAmount: 105_000,
  charges: [] as { label: string; amount: number }[],
  isLatestPayment: true,
  remaining: 75_000,
};

test("paiement partiel le plus récent : ticket de paiement avec le solde restant", () => {
  const doc = buildPaymentTicket(base);
  assert.equal(doc.kind, "PAYMENT");
  assert.equal(doc.remaining, 75_000);
  assert.equal(doc.amount, 30_000);
  assert.equal(doc.total, 105_000);
  assert.equal(doc.method, "Wave");
  assert.equal(doc.sample, undefined);
});

test("dernier paiement qui solde le séjour : ticket de solde", () => {
  const doc = buildPaymentTicket({ ...base, remaining: 0 });
  assert.equal(doc.kind, "BALANCE");
  assert.equal(doc.remaining, 0);
});

test("un paiement plus ancien n'affiche pas le solde actuel (il ne le concerne pas)", () => {
  const doc = buildPaymentTicket({ ...base, isLatestPayment: false, remaining: 0 });
  assert.equal(doc.remaining, null);
  assert.equal(doc.kind, "PAYMENT");
});

test("extras : l'hébergement est le total moins les extras, chaque extra a sa ligne", () => {
  const doc = buildPaymentTicket({ ...base, rentalAmount: 112_500, charges: [{ label: "Boissons", amount: 7_500 }] });
  assert.deepEqual(doc.lines.map((l) => l.amount), [105_000, 7_500]);
  assert.equal(doc.lines.reduce((s, l) => s + l.amount, 0), doc.total);
});

test("rien d'inventé : pas de TVA, pas de caissier ; moyen inconnu = Autre ; référence stable", () => {
  const doc = buildPaymentTicket(base);
  assert.equal(doc.tax, null);
  assert.equal(doc.cashier, null);
  assert.equal(paymentMethodLabel("CASH"), "Espèces");
  assert.equal(paymentMethodLabel("CHEQUE"), "Autre");
  assert.equal(paymentReference("cmabcdef123456"), "123456");
  assert.equal(doc.number, "123456");
});
