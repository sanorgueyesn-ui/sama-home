/**
 * Grille de référence officielle des abonnements SaaS SAMA HOME (Registre maître).
 *
 * 3 Catégories distinctes :
 * 1. Hôtel (gestion des chambres d'hôtel)
 * 2. Chambre meublée / Résidence (chambres meublées et résidences)
 * 3. Agence immobilière (gestion des biens et annonces)
 *
 * Essai gratuit : 1 mois offert.
 * Annuel : 12 mois d'accès pour le prix de 11 mensualités (payé en une seule fois).
 */

export type EstablishmentCategory = "hotel" | "residence" | "agency";
export type PlanTier = "essential" | "pro" | "premium";
export type BillingCycle = "monthly" | "annual";

export interface PlanLimits {
  unitsLabel: string;
  unitsMax: string; // "10 chambres", "20 biens & 20 annonces", "Illimité"
  usersMax: string; // "3 utilisateurs", "10 utilisateurs", "Illimité"
}

export interface CategoryPlan {
  id: PlanTier;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceAnnual: number;
  isPopular?: boolean;
  limits: PlanLimits;
  features: string[];
}

export interface CategoryPricing {
  id: EstablishmentCategory;
  title: string;
  shortTitle: string;
  iconName: string;
  description: string;
  plans: CategoryPlan[];
}

export const TRIAL_MONTHS = 1;

