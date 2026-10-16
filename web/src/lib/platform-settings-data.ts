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
};

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

  const settings = await prisma.pricingSettings.findUnique({ where: { id: "singleton" } });
  return {
    trialDurationMonths: settings?.trialDurationMonths ?? DEFAULT_TRIAL_DURATION_MONTHS,
    periodMonths: settings?.periodMonths ?? DEFAULT_PERIOD_MONTHS,
    periodPriceFcfa: settings?.periodPriceFcfa ?? DEFAULT_PERIOD_PRICE_FCFA,
  };
}
