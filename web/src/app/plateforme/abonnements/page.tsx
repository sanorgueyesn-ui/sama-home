import Link from "next/link";
import {
  getPlatformSubscriptionsOverview,
  type PlatformSubscriptionsOverview,
  type PendingSubscriptionPaymentView,
} from "@/lib/subscription-data";
import { ConfirmPaymentButton } from "../confirm-payment-button";
import { SubscriptionsTable } from "./subscriptions-table";

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}
function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(d));
}

function PaymentRequestCard({ payment }: { payment: PendingSubscriptionPaymentView }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 transition-colors hover:border-amber-500/40">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-extrabold text-white">{payment.establishmentName}</p>
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
            En attente
          </span>
        </div>
        <p className="mt-1 text-xs text-white/60">
          Demande reçue le {fmtDate(payment.createdAt)}
        </p>
        <p className="mt-1 text-sm font-black text-brand-orange">
          {fmtFcfa(payment.amount)} <span className="text-xs font-normal text-white/50">/ {payment.periodMonths} mois</span>
        </p>
        <p className="mt-0.5 text-[11px] font-medium text-white/50">
          Référence transaction : <strong className="text-white/80">{payment.reference ?? "Non fournie"}</strong>
        </p>
      </div>
      <div className="shrink-0">
        <ConfirmPaymentButton paymentId={payment.id} establishmentName={payment.establishmentName} />
      </div>
    </div>
  );
}