export const CATEGORY_PRICING: Record<EstablishmentCategory, CategoryPricing> = {
  residence: {
    id: "residence",
    title: "Chambre meublée / Résidence",
    shortTitle: "Résidence & Meublé",
    iconName: "Home",
    description: "Conçu spécialement pour la gestion locative courte durée de résidences et chambres meublées.",
    plans: [
      {
        id: "essential",
        name: "Essentiel",
        tagline: "Pour démarrer la gestion d'une petite résidence meublée.",
        priceMonthly: 4950,
        priceAnnual: 54450,
        isPopular: false,
        limits: {
          unitsLabel: "Capacité chambres",
          unitsMax: "Jusqu'à 10 chambres",
          usersMax: "3 comptes utilisateurs",
        },
        features: [
          "Gestion jusqu'à 10 chambres meublées",
          "3 comptes collaborateurs inclus",
          "Planning & calendrier des réservations",
          "Suivi des entrées, sorties et séjours",
          "Journal de caisse & encaissements",
          "1 mois d'essai gratuit inclus",
        ],
      },
      {
        id: "pro",
        name: "Pro",
        tagline: "La formule idéale pour les résidences en pleine activité.",
        priceMonthly: 9950,
        priceAnnual: 109450,
        isPopular: true,
        limits: {
          unitsLabel: "Capacité chambres",
          unitsMax: "Jusqu'à 30 chambres",
          usersMax: "10 comptes utilisateurs",
        },
        features: [
          "Gestion jusqu'à 30 chambres meublées",
          "10 comptes collaborateurs inclus",
          "Gestion multi-tarifs (nuitée, passage, séjour)",
          "Rapports financiers & clôtures de caisse",
          "Gestion des prolongations & cautions",
          "Support prioritaire WhatsApp & Téléphone",
          "1 mois d'essai gratuit inclus",
        ],
      },
      {
        id: "premium",
        name: "Premium",
        tagline: "Pour les grands ensembles résidentiels et exploitants exigeants.",
        priceMonthly: 19950,
        priceAnnual: 219450,
        isPopular: false,
        limits: {
          unitsLabel: "Capacité chambres",
          unitsMax: "Chambres illimitées",
          usersMax: "Utilisateurs illimités",
        },
        features: [
          "Nombre de chambres meublées illimité",
          "Comptes utilisateurs illimités",
          "Tableaux de bord analytiques avancés",
          "Exportations comptables complètes",
          "Sauvegardes prioritaires dédiées",
          "Assistance personnalisée & onboarding",
          "1 mois d'essai gratuit inclus",
        ],
      },
    ],
  },
  hotel: {
    id: "hotel",
    title: "Hôtel",
    shortTitle: "Hôtel",
    iconName: "Bed",
    description: "Dédié à la gestion hôtelière : chambres, étages, arrivées/départs et facturation.",
    plans: [
      {
        id: "essential",
        name: "Essentiel",
        tagline: "Parfait pour les petits hôtels indépendants et auberges.",
        priceMonthly: 4950,
        priceAnnual: 54450,
        isPopular: false,
        limits: {
          unitsLabel: "Capacité chambres",
          unitsMax: "Jusqu'à 10 chambres",
          usersMax: "3 comptes utilisateurs",
        },
        features: [
          "Gestion jusqu'à 10 chambres d'hôtel",
          "3 comptes réceptionnistes & gérants",
          "Main courante & état des chambres",
          "Enregistrement immédiat des nuitées",
          "Reçus et pièces de paiement",
          "1 mois d'essai gratuit inclus",
        ],
      },
      {
        id: "pro",
        name: "Pro",
        tagline: "Le choix de référence pour les hôtels de taille moyenne.",
        priceMonthly: 9950,
        priceAnnual: 109450,
        isPopular: true,
        limits: {
          unitsLabel: "Capacité chambres",
          unitsMax: "Jusqu'à 30 chambres",
          usersMax: "10 comptes utilisateurs",
        },
        features: [
          "Gestion jusqu'à 30 chambres d'hôtel",
          "10 comptes réception & gouvernance",
          "Suivi des réservations en direct",
          "Gestion de caisse par shift / réception",
          "Rapports de taux d'occupation",
          "Support prioritaire WhatsApp & Téléphone",
          "1 mois d'essai gratuit inclus",
        ],
      },
      {
        id: "premium",
        name: "Premium",
        tagline: "Pour les grands complexes hôteliers sans aucune restriction.",
        priceMonthly: 19950,
        priceAnnual: 219450,
        isPopular: false,
        limits: {
          unitsLabel: "Capacité chambres",
          unitsMax: "Chambres illimitées",
          usersMax: "Utilisateurs illimités",
        },
        features: [
          "Nombre de chambres d'hôtel illimité",
          "Comptes utilisateurs illimités",
          "Suivi multi-services et prestations",
          "Audit logs & traçabilité complète",
          "Accompagnement VIP dédié",
          "1 mois d'essai gratuit inclus",
        ],
      },
    ],
  },
  agency: {
    id: "agency",
    title: "Agence immobilière",
    shortTitle: "Agence",
    iconName: "Building",
    description: "Gestion des portefeuilles de biens sous gestion locative et des annonces actives.",
    plans: [
      {
        id: "essential",
        name: "Essentiel",
        tagline: "Pour les agents indépendants et petits cabinets de gestion.",
        priceMonthly: 9950,
        priceAnnual: 109450,
        isPopular: false,
        limits: {
          unitsLabel: "Biens & Annonces",
          unitsMax: "20 biens gérés / 20 annonces",
          usersMax: "3 comptes collaborateurs",
        },
        features: [
          "Jusqu'à 20 biens sous gestion",
          "Jusqu'à 20 annonces actives publiées",
          "3 comptes négociateurs / gestionnaires",
          "Dossiers locataires & propriétaires",
          "Émission des quittances & suivi loyers",
          "1 mois d'essai gratuit inclus",
        ],
      },
      {
        id: "pro",
        name: "Pro",
        tagline: "La solution robuste pour les agences immobilières en développement.",
        priceMonthly: 24950,
        priceAnnual: 274450,
        isPopular: true,
        limits: {
          unitsLabel: "Biens & Annonces",
          unitsMax: "100 biens gérés / 100 annonces",
          usersMax: "10 comptes collaborateurs",
        },
        features: [
          "Jusqu'à 100 biens sous gestion",
          "Jusqu'à 100 annonces actives publiées",
          "10 comptes négociateurs & comptabilité",
          "Suivi des encaissements & reversements bailleurs",
          "Alertes impayés et renouvellements baux",
          "Support prioritaire dédié",
          "1 mois d'essai gratuit inclus",
        ],
      },
      {
        id: "premium",
        name: "Premium",
        tagline: "Capacité illimitée pour les grands cabinets et réseaux d'agences.",
        priceMonthly: 49950,
        priceAnnual: 549450,
        isPopular: false,
        limits: {
          unitsLabel: "Biens & Annonces",
          unitsMax: "Biens & Annonces illimités",
          usersMax: "Collaborateurs illimités",
        },
        features: [
          "Portefeuille de biens illimité",
          "Annonces actives illimitées",
          "Collaborateurs & gestionnaires illimités",
          "Gestion des mandats et commissions",
          "Exports comptables avancés",
          "Gestionnaire de compte dédié",
          "1 mois d'essai gratuit inclus",
        ],
      },
    ],
  },
};

