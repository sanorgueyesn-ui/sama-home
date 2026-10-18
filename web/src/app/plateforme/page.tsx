import Link from "next/link";
import { getPlatformDashboardSummary } from "@/lib/platform-dashboard-data";
import { ACTION_LABELS } from "./historique/action-labels";
import type { PlatformDecisionAction } from "@/lib/audit-log-data";
import { COMPANY_LEGAL_INFO } from "@/lib/company-info";

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function fmtTime(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(d);
}

export default async function PlatformDashboardPage() {
  let summary = null;
  let loadError: string | null = null;

  try {
    summary = await getPlatformDashboardSummary();
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("PlatformDashboardPage() — échec du chargement :", error);
    loadError = "Impossible de charger le tableau de bord. Rechargez la page pour réessayer.";
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 pt-6 pb-16 sm:px-6 md:px-8 lg:px-10">
      {/* 1. En-tête exécutif & Carte Financière */}
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white sm:text-3xl">
                Tableau de bord
              </h1>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[10.5px] font-black text-emerald-400 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Opérationnel
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-white/60">
              COMPAGNIE GUEYE TAWFEKH • NINEA {COMPANY_LEGAL_INFO.ninea}
            </p>
          </div>
        </div>

        {/* Carte Financière Mobile & Desktop */}
        {summary && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand-orange/30 bg-gradient-to-r from-brand-orange/15 via-[#0e1a22] to-[#0e1a22] p-3.5 shadow-sm sm:p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-orange/20 text-xl text-brand-orange shadow-inner">
                💰
              </span>
              <div className="min-w-0">
                <p className="text-[10.5px] font-black uppercase tracking-wider text-white/60">
                  Revenus encaissés
                </p>
                <p className="text-xl font-black text-brand-orange sm:text-2xl">
                  {fmtFcfa(summary.totalRevenueFcfa)}
                </p>
              </div>
            </div>
            <Link
              href="/plateforme/abonnements"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-brand-orange/40 bg-brand-orange/10 px-3 py-1.5 text-xs font-black text-brand-orange transition-all hover:bg-brand-orange hover:text-ink active:scale-95"
            >
              <span>Détails</span>
              <span>→</span>
            </Link>
          </div>
        )}
      </div>

      {loadError ? (
        <p className="mt-6 rounded-2xl bg-danger-bg p-4 text-sm font-bold text-danger">{loadError}</p>
      ) : summary ? (
        <>
          {/* 2. Indicateurs de performance clés (Parfaitement équilibrés sur mobile) */}
          <div className="mt-6 sm:mt-8">
            <p className="text-[11px] font-black uppercase tracking-wider text-white/60">
              📊 Vue d&apos;ensemble plateforme
            </p>

            <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {/* Carte 1 : Établissements Actifs (Hero sur mobile pleine largeur, symétrique) */}
              <Link
                href="/plateforme/etablissements?status=ACTIVE"
                className="col-span-2 flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 transition-all hover:border-emerald-500/50 active:scale-[0.99] sm:col-span-1 sm:flex-col sm:items-stretch sm:justify-between sm:min-h-[110px] sm:p-4"
              >
                <div className="flex items-center gap-3 sm:justify-between">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                    🏢
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                        Établissements Actifs
                      </span>
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <p className="text-[11px] font-semibold text-white/60">En ligne & opérationnels</p>
                  </div>
                </div>
                <div className="text-right sm:mt-2 sm:text-left">
                  <span className="text-2xl font-black text-white sm:text-3xl">{summary.activeEstablishments}</span>
                </div>
              </Link>

              {/* Carte 2 : En attente */}
              <Link
                href="/plateforme/etablissements?status=PENDING"
                className={`flex min-h-[105px] flex-col justify-between rounded-2xl border p-3.5 transition-all active:scale-[0.98] sm:p-4 ${
                  summary.pendingEstablishments > 0
                    ? "border-amber-500/50 bg-amber-500/15 hover:border-amber-500/70"
                    : "border-white/10 bg-[#0e1a22] hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${
                    summary.pendingEstablishments > 0
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-white/10 text-white/70"
                  }`}>
                    En attente
                  </span>
                  {summary.pendingEstablishments > 0 ? (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400 animate-ping" />
                  ) : (
                    <span className="text-[11px] text-white/40">✓</span>
                  )}
                </div>
                <div>
                  <p className="my-1 text-2xl font-black text-white sm:text-3xl">{summary.pendingEstablishments}</p>
                  <p className="truncate text-[11px] font-bold text-white/70">Inscriptions</p>
                </div>
              </Link>

              {/* Carte 3 : Paiements */}
              <Link
                href="/plateforme/abonnements"
                className={`flex min-h-[105px] flex-col justify-between rounded-2xl border p-3.5 transition-all active:scale-[0.98] sm:p-4 ${
                  summary.pendingPayments > 0
                    ? "border-brand-orange/50 bg-brand-orange/15 hover:border-brand-orange/70"
                    : "border-white/10 bg-[#0e1a22] hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${
                    summary.pendingPayments > 0
                      ? "bg-brand-orange/20 text-brand-orange"
                      : "bg-white/10 text-white/70"
                  }`}>
                    Paiements
                  </span>
                  {summary.pendingPayments > 0 ? (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-brand-orange animate-pulse" />
                  ) : (
                    <span className="text-[11px] text-white/40">✓</span>
                  )}
                </div>
                <div>
                  <p className="my-1 text-2xl font-black text-brand-orange sm:text-3xl">{summary.pendingPayments}</p>
                  <p className="truncate text-[11px] font-bold text-white/70">À valider</p>
                </div>
              </Link>

              {/* Carte 4 : Expirations */}
              <Link
                href="/plateforme/abonnements"
                className="flex min-h-[105px] flex-col justify-between rounded-2xl border border-white/10 bg-[#0e1a22] p-3.5 transition-all hover:border-white/20 active:scale-[0.98] sm:p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-sky-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-sky-300">
                    Expirations
                  </span>
                  <span className="text-[11px] text-white/40">⏳</span>
                </div>
                <div>
                  <p className="my-1 text-2xl font-black text-white sm:text-3xl">{summary.expiringSoonSubscriptions}</p>
                  <p className="truncate text-[11px] font-bold text-white/70">Sous 7 jours</p>
                </div>
              </Link>

              {/* Carte 5 : Suspendus */}
              <Link
                href="/plateforme/etablissements?status=SUSPENDED"
                className="flex min-h-[105px] flex-col justify-between rounded-2xl border border-white/10 bg-[#0e1a22] p-3.5 transition-all hover:border-white/20 active:scale-[0.98] sm:p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-danger/20 px-2 py-0.5 text-[10px] font-black uppercase text-danger">
                    Suspendus
                  </span>
                  <span className="h-2 w-2 shrink-0 rounded-full bg-danger" />
                </div>
                <div>
                  <p className="my-1 text-2xl font-black text-white sm:text-3xl">{summary.rejectedOrSuspendedEstablishments}</p>
                  <p className="truncate text-[11px] font-bold text-white/70">Accès bloqués</p>
                </div>
              </Link>
            </div>
          </div>

          {/* 3. Barre des Raccourcis Rapides (Parfaitement alignée et tactile) */}
          <div className="mt-6 sm:mt-8">
            <p className="text-[11px] font-black uppercase tracking-wider text-white/60">
              ⚡ Raccourcis d&apos;actions rapides
            </p>

            <div className="mt-2.5 overflow-hidden rounded-3xl border border-white/10 bg-[#0e1a22] divide-y divide-white/5 sm:divide-y-0 sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:gap-3 sm:bg-transparent sm:border-0 sm:overflow-visible">
              {/* Établissements */}
              <Link
                href="/plateforme/etablissements"
                className="group flex items-center justify-between p-3.5 transition-all hover:bg-white/5 active:bg-white/10 sm:rounded-2xl sm:border sm:border-white/10 sm:bg-[#0e1a22] sm:p-4 sm:flex-col sm:items-stretch sm:justify-between sm:hover:border-brand-orange/50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-orange/15 text-brand-orange sm:h-9 sm:w-9">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                      <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white group-hover:text-brand-orange sm:text-xs">
                      Établissements
                    </p>
                    <p className="text-xs font-medium text-white/60 sm:text-[10.5px]">
                      Gérer, approuver, suspendre
                    </p>
                  </div>
                </div>
                <span className="text-sm font-black text-white/40 group-hover:text-brand-orange sm:hidden">→</span>
              </Link>

              {/* Abonnements */}
              <Link
                href="/plateforme/abonnements"
                className="group relative flex items-center justify-between p-3.5 transition-all hover:bg-white/5 active:bg-white/10 sm:rounded-2xl sm:border sm:border-white/10 sm:bg-[#0e1a22] sm:p-4 sm:flex-col sm:items-stretch sm:justify-between sm:hover:border-emerald-500/50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 sm:h-9 sm:w-9">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-white group-hover:text-emerald-400 sm:text-xs">
                        Abonnements
                      </p>
                      {summary.pendingPayments > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-orange text-[10px] font-black text-ink shadow-sm">
                          {summary.pendingPayments}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-white/60 sm:text-[10.5px]">
                      Paiements & renouvellements
                    </p>
                  </div>
                </div>
                <span className="text-sm font-black text-white/40 group-hover:text-emerald-400 sm:hidden">→</span>
              </Link>

              {/* Utilisateurs */}
              <Link
                href="/plateforme/utilisateurs"
                className="group flex items-center justify-between p-3.5 transition-all hover:bg-white/5 active:bg-white/10 sm:rounded-2xl sm:border sm:border-white/10 sm:bg-[#0e1a22] sm:p-4 sm:flex-col sm:items-stretch sm:justify-between sm:hover:border-sky-500/50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400 sm:h-9 sm:w-9">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white group-hover:text-sky-400 sm:text-xs">
                      Utilisateurs
                    </p>
                    <p className="text-xs font-medium text-white/60 sm:text-[10.5px]">
                      {summary.totalUsers} comptes enregistrés
                    </p>
                  </div>
                </div>
                <span className="text-sm font-black text-white/40 group-hover:text-sky-400 sm:hidden">→</span>
              </Link>

              {/* Paramètres */}
              <Link
                href="/plateforme/parametres"
                className="group flex items-center justify-between p-3.5 transition-all hover:bg-white/5 active:bg-white/10 sm:rounded-2xl sm:border sm:border-white/10 sm:bg-[#0e1a22] sm:p-4 sm:flex-col sm:items-stretch sm:justify-between sm:hover:border-purple-500/50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 sm:h-9 sm:w-9">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white group-hover:text-purple-400 sm:text-xs">
                      Paramètres
                    </p>
                    <p className="text-xs font-medium text-white/60 sm:text-[10.5px]">
                      Tarifs & configuration
                    </p>
                  </div>
                </div>
                <span className="text-sm font-black text-white/40 group-hover:text-purple-400 sm:hidden">→</span>
              </Link>

              {/* Historique */}
              <Link
                href="/plateforme/historique"
                className="group flex items-center justify-between p-3.5 transition-all hover:bg-white/5 active:bg-white/10 sm:rounded-2xl sm:border sm:border-white/10 sm:bg-[#0e1a22] sm:p-4 sm:flex-col sm:items-stretch sm:justify-between sm:hover:border-amber-500/50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 sm:h-9 sm:w-9">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 14 14" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white group-hover:text-amber-400 sm:text-xs">
                      Historique
                    </p>
                    <p className="text-xs font-medium text-white/60 sm:text-[10.5px]">
                      Journal des décisions
                    </p>
                  </div>
                </div>
                <span className="text-sm font-black text-white/40 group-hover:text-amber-400 sm:hidden">→</span>
              </Link>
            </div>
          </div>

          {/* 4. Flux opérationnel en 2 colonnes */}
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Colonne Gauche : Dernières inscriptions */}
            <div className="rounded-3xl border border-white/10 bg-[#0e1a22] p-4 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-white">Dernières inscriptions</h2>
                  <p className="text-[11px] text-white/50">Résidences récemment enregistrées</p>
                </div>
                <Link
                  href="/plateforme/etablissements"
                  className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-brand-orange hover:bg-white/10"
                >
                  Voir tous
                </Link>
              </div>

              <div className="mt-4 flex flex-col gap-2.5">
                {summary.recentEstablishments.length === 0 ? (
                  <p className="py-6 text-center text-xs text-white/40">Aucun établissement enregistré.</p>
                ) : (
                  summary.recentEstablishments.map((est) => (
                    <div
                      key={est.id}
                      className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-black text-white">{est.name}</p>
                          <span
                            className={`rounded-lg px-2.5 py-0.5 text-[10px] font-black ${
                              est.status === "ACTIVE"
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                : est.status === "PENDING"
                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                : "bg-danger/15 text-danger border border-danger/30"
                            }`}
                          >
                            {est.status === "ACTIVE" ? "Actif" : est.status === "PENDING" ? "En attente" : est.status}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs font-medium text-white/60">
                          {est.adminName ?? "—"} • {est.adminEmail ?? "Sans email"}
                        </p>
                      </div>

                      <div className="shrink-0 text-left sm:text-right">
                        <p className="text-[11px] font-bold text-white/50">{fmtDate(est.createdAt)}</p>
                        {est.currentPeriodEnd && (
                          <p className="mt-0.5 text-[11px] font-bold text-emerald-400">
                            Jusqu&apos;au {fmtDate(est.currentPeriodEnd)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Colonne Droite : Activité administrative récente */}
            <div className="rounded-3xl border border-white/10 bg-[#0e1a22] p-4 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-white">Journal d&apos;activité récent</h2>
                  <p className="text-[11px] text-white/50">Dernières actions & décisions administratives</p>
                </div>
                <Link
                  href="/plateforme/historique"
                  className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-brand-orange hover:bg-white/10"
                >
                  Historique complet
                </Link>
              </div>

              <div className="mt-4 flex flex-col gap-2.5">
                {summary.recentDecisions.length === 0 ? (
                  <p className="py-6 text-center text-xs text-white/40">Aucune activité récente enregistrée.</p>
                ) : (
                  summary.recentDecisions.map((decision) => {
                    const label = ACTION_LABELS[decision.action as PlatformDecisionAction] ?? decision.action;
                    return (
                      <div
                        key={decision.id}
                        className="flex flex-col gap-1.5 rounded-2xl border border-white/5 bg-white/5 p-3 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-black text-white">{label}</p>
                          <p className="mt-0.5 truncate text-[11px] text-white/60">
                            {decision.establishmentName ? `Établissement « ${decision.establishmentName} »` : "Plateforme globale"}
                          </p>
                          <p className="mt-0.5 text-[10px] text-white/40">
                            Par {decision.isSystemAction ? "Automatique (Système)" : decision.actorName ?? "Administrateur"}
                          </p>
                        </div>
                        <div className="shrink-0 text-left sm:text-right">
                          <p className="text-[10px] font-bold text-white/40">{fmtDate(decision.createdAt)}</p>
                          <p className="text-[10px] text-white/30">{fmtTime(decision.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
