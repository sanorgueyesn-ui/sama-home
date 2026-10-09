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

/**
 * Bloc E — page `/caisse`. Lecture ouverte à ADMIN et GESTIONNAIRE (Bloc
 * 17.2 section 3.1), même garde que `getCurrentCashSession()`
 * (`verifySession()`). Les actions sensibles (ouverture manuelle,
 * correction, modification de clôture) ne sont affichées qu'à ADMIN
 * côté UI — les Server Actions correspondantes (Bloc 17.2, gelées,
 * non modifiées) revérifient le rôle de toute façon.
 */
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
        <h1 className="text-2xl font-extrabold text-fg">Caisse</h1>
        <div className="mt-3">
          <CashSessionStatusBadge open={false} />
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
            <OpenCashSessionForm
              role={user.role}
              proposedBalance={proposedBalance}
              proposedOriginLabel={proposedOriginLabel}
              hasPreviousSession={hasPreviousSession}
            />
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-fg">Caisse</h1>
        <CashSessionStatusBadge open={true} />
      </div>

      {/* Desktop (lg+) : colonne principale + "Activité récente" en
          colonne latérale, même pattern que l'Accueil
          (lg:grid-cols-[1fr_320px]) — mobile/tablette gardent l'ordre
          d'empilement d'origine, inchangé, jusqu'à lg. */}
      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-6">
        <div className="min-w-0">
          <Card className="mt-4 p-4">
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

          <div className="mt-4 rounded-2xl bg-success-bg px-5 py-4">
            <p className="text-xs font-bold text-success">SOLDE THÉORIQUE ACTUEL</p>
            <p className="mt-1 text-2xl font-extrabold text-success">{fmtFcfa(breakdown.theoreticalBalance)}</p>
          </div>

          {/* Bloc E, section 7/8 — décomposition construite depuis les services
              existants (computeTheoreticalBalance, exposé en détail par
              getCashSessionBreakdown, src/lib/cash-breakdown-data.ts), aucune
              logique de calcul recréée ici. Les versements bancaires restent
              une ligne distincte des dépenses — jamais confondus. */}
          <h2 className="mt-5 text-sm font-extrabold text-fg">Décomposition du solde</h2>
          <Card className="mt-2 px-4">
            <div className="flex items-center justify-between border-b border-border/10 py-2.5">
              <span className="text-sm font-semibold text-fg">Solde d&apos;ouverture</span>
              <span className="text-sm font-bold text-fg">{fmtFcfa(breakdown.openingBalance)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/10 py-2.5">
              <span className="text-sm font-semibold text-fg">+ Entrées CASH (paiements)</span>
              <span className="text-sm font-bold text-success">+{fmtFcfa(breakdown.cashIn)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/10 py-2.5">
              <span className="text-sm font-semibold text-fg">− Dépenses CASH</span>
              <span className="text-sm font-bold text-danger">−{fmtFcfa(breakdown.cashOut)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/10 py-2.5">
              <span className="text-sm font-semibold text-fg">− Versements vers la banque</span>
              <span className="text-sm font-bold text-info">−{fmtFcfa(breakdown.transfersOut)}</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm font-semibold text-fg">± Corrections</span>
              <span className={`text-sm font-bold ${breakdown.corrections >= 0 ? "text-success" : "text-danger"}`}>
                {breakdown.corrections >= 0 ? "+" : ""}
                {fmtFcfa(breakdown.corrections)}
              </span>
            </div>
          </Card>
          <p className="mt-2 text-[11px] font-medium text-fg/40">
            Le chiffre d&apos;affaires et les dépenses de l&apos;activité (tableau de bord) restent distincts de ce solde
            physique. Un versement bancaire n&apos;est jamais une dépense.
          </p>

          {/* Bloc G — intégration différée au Bloc E (section 15 de l'époque :
              "préparer uniquement l'intégration UI nécessaire"), câblée
              maintenant que /caisse/virements existe réellement. */}
          <Link
            href="/caisse/virements"
            className="mt-3 flex h-12 items-center justify-center rounded-xl border border-border/15 text-sm font-extrabold text-fg"
          >
            Virements bancaires
          </Link>

          <div className="mt-5 flex flex-col gap-2.5">
            <CloseCashSessionForm theoreticalBalance={breakdown.theoreticalBalance} />
            {user.role === "ADMIN" ? <CreateCorrectionForm /> : null}
          </div>
        </div>

        <div className="mt-5 min-w-0 lg:mt-4">
          <h2 className="text-sm font-extrabold text-fg">Activité récente</h2>
          <div className="mt-2">
            <CashActivityList entries={activity} />
          </div>
        </div>
      </div>
    </div>
  );
}
