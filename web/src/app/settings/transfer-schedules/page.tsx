import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/dal";
import { listTransferSchedules, listBankAccounts } from "@/lib/bank-data";
import { TransferScheduleRowActions } from "./transfer-schedule-row-actions";

const FEEDBACK_MESSAGES: Record<string, string> = {
  created: "Programmation créée.",
};

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Chaque jour",
  WEEKLY: "Chaque semaine",
  BIWEEKLY: "Toutes les deux semaines",
  MONTHLY: "Chaque mois",
};

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}
function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

/**
 * Bloc H — page `/settings/transfer-schedules`. ADMIN uniquement, page-level
 * (`requireAdmin()`), indépendant du masquage du lien dans /settings — même
 * principe que /settings/users, /settings/expense-categories,
 * /settings/bank-accounts. `listTransferSchedules()`/`listBankAccounts()`
 * (gelés, src/lib/bank-data.ts) ne revérifient que verifySession() — c'est
 * cette page qui restreint réellement l'accès à ADMIN.
 */
export default async function TransferSchedulesPage(props: PageProps<"/settings/transfer-schedules">) {
  await requireAdmin();
  const { done } = await props.searchParams;

  const [schedules, accounts] = await Promise.all([listTransferSchedules(), listBankAccounts()]);
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const activeAccounts = accounts.filter((a) => a.active).map((a) => ({ id: a.id, label: a.label, bankName: a.bankName }));

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 pt-6 pb-10">
      <div className="mb-2 flex items-center gap-3">
        <Link
          href="/settings"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-navy"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="flex-1 text-xl font-extrabold text-navy">Virements programmés</h1>
        <Link
          href="/settings/transfer-schedules/new"
          className="flex h-10 items-center rounded-xl bg-navy px-4 text-sm font-bold text-white"
        >
          + Nouvelle
        </Link>
      </div>
      <p className="mb-4 text-xs font-medium text-navy/50">
        Automatisez la préparation de vos versements bancaires sans effectuer automatiquement les transferts.
      </p>

      <p className="mb-4 rounded-xl bg-paper px-4 py-3 text-xs font-medium text-navy/60">
        Lorsqu&apos;une échéance arrive, SAMA HOME crée un virement programmé (statut <strong>SCHEDULED</strong>).
        Vous devrez ensuite l&apos;effectuer depuis Caisse → Virements bancaires — jamais automatiquement.
      </p>

      {typeof done === "string" && FEEDBACK_MESSAGES[done] ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          {FEEDBACK_MESSAGES[done]}
        </p>
      ) : null}

      {schedules.length === 0 ? (
        <EmptyState
          icon={
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="5" width="16" height="15" rx="2" />
              <path d="M4 9.5h16" />
              <path d="M8 3v3M16 3v3" />
              <path d="M8.5 14h7" />
            </svg>
          }
          title="Aucune programmation."
          description="Créez une programmation pour générer automatiquement des virements à préparer."
          action={
            <Link
              href="/settings/transfer-schedules/new"
              className="flex h-11 items-center rounded-xl bg-navy px-5 text-sm font-bold text-white"
            >
              + Nouvelle programmation
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {schedules.map((schedule) => {
            const account = accountById.get(schedule.bankAccountId);
            return (
              <Card key={schedule.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-navy">
                      {account ? `${account.bankName} · ${account.label}` : "Compte introuvable"}
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-navy">
                      {schedule.amountType === "FIXED"
                        ? fmtFcfa(schedule.fixedAmount ?? 0)
                        : `${schedule.percentage ?? 0} % du solde disponible`}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-navy/60">{FREQUENCY_LABELS[schedule.frequency] ?? schedule.frequency}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 ${schedule.active ? "bg-success-bg" : "bg-neutral-bg"}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${schedule.active ? "bg-success" : "bg-neutral"}`} />
                    <span className={`text-[10.5px] font-bold ${schedule.active ? "text-success" : "text-neutral"}`}>
                      {schedule.active ? "Actif" : "Inactif"}
                    </span>
                  </span>
                </div>

                <div className="mt-2.5 flex flex-col gap-0.5 text-xs font-medium text-navy/50">
                  <span>
                    {schedule.active ? "Prochaine génération" : "Prochaine génération (en pause)"} : {fmtDateTime(schedule.nextRunAt)}
                  </span>
                  <span>Créée le {fmtDateTime(schedule.createdAt)}</span>
                </div>

                <div className="mt-3">
                  <TransferScheduleRowActions
                    id={schedule.id}
                    bankAccountId={schedule.bankAccountId}
                    frequency={schedule.frequency}
                    amountType={schedule.amountType}
                    fixedAmount={schedule.fixedAmount}
                    percentage={schedule.percentage}
                    nextRunAt={schedule.nextRunAt.toISOString()}
                    active={schedule.active}
                    accounts={activeAccounts}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
