import { getPlatformSettings, getPricingSettings } from "@/lib/platform-settings-data";
import { AutoApprovalToggle } from "../auto-approval-toggle";
import { PricingSettingsForm } from "../pricing-settings-form";

/**
 * Phase 3G / Lot D12-P88 — première page réelle de "Tarification et
 * paramètres globaux" (jusqu'ici "Bientôt").
 * Phase 3G / Lot D12-P103 — ajout de la section tarifaire
 * (`PricingSettings`), chargée séparément du réglage d'approbation
 * automatique (deux lectures indépendantes, jamais fusionnées — mêmes
 * tables conceptuellement distinctes, voir platform-settings-data.ts).
 * `AutoApprovalToggle` reste strictement inchangé.
 */
export default async function PlatformSettingsPage() {
  let autoApproveEstablishments = false;
  let pricing: { trialDurationMonths: number; periodMonths: number; periodPriceFcfa: number } | null = null;
  let loadError: string | null = null;
  try {
    const [platformSettings, pricingSettings] = await Promise.all([getPlatformSettings(), getPricingSettings()]);
    autoApproveEstablishments = platformSettings.autoApproveEstablishments;
    pricing = pricingSettings;
  } catch (error) {
    // D12-P172 — même correction que PlatformDashboardPage() : ne jamais
    // avaler le signal interne redirect() de Next.js (digest "NEXT_REDIRECT").
    if (error && typeof error === "object" && "digest" in error && typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("PlatformSettingsPage() — échec du chargement des réglages :", error);
    loadError = "Impossible de charger les réglages pour le moment. Rechargez la page pour réessayer.";
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pt-6 pb-10 md:max-w-none md:px-8 lg:px-10">
      <h1 className="text-2xl font-extrabold text-white">Paramètres globaux</h1>
      <p className="mt-1 text-xs font-medium text-white/50">
        Réglages à l&apos;échelle de toute la plateforme.
      </p>

      {loadError ? (
        <p className="mt-5 rounded-xl bg-danger-bg px-4 py-3 text-sm font-bold text-danger">{loadError}</p>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          <AutoApprovalToggle initialEnabled={autoApproveEstablishments} />
          {pricing ? (
            <PricingSettingsForm
              initialTrialDurationMonths={pricing.trialDurationMonths}
              initialPeriodMonths={pricing.periodMonths}
              initialPeriodPriceFcfa={pricing.periodPriceFcfa}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
