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
import { MachineConnectedBadge } from "@/components/ui/icons";
import { PageHeader, PageShell, StatTile, Surface, SectionTitle } from "@/components/ui/page-kit";
import { getActiveSpace } from "@/lib/active-mode";

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
      <div className="mx-auto flex min-h-dvh w-full max-w-[1360px] flex-col px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-app-text sm:text-2xl lg:text-[28px]">Caisse</h1>
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
  const space = await getActiveSpace();

  // Détail par moyen de paiement : une ligne par moyen réellement utilisé (« Autre » seulement s'il y en a).
  const methodRows = [
    { key: "cash", label: "Espèces (tiroir)", in: breakdown.cashIn, out: breakdown.cashOut },
    { key: "wave", label: "Wave", in: breakdown.waveIn, out: breakdown.waveOut },
    { key: "om", label: "Orange Money", in: breakdown.omIn, out: breakdown.omOut },
    ...(breakdown.otherIn + breakdown.otherOut > 0 ? [{ key: "other", label: "Autre", in: breakdown.otherIn, out: breakdown.otherOut }] : []),
  ];
  const num = (n: number) => n.toLocaleString("fr-FR").replace(/\s|,/g, " ");
  const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${num(Math.abs(n))}`;

  return (
    <PageShell>
      <PageHeader
        eyebrow={space.name}
        title="Caisse"
        subtitle={`Ouverte le ${fmtDateTime(current.openedAt)} par ${openedByUser?.name ?? "—"} · ${fmtDuration(durationMs)}`}
        badge={<CashSessionStatusBadge open={true} />}
        actions={[
          { href: "/depenses/new", label: "+ Dépense" },
          { href: "/caisse/virements", label: "Virements" },
        ]}
      />

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
        <StatTile label="Solde théorique" value={fmtFcfa(breakdown.theoreticalBalance)} sub="Espèces + Wave + Orange Money" tone="good" />
        <StatTile label="Encaissé" value={`+${fmtFcfa(breakdown.totalIn)}`} sub="Depuis l'ouverture" />
        <StatTile label="Dépensé" value={`−${fmtFcfa(breakdown.totalOut)}`} sub="Achats et frais" tone={breakdown.totalOut > 0 ? "bad" : "default"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-start lg:gap-6">
        <div className="flex min-w-0 flex-col gap-5">
          <Surface title="Par moyen de paiement" subtitle="Montants en FCFA">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[20rem] text-sm">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wide text-app-muted">
                    <th scope="col" className="pb-2 text-left font-bold">Moyen</th>
                    <th scope="col" className="pb-2 text-right font-bold">Encaissé</th>
                    <th scope="col" className="pb-2 text-right font-bold">Dépensé</th>
                    <th scope="col" className="pb-2 text-right font-bold">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-line">
                  {methodRows.map((row) => (
                    <tr key={row.key}>
                      <th scope="row" className="py-2.5 text-left font-semibold text-app-text-2">{row.label}</th>
                      <td className="py-2.5 text-right tabular-nums text-app-text-2">{num(row.in)}</td>
                      <td className="py-2.5 text-right tabular-nums text-app-text-2">{num(row.out)}</td>
                      <td className="py-2.5 text-right font-bold tabular-nums text-app-text">{signed(row.in - row.out)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-app-line-strong">
                    <th scope="row" className="pt-3 text-left font-extrabold text-app-text">Total</th>
                    <td className="pt-3 text-right font-bold tabular-nums text-app-text">{num(breakdown.totalIn)}</td>
                    <td className="pt-3 text-right font-bold tabular-nums text-app-text">{num(breakdown.totalOut)}</td>
                    <td className="pt-3 text-right font-extrabold tabular-nums text-app-text">{signed(breakdown.totalIn - breakdown.totalOut)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Surface>

          <Surface title="Du solde d'ouverture au solde théorique">
            <dl className="divide-y divide-app-line text-sm">
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-app-muted">Solde d&apos;ouverture{current.openingIsManual ? " (saisi à la main)" : ""}</dt>
                <dd className="font-semibold tabular-nums text-app-text">{fmtFcfa(breakdown.openingBalance)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-app-muted">Encaissé moins dépensé</dt>
                <dd className="font-semibold tabular-nums text-app-text">{breakdown.totalIn - breakdown.totalOut >= 0 ? "+" : "−"}{fmtFcfa(Math.abs(breakdown.totalIn - breakdown.totalOut))}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-app-muted">Versements vers la banque</dt>
                <dd className="font-semibold tabular-nums text-app-text">−{fmtFcfa(breakdown.transfersOut)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-app-muted">Ajustements et apports</dt>
                <dd className={`font-semibold tabular-nums ${breakdown.corrections < 0 ? "text-app-bad" : "text-app-text"}`}>{breakdown.corrections >= 0 ? "+" : "−"}{fmtFcfa(Math.abs(breakdown.corrections))}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-3">
                <dt className="font-extrabold text-app-text">Solde théorique</dt>
                <dd className="text-base font-extrabold tabular-nums text-app-text">{fmtFcfa(breakdown.theoreticalBalance)}</dd>
              </div>
            </dl>
            <p className="mt-3 rounded-xl bg-app-panel-2 px-3 py-2.5 text-xs text-app-muted">
              Espèces attendues dans le tiroir : <strong className="tabular-nums text-app-text">{fmtFcfa(breakdown.physicalCashBalance)}</strong> (sans Wave ni Orange Money).
            </p>
          </Surface>

          <section aria-label="Clôture" className="flex flex-col gap-2.5">
            <SectionTitle>Clôture</SectionTitle>
            <CloseCashSessionForm
              theoreticalBalance={breakdown.theoreticalBalance}
              expectedCash={breakdown.physicalCashBalance}
              mobileMoney={{ wave: breakdown.waveNet, orangeMoney: breakdown.omNet }}
            />
            {user.role === "ADMIN" ? <CreateCorrectionForm /> : null}
          </section>
        </div>

        <section aria-label="Activité récente" className="min-w-0">
          <SectionTitle>Activité récente ({activity.length})</SectionTitle>
          <CashActivityList entries={activity} />
        </section>
      </div>
    </PageShell>
  );
}