export type CurrencyCode = "XOF" | "EUR" | "USD";

export interface CurrencyConfig {
  code: CurrencyCode;
  label: string;
  symbol: string;
  rateFromXof: number;
}

export const EXCHANGE_RATES = {
  EUR_PER_XOF: 1 / 655.957, // Parité officielle BCEAO (1 EUR = 655.957 FCFA)
  USD_PER_XOF: 1 / 600,     // Taux indicatif de référence (1 USD = 600 FCFA)
};

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  XOF: {
    code: "XOF",
    label: "Franc CFA (FCFA)",
    symbol: "FCFA",
    rateFromXof: 1,
  },
  EUR: {
    code: "EUR",
    label: "Euro (€)",
    symbol: "€",
    rateFromXof: EXCHANGE_RATES.EUR_PER_XOF,
  },
  USD: {
    code: "USD",
    label: "Dollar américain ($)",
    symbol: "$",
    rateFromXof: EXCHANGE_RATES.USD_PER_XOF,
  },
};

/**
 * Convertit et formate un montant FCFA vers la devise sélectionnée.
 * Arrondi propre au nombre entier pour les devises étrangères.
 */
export function formatCurrencyPrice(amountFcfa: number, currency: CurrencyCode = "XOF"): {
  formattedNumber: string;
  unit: string;
  fullDisplay: string;
} {
  if (currency === "EUR") {
    const converted = Math.round(amountFcfa * EXCHANGE_RATES.EUR_PER_XOF);
    const num = converted.toLocaleString("fr-FR");
    return { formattedNumber: num, unit: "€", fullDisplay: `${num} €` };
  }
  if (currency === "USD") {
    const converted = Math.round(amountFcfa * EXCHANGE_RATES.USD_PER_XOF);
    const num = converted.toLocaleString("en-US");
    return { formattedNumber: `$${num}`, unit: "", fullDisplay: `$${num}` };
  }
  const num = amountFcfa.toLocaleString("fr-FR");
  return { formattedNumber: num, unit: "FCFA", fullDisplay: `${num} FCFA` };
}

/**
 * Calcule les équivalents indicatifs en Euros et Dollars pour un montant FCFA donné.
 */
export function getPriceEquivalents(amountFcfa: number): {
  fcfaFormatted: string;
  eurFormatted: string;
  usdFormatted: string;
  displayLine: string;
} {
  const fcfaFormatted = amountFcfa.toLocaleString("fr-FR");
  let eurFormatted: string;
  if (amountFcfa === 4950) {
    eurFormatted = "7,50 €";
  } else {
    eurFormatted = `${Math.round(amountFcfa / 655.957).toLocaleString("fr-FR")} €`;
  }
  const usdFormatted = `${Math.round(amountFcfa / 600).toLocaleString("en-US")} $`;

  return {
    fcfaFormatted,
    eurFormatted,
    usdFormatted,
    displayLine: `≈ ${eurFormatted} · ≈ ${usdFormatted}`,
  };
}
