// Modèles de données des documents PDF. Aucun accès base : un document est une description complète,
// sérialisable, que n'importe quel habillage sait mettre en page. Les montants sont des FCFA entiers,
// jamais recalculés ici : ils viennent des enregistrements (voir le guide Hôtel §13.2).
import type { PdfImageSource } from "@/lib/object-storage";
import type { BrandColors } from "@/lib/brand-colors";

/** L'établissement qui émet le document. Rien n'est emprunté à SAMA HOME ni à un autre établissement. */
export type DocumentBrand = {
  name: string;
  address: string;
  phone: string;
  secondaryPhone?: string | null;
  email?: string | null;
  logo?: PdfImageSource | null;
  colors: BrandColors;
  /** Imprimés seulement s'ils sont renseignés (pas encore stockés : voir la recherche, §4). */
  ninea?: string | null;
  rccm?: string | null;
};

// ---------------------------------------------------------------------------------------------
// Contrats et quittances
// ---------------------------------------------------------------------------------------------

/** Hôtel : court séjour. Résidence : bail meublé de 3 ans reconductible, ou à durée indéterminée. */
export type ContractKind = "HOTEL_STAY" | "LEASE_3Y" | "LEASE_OPEN";

export type ContractTenant = {
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  nationality?: string | null;
  idType?: string | null;
  idNumber?: string | null;
};

export type ContractProperty = {
  name: string;
  /** « Chambre » ou « Appartement » : le libellé affiché. */
  typeLabel: string;
  description?: string | null;
};

export type ContractDoc = {
  kind: ContractKind;
  /** Numéro séquentiel d'archivage ; absent tant que le document n'est pas émis (aperçu). */
  number?: string | null;
  issuedAt: Date;
  brand: DocumentBrand;
  tenant: ContractTenant;
  property: ContractProperty;
  period: { start: Date; end?: Date | null };
  money: {
    /** Prix du séjour (hôtel) ou loyer mensuel (résidence). */
    amount: number;
    deposit: number;
    paid: number;
    remaining: number;
  };
  /** Règles propres à l'établissement, imprimées telles quelles. Jamais de règle imposée par défaut. */
  houseRules?: string[];
  /** Vrai pour un aperçu avec des données d'exemple : une mention « exemple » est imprimée. */
  sample?: boolean;
};

export type ContractArticle = { title: string; paragraphs: string[]; bullets?: string[] };

export type QuittanceDoc = {
  number?: string | null;
  issuedAt: Date;
  brand: DocumentBrand;
  tenant: { name: string; address?: string | null };
  property: ContractProperty;
  /** Période couverte par le paiement. */
  period: { start: Date; end: Date };
  rent: number;
  /** Charges payées avec le loyer, 0 si aucune. */
  charges: number;
  /** Somme réellement reçue. */
  received: number;
  method: PaymentMethodLabel;
  receivedAt: Date;
  reference?: string | null;
  /** Reste dû sur la période après ce paiement : > 0 → reçu pour paiement partiel, pas quittance. */
  remainingDue: number;
  sample?: boolean;
};

export type PaymentMethodLabel = "Espèces" | "Wave" | "Orange Money" | "Autre";

// ---------------------------------------------------------------------------------------------
// Tickets de caisse (hôtel)
// ---------------------------------------------------------------------------------------------

export type TicketKind =
  | "ARRHES"
  | "PAYMENT"
  | "BALANCE"
  | "DEPOSIT"
  | "DEPOSIT_REFUND"
  | "EXTRAS"
  | "STAY_SUMMARY"
  | "DUPLICATE";

export type TicketLine = { label: string; amount: number; quantity?: number };

export type TicketDoc = {
  kind: TicketKind;
  number?: string | null;
  issuedAt: Date;
  brand: DocumentBrand;
  cashier?: string | null;
  client?: string | null;
  property?: string | null;
  stay?: { arrival: Date; departure: Date } | null;
  lines: TicketLine[];
  /** Total du séjour ou de la note. */
  total: number;
  /** Montant encaissé (ou restitué) par CE ticket. */
  amount: number;
  method?: PaymentMethodLabel | null;
  reference?: string | null;
  /** Solde restant après ce ticket, s'il a un sens. */
  remaining?: number | null;
  /** TVA incluse dans le total, si l'établissement y est assujetti. */
  tax?: { rate: number; amount: number } | null;
  note?: string | null;
  /** Pour un duplicata : le numéro du ticket d'origine. */
  duplicateOf?: string | null;
  sample?: boolean;
};

/** 58 et 80 mm : papier thermique. A4 : le même ticket, en colonne, sur une page. */
export type TicketWidth = "58" | "80" | "a4";
