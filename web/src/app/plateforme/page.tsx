import { getPlatformDashboardSummary, type PlatformDashboardSummary } from "@/lib/platform-dashboard-data";

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-white/50">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-white">{value}</p>
    </div>
  );
}

/**
 * Phase 3G / Lot D12-P86 — tableau de bord de la console de plateforme.
 * `requirePlatformAdmin()` déjà appliquée par `src/app/plateforme/layout.tsx`
 * pour toute cette section ; `getPlatformDashboardSummary()` la re-vérifie
 * quand même (défense en profondeur déjà établie dans ce projet). Affiche
 * exclusivement des comptages réels (`prisma.*.count`) — aucun chiffre
 * inventé, aucun graphique fictif.
 */
export default async function PlatformDashboardPage() {
  let summary: PlatformDashboardSummary | null = null;
  let loadError: string | null = null;
  try {
    summary = await getPlatformDashboardSummary();
  } catch (error) {
    // D12-P172 — requirePlatformAdmin() (appelée par getPlatformDashboardSummary())
    // utilise redirect(), qui lève volontairement une exception interne
    // Next.js (digest "NEXT_REDIRECT") pour interrompre le rendu : ce n'est
    // jamais une vraie erreur de chargement, elle doit toujours être
    // relancée telle quelle pour que la redirection s'effectue réellement.
    if (error && typeof error === "object" && "digest" in error && typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("PlatformDashboardPage() — échec du chargement du résumé :", error);
    loadError = "Impossible de charger le tableau de bord pour le moment. Rechargez la page pour réessayer.";
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 pt-6 pb-10 md:px-8 lg:px-10">
      <h1 className="text-2xl font-extrabold text-white">Tableau de bord</h1>
      <p className="mt-1 text-xs font-medium text-white/50">
        Vue d&apos;ensemble de la plateforme — données réelles uniquement.
      </p>

      {loadError ? (
        <p className="mt-5 rounded-xl bg-danger-bg px-4 py-3 text-sm font-bold text-danger">{loadError}</p>
      ) : summary ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label="Établissements en attente" value={summary.pendingEstablishments} />
          <StatTile label="Établissements actifs" value={summary.activeEstablishments} />
          <StatTile label="Refusés / suspendus" value={summary.rejectedOrSuspendedEstablishments} />
          <StatTile label="Paiements en attente" value={summary.pendingPayments} />
          <StatTile label="Abonnements bientôt expirés (7 j)" value={summary.expiringSoonSubscriptions} />
        </div>
      ) : null}
    </div>
  );
}
