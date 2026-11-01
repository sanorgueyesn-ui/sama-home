import "server-only";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/dal";
import { DEFAULT_TRIAL_DURATION_MONTHS, DEFAULT_PERIOD_MONTHS, DEFAULT_PERIOD_PRICE_FCFA } from "@/lib/subscription-data";

export type PlatformSettingsView = {
  autoApproveEstablishments: boolean;
};

/**
 * Phase 3G / Lot D12-P88 — lecture du réglage global d'approbation
 * automatique. Re-garde elle-même via requirePlatformAdmin() (même défense
 * en profondeur que les autres lectures de la console). Absence de ligne
 * `PlatformSettings` (avant toute première écriture) traitée comme le mode
 * manuel par défaut — jamais une erreur, jamais une valeur devinée.
 */
export async function getPlatformSettings(): Promise<PlatformSettingsView> {
  await requirePlatformAdmin();

  const settings = await prisma.platformSettings.findUnique({ where: { id: "singleton" } });
  return { autoApproveEstablishments: settings?.autoApproveEstablishments ?? false };
}

export type PricingSettingsView = {
  trialDurationMonths: number;
  periodMonths: number;
  periodPriceFcfa: number;
  /**
   * Vrai UNIQUEMENT si une ligne `PricingSettings` existe réellement en base.
   * Faux : les valeurs ci-dessus sont les valeurs de repli du système
   * (src/lib/pricing-defaults.ts), jamais une tarification enregistrée.
   */
  isConfigured: boolean;
};

type PricingRow = { trialDurationMonths: number; periodMonths: number; periodPriceFcfa: number };

/**
 * Transforme la ligne lue en base (ou son absence) en vue de tarification, en
 * distinguant explicitement une ligne présente de valeurs de repli. Pure : aucune
 * lecture ni écriture.
 */
export function resolvePricingView(row: PricingRow | null): PricingSettingsView {
  return {
    trialDurationMonths: row?.trialDurationMonths ?? DEFAULT_TRIAL_DURATION_MONTHS,
    periodMonths: row?.periodMonths ?? DEFAULT_PERIOD_MONTHS,
    periodPriceFcfa: row?.periodPriceFcfa ?? DEFAULT_PERIOD_PRICE_FCFA,
    isConfigured: row !== null,
  };
}

/**
 * Phase 3G / Lot D12-P103 — lecture des réglages tarifaires globaux
 * (`PricingSettings`), volontairement SÉPARÉE de getPlatformSettings()
 * ci-dessus : deux tables conceptuellement distinctes (voir le commentaire
 * du modèle `PlatformSettings`, schema.prisma — "mélanger un réglage de
 * workflow dans une table nommée Pricing aurait été trompeur"), jamais
 * fusionnées dans une même fonction. Re-garde elle-même via
 * requirePlatformAdmin(). Absence de ligne `PricingSettings` (avant toute
 * première écriture) traitée avec les mêmes valeurs par défaut déjà
 * utilisées partout ailleurs dans le projet (DEFAULT_TRIAL_DURATION_MONTHS/
 * DEFAULT_PERIOD_MONTHS/DEFAULT_PERIOD_PRICE_FCFA, src/lib/subscription-data.ts)
 * — jamais une valeur inventée séparément ici.
 */
export async function getPricingSettings(): Promise<PricingSettingsView> {
  await requirePlatformAdmin();
  return getPublicPricingSettings();
}

/**
 * Lecture publique des réglages tarifaires globaux (`PricingSettings`) pour
 * la page d'inscription et l'affichage des offres — ne nécessite pas de
 * session administrateur de plateforme.
 */
export async function getPublicPricingSettings(): Promise<PricingSettingsView> {
  const settings = await prisma.pricingSettings.findUnique({ where: { id: "singleton" } });
  return resolvePricingView(settings);
}
