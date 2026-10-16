"use server";

import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/dal";
import { PricingSettingsSchema, type PricingSettingsFormState } from "@/lib/definitions";
import { DEFAULT_TRIAL_DURATION_MONTHS, DEFAULT_PERIOD_MONTHS, DEFAULT_PERIOD_PRICE_FCFA } from "@/lib/subscription-data";

/**
 * Phase 3G / Lot D12-P88 — bascule du mode d'approbation automatique des
 * inscriptions. Autorisation stricte via `requirePlatformAdmin()` — seul un
 * administrateur de PLATEFORME peut modifier ce réglage, jamais un
 * `role === "ADMIN"` d'établissement. Le seul paramètre reçu du client est
 * `enabled` (un booléen) — aucune autre valeur d'autorité (identité de
 * l'auteur, horodatage) n'est jamais acceptée depuis l'appelant.
 *
 * Écriture inutile évitée : si la valeur demandée est déjà la valeur
 * actuelle, rien n'est écrit ni journalisé — lu et comparé à l'intérieur de
 * la même transaction que l'écriture éventuelle, jamais une lecture mise en
 * cache séparément.
 *
 * Traçabilité : `AuditLog` avec l'identité RÉELLE de l'administrateur de
 * plateforme qui bascule le réglage (jamais `null` ici — contrairement à
 * `ESTABLISHMENT_AUTO_APPROVED`, cette action est toujours déclenchée par un
 * humain authentifié réel).
 *
 * Basculer ce réglage ne modifie JAMAIS un établissement déjà existant —
 * cette fonction n'écrit que `PlatformSettings`, jamais `Establishment` ni
 * `Subscription`.
 */
export async function setAutoApprovalEnabled(enabled: boolean): Promise<{ error?: string }> {
  const user = await requirePlatformAdmin();

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.platformSettings.findUnique({ where: { id: "singleton" } });
      const currentValue = existing?.autoApproveEstablishments ?? false;

      if (currentValue === enabled) {
        // Valeur inchangée — aucune écriture, aucun journal, par conception.
        return;
      }

      await tx.platformSettings.upsert({
        where: { id: "singleton" },
        create: { id: "singleton", autoApproveEstablishments: enabled },
        update: { autoApproveEstablishments: enabled },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: enabled ? "PLATFORM_AUTO_APPROVAL_ENABLED" : "PLATFORM_AUTO_APPROVAL_DISABLED",
          entityType: "PlatformSettings",
          entityId: "singleton",
          reason: null,
          oldValue: { autoApproveEstablishments: currentValue },
          newValue: { autoApproveEstablishments: enabled },
          establishmentId: null,
        },
      });
    });
  } catch (error) {
    console.error("setAutoApprovalEnabled() — échec inattendu de la mise à jour du réglage :", error);
    return { error: "Une erreur est survenue pendant la mise à jour du réglage. Veuillez réessayer." };
  }

  return {};
}

/**
 * Phase 3G / Lot D12-P103 — modification des réglages tarifaires globaux
 * (`PricingSettings`), SÉPARÉE de setAutoApprovalEnabled() ci-dessus (deux
 * tables distinctes, jamais mélangées — voir le commentaire de
 * getPricingSettings(), src/lib/platform-settings-data.ts). Autorisation
 * stricte via `requirePlatformAdmin()`, dès la première ligne exécutable.
 *
 * Validation côté serveur avec `PricingSettingsSchema` (bornes retenues pour
 * ce lot : 1-12 mois, 500-1 000 000 FCFA) — jamais uniquement la validation
 * côté interface, qui reste un confort, jamais l'autorité.
 *
 * Écriture inutile évitée : si les 3 valeurs demandées sont STRICTEMENT
 * identiques aux valeurs actuelles, rien n'est écrit ni journalisé — lu et
 * comparé à l'intérieur de la même transaction que l'écriture éventuelle,
 * même principe que setAutoApprovalEnabled().
 *
 * Traçabilité : `AuditLog` avec l'identité RÉELLE de l'administrateur de
 * plateforme qui modifie le tarif — JAMAIS `userId: null` ici (contrairement
 * à `ESTABLISHMENT_AUTO_APPROVED`) : cette action est toujours déclenchée
 * par un humain authentifié réel, jamais par le système lui-même.
 *
 * Ne modifie JAMAIS un `Subscription` ou un `SubscriptionPayment` déjà
 * créé — cette fonction n'écrit que `PricingSettings` ; voir l'audit D12-P102
 * confirmant que `createSubscriptionPaymentRequest()`/
 * `createTrialSubscriptionAndAudit()` gèlent déjà leurs valeurs au moment de
 * leur propre création, sans jamais relire `PricingSettings` après coup.
 */
export async function setPricingSettings(
  _prevState: PricingSettingsFormState,
  formData: FormData,
): Promise<PricingSettingsFormState> {
  const user = await requirePlatformAdmin();

  const parsed = PricingSettingsSchema.safeParse({
    trialDurationMonths: Number(formData.get("trialDurationMonths")),
    periodMonths: Number(formData.get("periodMonths")),
    periodPriceFcfa: Number(formData.get("periodPriceFcfa")),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { trialDurationMonths, periodMonths, periodPriceFcfa } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.pricingSettings.findUnique({ where: { id: "singleton" } });
      const currentValue = {
        trialDurationMonths: existing?.trialDurationMonths ?? DEFAULT_TRIAL_DURATION_MONTHS,
        periodMonths: existing?.periodMonths ?? DEFAULT_PERIOD_MONTHS,
        periodPriceFcfa: existing?.periodPriceFcfa ?? DEFAULT_PERIOD_PRICE_FCFA,
      };

      if (
        currentValue.trialDurationMonths === trialDurationMonths &&
        currentValue.periodMonths === periodMonths &&
        currentValue.periodPriceFcfa === periodPriceFcfa
      ) {
        // Valeurs inchangées — aucune écriture, aucun journal, par conception.
        return;
      }

      await tx.pricingSettings.upsert({
        where: { id: "singleton" },
        create: { id: "singleton", trialDurationMonths, periodMonths, periodPriceFcfa },
        update: { trialDurationMonths, periodMonths, periodPriceFcfa },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "PRICING_SETTINGS_UPDATED",
          entityType: "PricingSettings",
          entityId: "singleton",
          reason: null,
          oldValue: currentValue,
          newValue: { trialDurationMonths, periodMonths, periodPriceFcfa },
          establishmentId: null,
        },
      });
    });
  } catch (error) {
    console.error("setPricingSettings() — échec inattendu de la mise à jour des réglages tarifaires :", error);
    return { message: "Une erreur est survenue pendant la mise à jour des réglages. Veuillez réessayer." };
  }

  return { success: true };
}