export default async function PlatformSubscriptionPaymentsPage() {
  let overview: PlatformSubscriptionsOverview | null = null;
  let loadError: string | null = null;

  try {
    overview = await getPlatformSubscriptionsOverview();
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("PlatformSubscriptionPaymentsPage() — échec du chargement :", error);
    loadError = "Impossible de charger les données d'abonnement pour le moment. Rechargez la page pour réessayer.";
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 pt-6 pb-16 sm:px-6 md:px-8 lg:px-10">
      {/* En-tête de la page */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Abonnements & Règlements</h1>
          <p className="mt-1 text-xs font-medium text-white/50 sm:text-sm">
            Gestion globale des licences, renouvellements et historique financier SAMA HOME.
          </p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Link
            href="/plateforme/parametres"
            className="flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-center text-xs font-bold text-white transition-colors hover:bg-white/10 sm:flex-initial"
          >
            ⚙️ Modifier tarifs
          </Link>
          <Link
            href="/plateforme/etablissements"
            className="flex flex-1 items-center justify-center rounded-2xl bg-brand-orange px-3.5 py-2.5 text-center text-xs font-extrabold text-ink transition-transform hover:scale-[1.02] active:scale-[0.98] sm:flex-initial"
          >
            🏢 Établissements
          </Link>
        </div>
      </div>

      {loadError ? (
        <p className="mt-6 rounded-2xl bg-danger-bg px-4 py-3 text-sm font-bold text-danger">{loadError}</p>
      ) : overview ? (
        <>
          {/* Métriques & KPIs Clés */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Total Abonnés</span>
              <span className="mt-1.5 text-2xl font-black text-white">{overview.kpis.totalSubscriptions}</span>
              <span className="mt-1 text-[11px] text-white/40">Établissements avec licence</span>
            </div>

            <div className="flex flex-col rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Actifs Valides</span>
              <span className="mt-1.5 text-2xl font-black text-emerald-300">{overview.kpis.activeCount}</span>
              <span className="mt-1 text-[11px] text-white/40">Accès en cours</span>
            </div>

            <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Période d&apos;essai</span>
              <span className="mt-1.5 text-2xl font-black text-sky-300">{overview.kpis.trialCount}</span>
              <span className="mt-1 text-[11px] text-white/40">Essai gratuit actif</span>
            </div>

            <div className="flex flex-col rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Demandes en attente</span>
              <span className="mt-1.5 text-2xl font-black text-amber-300">{overview.kpis.pendingRequestsCount}</span>
              <span className="mt-1 text-[11px] text-white/40">À confirmer</span>
            </div>

            <div className="flex flex-col rounded-2xl border border-danger/20 bg-danger/5 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-danger">Expirés</span>
              <span className="mt-1.5 text-2xl font-black text-danger">{overview.kpis.expiredCount}</span>
              <span className="mt-1 text-[11px] text-white/40">À renouveler</span>
            </div>

            <div className="flex flex-col rounded-2xl border border-brand-orange/20 bg-brand-orange/5 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-orange">Total Encaissé</span>
              <span className="mt-1.5 text-xl font-black text-white">{fmtFcfa(overview.kpis.totalRevenueFcfa)}</span>
              <span className="mt-1 text-[11px] text-white/40">Abonnements confirmés</span>
            </div>
          </div>

          {/* Section 1 : Demandes de renouvellement en attente */}
          <div className="mt-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-white sm:text-lg">
                  Demandes de renouvellement reçues
                </h2>
                <p className="text-xs text-white/50">
                  Paiements envoyés par les gérants en attente de vérification et d&apos;activation
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  overview.pendingPayments.length > 0
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-white/10 text-white/50"
                }`}
              >
                {overview.pendingPayments.length} en attente
              </span>
            </div>

            <div className="mt-4">
              {overview.pendingPayments.length === 0 ? (
                <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-[#0e1a22] p-5 text-white/70">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-lg text-emerald-400">
                    ✓
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Toutes les demandes ont été traitées</p>
                    <p className="text-[11px] text-white/50">
                      Aucun paiement de renouvellement n&apos;est actuellement en attente d&apos;approbation.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {overview.pendingPayments.map((p) => (
                    <PaymentRequestCard key={p.id} payment={p} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 2 : Tableau & Suivi complet de tous les abonnements */}
          <div className="mt-10">
            <div className="border-b border-white/10 pb-3">
              <h2 className="text-base font-extrabold text-white sm:text-lg">
                Suivi de tous les établissements
              </h2>
              <p className="text-xs text-white/50">
                Consultez la validité de chaque hôtel ou résidence et prolongez directement en un clic.
              </p>
            </div>

            <div className="mt-4">
              <SubscriptionsTable establishments={overview.establishments} />
            </div>
          </div>

          {/* Section 3 : Historique des encaissements récents */}
          <div className="mt-10">
            <div className="border-b border-white/10 pb-3">
              <h2 className="text-base font-extrabold text-white sm:text-lg">
                Historique des règlements d&apos;abonnement
              </h2>
              <p className="text-xs text-white/50">
                20 derniers paiements enregistrés sur la plateforme
              </p>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-[#0e1a22]">
              {overview.recentPayments.length === 0 ? (
                <p className="p-6 text-center text-xs text-white/40">
                  Aucun paiement d&apos;abonnement n&apos;a encore été enregistré.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5 text-[11px] font-bold text-white/60">
                        <th className="p-3.5">Date</th>
                        <th className="p-3.5">Établissement</th>
                        <th className="p-3.5">Montant</th>
                        <th className="p-3.5">Période</th>
                        <th className="p-3.5">Statut</th>
                        <th className="p-3.5">Référence / Mode</th>
                        <th className="p-3.5">Confirmé par</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {overview.recentPayments.map((p) => (
                        <tr key={p.id} className="transition-colors hover:bg-white/5">
                          <td className="p-3.5 font-medium text-white/70">{fmtDate(p.createdAt)}</td>
                          <td className="p-3.5 font-bold text-white">{p.establishmentName}</td>
                          <td className="p-3.5 font-black text-brand-orange">{fmtFcfa(p.amount)}</td>
                          <td className="p-3.5 font-medium text-white/80">{p.periodMonths} mois</td>
                          <td className="p-3.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                p.status === "CONFIRMED"
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : p.status === "PENDING"
                                  ? "bg-amber-500/15 text-amber-300"
                                  : "bg-danger/15 text-danger"
                              }`}
                            >
                              {p.status === "CONFIRMED" ? "Confirmé" : p.status === "PENDING" ? "En attente" : p.status}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-white/60">
                            {p.reference ?? "—"}
                          </td>
                          <td className="p-3.5 text-white/50">{p.confirmedByName ?? "Système"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
