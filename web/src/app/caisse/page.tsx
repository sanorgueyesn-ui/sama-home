import Link from "next/link";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getCurrentCashSession, listCashSessions } from "@/lib/cash-data";
import { getCashSessionBreakdown, getCashSessionActivity } from "@/lib/cash-breakdown-data";
import { CashSessionStatusBadge } from "./cash-session-status-badge";
import { OpenCashSessionForm } from "./open-cash-session-form";
import { CloseCashSessionForm } from "./close-cash-session-form";
import { CreateCorrectionForm } from "./create-correction-form";
import { ModifyClosureForm } from "./modify-closure-form";
import { CashActivityList } from "./cash-activity-list";
import { MachineConnectedBadge, ExpenseIcon, WalletIcon } from "@/components/ui/icons";

function fmtFcfa(amount: number) {
  const sign = amount < 0 ? "-" : "";
  return `${sign}${Math.abs(amount).toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}
function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
function fmtDuration(ms: number) {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours === 0) return `${minutes} min`;
  return `${hours} h ${minutes} min`;
}

export default async function CaissePage() {
  const user = await getCurrentUser();
  const current = await getCurrentCashSession();

  if (!current) {
    const lastSessions = await listCashSessions(1);
    const last = lastSessions[0] ?? null;

    const userIds = last
      ? [last.openedByUserId, last.closedByUserId].filter((v): v is string => Boolean(v))
      : [];
    const users = userIds.length
      ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
      : [];
    const userName = (id: string | null) => (id ? (users.find((u) => u.id === id)?.name ?? "—") : "—");

    const hasPreviousSession = Boolean(last);
    let proposedBalance: number | null = null;
    let proposedOriginLabel: string | null = null;
    if (last) {
      if (last.physicalCount !== null) {
        proposedBalance = last.physicalCount;
        proposedOriginLabel = "Origine : dernier comptage physique.";
      } else {
        proposedBalance = last.closingTheoreticalBalance;
        proposedOriginLabel =
          "Origine : dernier solde théorique de clôture (aucun comptage physique n'avait été renseigné).";
      }
    }

    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pt-6 pb-24 md:max-w-none md:px-8 md:pb-10 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-fg">Caisse</h1>
          <div className="flex items-center gap-2">
            <MachineConnectedBadge />
            <CashSessionStatusBadge open={false} />
          </div>
        </div>

        <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
          {last ? (
            <Card className="mt-4 p-4">
              <p className="text-xs font-bold text-fg/50">DERNIÈRE SESSION</p>
              <p className="mt-1 text-sm font-semibold text-fg">
                {fmtDateTime(last.openedAt)} → {last.closedAt ? fmtDateTime(last.closedAt) : "—"}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div>
                  <p className="text-[11px] font-bold text-fg/40">SOLDE THÉORIQUE DE CLÔTURE</p>
                  <p className="text-sm font-extrabold text-fg">
                    {last.closingTheoreticalBalance !== null ? fmtFcfa(last.closingTheoreticalBalance) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-fg/40">COMPTAGE PHYSIQUE</p>
                  <p className="text-sm font-extrabold text-fg">
                    {last.physicalCount !== null ? fmtFcfa(last.physicalCount) : "Non renseigné"}
                  </p>
                </div>
              </div>
              {last.variance !== null ? (
                <div className="mt-3">
                  <p className="text-[11px] font-bold text-fg/40">ÉCART</p>
                  <p className={`text-sm font-extrabold ${last.variance === 0 ? "text-success" : "text-warning"}`}>
                    {last.variance === 0 ? "Aucun écart" : `${last.variance > 0 ? "+" : ""}${fmtFcfa(last.variance)}`}
                  </p>
                  {last.varianceReason ? <p className="mt-0.5 text-xs font-medium text-fg/50">{last.varianceReason}</p> : null}
                </div>
              ) : null}
              <p className="mt-3 text-xs font-medium text-fg/50">
                Fermée par {userName(last.closedByUserId)} le {last.closedAt ? fmtDateTime(last.closedAt) : "—"}.
              </p>

              {user.role === "ADMIN" && last.closedAt && last.closingTheoreticalBalance !== null ? (
                <div className="mt-3">
                  <ModifyClosureForm
                    sessionId={last.id}
                    currentPhysicalCount={last.physicalCount}
                    currentVarianceReason={last.varianceReason}
                    currentCloseNote={last.closeNote}
                    closingTheoreticalBalance={last.closingTheoreticalBalance}
                  />
                </div>
              ) : null}
            </Card>
          ) : (
            <p className="mt-4 text-sm font-medium text-fg/60">Aucune session de caisse n&apos;a encore été enregistrée.</p>
          )}

          <div className="mt-5">
            {user.role ? (
              <OpenCashSessionForm
                role={user.role}
                proposedBalance={proposedBalance}
                proposedOriginLabel={proposedOriginLabel}
                hasPreviousSession={hasPreviousSession}
              />
            ) : (
              <p className="rounded-xl bg-warning-bg px-4 py-3 text-sm font-medium text-warning">
                Votre compte n&apos;a pas de rôle d&apos;établissement — contactez un administrateur pour ouvrir la
                caisse.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const [breakdown, activity, openedByUser] = await Promise.all([
    getCashSessionBreakdown(current),
    getCashSessionActivity(current),
    prisma.user.findUnique({ where: { id: current.openedByUserId }, select: { name: true } }),
  ]);
  const durationMs = new Date().getTime() - current.openedAt.getTime();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pt-6 pb-24 md:max-w-none md:px-8 md:pb-10 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-fg">Caisse & Trésorerie</h1>
        <div className="flex items-center gap-2">
          <MachineConnectedBadge />
          <CashSessionStatusBadge open={true} />
        </div>
      </div>

      {/* Desktop (lg+) : colonne principale + "Activité récente" en colonne latérale */}
      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-6 mt-4">
        <div className="min-w-0">
          
          {/* Métadonnées de session */}
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <p className="text-[11px] font-bold text-fg/40">OUVERTE LE</p>
                <p className="text-sm font-bold text-fg">{fmtDateTime(current.openedAt)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-fg/40">OUVERTE PAR</p>
                <p className="text-sm font-bold text-fg">{openedByUser?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-fg/40">MONTANT D&apos;OUVERTURE</p>
                <p className="text-sm font-bold text-fg">
                  {fmtFcfa(current.openingBalance)}
                  {current.openingIsManual ? " (manuelle)" : ""}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-fg/40">DURÉE</p>
                <p className="text-sm font-bold text-fg">{fmtDuration(durationMs)}</p>
              </div>
            </div>
          </Card>

          {/* Cartes Clés du Solde Théorique & Recettes/Dépenses */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">Solde Caisse Actuel</p>
              <p className="mt-1 text-2xl font-black text-emerald-400">{fmtFcfa(breakdown.theoreticalBalance)}</p>
              <p className="mt-1 text-[10.5px] text-emerald-300/70">Total net disponible</p>
            </div>
            
            <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-sky-400">Encaissé Session</p>
              <p className="mt-1 text-2xl font-black text-sky-400">+{fmtFcfa(breakdown.totalIn)}</p>
              <p className="mt-1 text-[10.5px] text-sky-300/70">Wave, OM & Espèces</p>
            </div>

            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-rose-400">Dépensé Session</p>
              <p className="mt-1 text-2xl font-black text-rose-400">−{fmtFcfa(breakdown.totalOut)}</p>
              <p className="mt-1 text-[10.5px] text-rose-300/70">Achats & Frais</p>
            </div>
          </div>

          {/* Boutons d'Action Rapide Caisse */}
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link
              href="/depenses/new"
              className="flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2.5 text-xs font-black text-ink shadow-sm hover:brightness-110 active:scale-95 transition-all"
            >
              <ExpenseIcon className="h-4 w-4" />
              <span>+ Enregistrer une Dépense</span>
            </Link>

            <Link
              href="/locations/new"
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-surface-raised px-4 py-2.5 text-xs font-bold text-fg hover:bg-surface-sunken transition-colors"
            >
              <span>+ Nouvel Encaissement (Séjour)</span>
            </Link>

            <Link
              href="/caisse/virements"
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-surface-raised px-4 py-2.5 text-xs font-bold text-fg hover:bg-surface-sunken transition-colors"
            >
              <span>Virements bancaires</span>
            </Link>
          </div>

          {/* Décomposition rigoureuse du solde */}
          <h2 className="mt-6 text-sm font-extrabold text-fg">Décomposition détaillée du solde</h2>
          <Card className="mt-2 px-4 divide-y divide-border/10">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm font-semibold text-fg">Solde d&apos;ouverture</span>
              <span className="text-sm font-bold text-fg">{fmtFcfa(breakdown.openingBalance)}</span>
            </div>

            <div className="py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-fg">+ Total Encaissé (Paiements)</span>
                <span className="text-sm font-bold text-success">+{fmtFcfa(breakdown.totalIn)}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-fg/60">
                <span className="rounded bg-sky-500/10 px-2 py-0.5 text-sky-400 font-semibold border border-sky-500/20">
                  Wave : {fmtFcfa(breakdown.waveIn)}
                </span>
                <span className="rounded bg-orange-500/10 px-2 py-0.5 text-orange-400 font-semibold border border-orange-500/20">
                  Orange Money : {fmtFcfa(breakdown.omIn)}
                </span>
                <span className="rounded bg-amber-500/10 px-2 py-0.5 text-amber-300 font-semibold border border-amber-500/20">
                  Espèces : {fmtFcfa(breakdown.cashIn)}
                </span>
              </div>
            </div>

            <div className="py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-fg">− Total Dépensé (Sorties)</span>
                <span className="text-sm font-bold text-danger">−{fmtFcfa(breakdown.totalOut)}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-fg/60">
                <span className="rounded bg-sky-500/10 px-2 py-0.5 text-sky-400 font-semibold border border-sky-500/20">
                  Wave : {fmtFcfa(breakdown.waveOut)}
                </span>
                <span className="rounded bg-orange-500/10 px-2 py-0.5 text-orange-400 font-semibold border border-orange-500/20">
                  Orange Money : {fmtFcfa(breakdown.omOut)}
                </span>
                <span className="rounded bg-amber-500/10 px-2 py-0.5 text-amber-300 font-semibold border border-amber-500/20">
                  Espèces : {fmtFcfa(breakdown.cashOut)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm font-semibold text-fg">− Versements vers la banque</span>
              <span className="text-sm font-bold text-info">−{fmtFcfa(breakdown.transfersOut)}</span>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm font-semibold text-fg">± Ajustements / Apports</span>
              <span className={`text-sm font-bold ${breakdown.corrections >= 0 ? "text-success" : "text-danger"}`}>
                {breakdown.corrections >= 0 ? "+" : ""}
                {fmtFcfa(breakdown.corrections)}
              </span>
            </div>

            {/* Ligne spécifique Espèces physiques tiroir */}
            <div className="flex items-center justify-between py-2.5 bg-surface-sunken/40 -mx-4 px-4 rounded-b-xl border-t border-border/10">
              <div className="flex items-center gap-1.5">
                <WalletIcon className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-extrabold text-amber-300">Solde Espèces physique (Tiroir)</span>
              </div>
              <span className="text-xs font-black text-amber-300">{fmtFcfa(breakdown.physicalCashBalance)}</span>
            </div>
          </Card>

          <p className="mt-2.5 text-[11px] font-medium text-emerald-400/80 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Toutes vos recettes et dépenses (Espèces, Wave, Orange Money) sont automatiquement calculées et reliées en temps réel à votre caisse.
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            <CloseCashSessionForm theoreticalBalance={breakdown.theoreticalBalance} />
            {user.role === "ADMIN" ? <CreateCorrectionForm /> : null}
          </div>
        </div>

        {/* Colonne latérale : Activité récente */}
        <div className="mt-6 min-w-0 lg:mt-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-fg">Activité récente ({activity.length})</h2>
            <span className="text-[10px] text-fg/40 uppercase tracking-wider font-semibold">Temps réel</span>
          </div>
          <div className="mt-2.5">
            <CashActivityList entries={activity} />
          </div>
        </div>
      </div>
    </div>
  );
}
