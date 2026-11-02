/**
 * Valeurs de repli de la tarification — module PUR (aucun accès base, aucun
 * `server-only`), importable aussi par les composants client.
 *
 * Elles ne sont utilisées QUE si aucune ligne `PricingSettings` n'existe encore
 * en base. Ce sont, caractère pour caractère, les `@default(...)` du modèle
 * `PricingSettings` (schema.prisma : trialDurationMonths 2, periodMonths 3,
 * periodPriceFcfa 9900). Leur validité commerciale n'est pas établie par ce
 * code : elles ne remplacent pas une décision de tarification.
 *
 * Définies ici (et réexportées par src/lib/subscription-data.ts) pour qu'une
 * seule source existe, sans changer aucune valeur.
 */
export const DEFAULT_TRIAL_DURATION_MONTHS = 1; // règle confirmée : 1 mois d'essai gratuit (comme la grille et la page d'accueil)
export const DEFAULT_PERIOD_MONTHS = 3;
export const DEFAULT_PERIOD_PRICE_FCFA = 9900;
