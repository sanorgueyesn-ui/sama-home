// Documents d'exemple pour l'aperçu de la bibliothèque. TOUT est fictif et chaque document porte
// `sample: true` (une mention « exemple, sans valeur » est imprimée). Seule la marque (nom, coordonnées,
// logo, couleurs) peut venir du vrai établissement ; à défaut, une marque d'exemple, jamais celle de SAMA HOME.
import { DEFAULT_BRAND_COLORS } from "@/lib/brand-colors";
import type { ContractDoc, ContractKind, DocumentBrand, QuittanceDoc, TicketDoc, TicketKind } from "./types";

export function sampleBrand(overrides: Partial<DocumentBrand> = {}): DocumentBrand {
  return {
    name: "Résidence Teranga",
    address: "Rue des Almadies, Dakar",
    phone: "+221 77 000 00 00",
    secondaryPhone: null,
    email: "contact@exemple.sn",
    logo: null,
    colors: DEFAULT_BRAND_COLORS,
    ...overrides,
  };
}

// Dates fixes : un aperçu doit être identique d'un jour à l'autre.
const D = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

export function sampleContract(kind: ContractKind, brand: DocumentBrand = sampleBrand()): ContractDoc {
  const hotel = kind === "HOTEL_STAY";
  return {
    kind,
    number: null,
    issuedAt: D(2026, 11, 2),
    brand,
    tenant: {
      name: "Awa Diop",
      phone: "+221 77 111 22 33",
      email: "awa.diop@exemple.sn",
      address: hotel ? null : "Mermoz, Dakar",
      nationality: "Sénégalaise",
      idType: "CNI",
      idNumber: "1 234 5678 91011",
    },
    property: {
      name: hotel ? "12" : "A3",
      typeLabel: hotel ? "Chambre" : "Appartement",
      description: hotel ? "Chambre double climatisée, salle d'eau privative, Wi-Fi." : "Appartement meublé de trois pièces, deuxième étage, cuisine équipée.",
    },
    period: hotel ? { start: D(2026, 11, 5, 14), end: D(2026, 11, 8, 11) } : { start: D(2026, 12, 1) },
    money: hotel ? { amount: 105_000, deposit: 30_000, paid: 30_000, remaining: 75_000 } : { amount: 250_000, deposit: 500_000, paid: 0, remaining: 0 },
    houseRules: hotel ? ["Pas de fête après 22 h."] : [],
    sample: true,
  };
}

export function sampleQuittance(brand: DocumentBrand = sampleBrand(), partial = false): QuittanceDoc {
  return {
    number: null,
    issuedAt: D(2026, 12, 3),
    brand,
    tenant: { name: "Awa Diop", address: "Appartement A3, Almadies" },
    property: { name: "A3", typeLabel: "Appartement" },
    period: { start: D(2026, 11, 1), end: D(2026, 11, 30) },
    rent: 250_000,
    charges: 15_000,
    received: partial ? 150_000 : 265_000,
    method: "Wave",
    receivedAt: D(2026, 11, 30),
    reference: "WV-48213",
    remainingDue: partial ? 115_000 : 0,
    sample: true,
  };
}

export function sampleTicket(kind: TicketKind, brand: DocumentBrand = sampleBrand()): TicketDoc {
  const base: TicketDoc = {
    kind,
    number: null,
    issuedAt: D(2026, 11, 5, 14, 12),
    brand,
    cashier: "Réception",
    client: "Awa Diop",
    property: "Chambre 12",
    stay: { arrival: D(2026, 11, 5, 14), departure: D(2026, 11, 8, 11) },
    lines: [{ label: "Chambre 12, 3 nuits", amount: 105_000 }],
    total: 105_000,
    amount: 50_000,
    method: "Orange Money",
    reference: "OM-77120",
    remaining: 55_000,
    tax: null,
    note: null,
    sample: true,
  };
  switch (kind) {
    case "ARRHES":
      return { ...base, issuedAt: D(2026, 11, 1, 10, 3), amount: 30_000, remaining: 75_000, method: "Wave", reference: "WV-10492" };
    case "PAYMENT":
      return base;
    case "BALANCE":
      return { ...base, issuedAt: D(2026, 11, 8, 10, 40), amount: 75_000, remaining: 0, method: "Espèces", reference: null };
    case "DEPOSIT":
      return { ...base, lines: [{ label: "Caution du logement", amount: 20_000 }], total: 20_000, amount: 20_000, remaining: null, method: "Espèces", reference: null, note: "Caution encaissée à l'arrivée." };
    case "DEPOSIT_REFUND":
      return { ...base, issuedAt: D(2026, 11, 8, 10, 50), lines: [{ label: "Caution du logement", amount: 20_000 }], total: 20_000, amount: 20_000, remaining: null, method: "Espèces", reference: null };
    case "EXTRAS":
      return {
        ...base,
        lines: [
          { label: "Petit-déjeuner", amount: 3_500, quantity: 2 },
          { label: "Blanchisserie", amount: 4_000 },
          { label: "Eau minérale 1,5 l", amount: 1_000, quantity: 3 },
        ],
        total: 14_000,
        amount: 14_000,
        remaining: 0,
        method: "Espèces",
        reference: null,
      };
    case "STAY_SUMMARY":
      return {
        ...base,
        lines: [
          { label: "Chambre 12, 3 nuits", amount: 105_000 },
          { label: "Extras", amount: 14_000 },
        ],
        total: 119_000,
        amount: 119_000,
        remaining: 0,
        method: null,
        reference: null,
        tax: { rate: 10, amount: 10_818 },
      };
    case "DUPLICATE":
      return { ...base, duplicateOf: "2026-0007" };
  }
}
