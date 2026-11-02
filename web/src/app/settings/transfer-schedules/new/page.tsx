import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { listActiveBankAccounts } from "@/lib/bank-data";
import { CreateTransferScheduleForm } from "./create-transfer-schedule-form";
import { T } from "@/components/i18n/i18n-provider";
import { getT } from "@/lib/i18n/server";

export default async function NewTransferSchedulePage() {
  const t = await getT();
  // Bloc H, section 4 — ADMIN uniquement.
  await requireAdmin();

  // Bloc H, section 8 — uniquement les comptes actifs proposés.
  const accounts = await listActiveBankAccounts();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-7">
      <div className="mb-5 flex items-center gap-3 lg:mx-auto lg:w-full lg:max-w-2xl">
        <Link
          href="/settings/transfer-schedules"
          aria-label={t("Retour")}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-fg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="text-xl font-extrabold text-fg"><T>Nouvelle programmation</T></h1>
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
        {accounts.length === 0 ? (
          <p className="rounded-xl bg-warning-bg px-4 py-3 text-sm font-medium text-warning">
            <T>Aucun compte bancaire actif.</T>{" "}
            <Link href="/settings/bank-accounts/new" className="underline">
              <T>Créer un compte bancaire</T>
            </Link>{" "}
            <T>avant de pouvoir configurer une programmation.</T>
          </p>
        ) : (
          <CreateTransferScheduleForm accounts={accounts.map((a) => ({ id: a.id, label: a.label, bankName: a.bankName }))} />
        )}
      </div>
    </div>
  );
}
