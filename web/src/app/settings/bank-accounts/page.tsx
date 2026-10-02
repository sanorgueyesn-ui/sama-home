import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/dal";
import { listBankAccounts } from "@/lib/bank-data";
import { BankAccountStatusBadge } from "./bank-account-status-badge";
import { BankAccountRowActions } from "./bank-account-row-actions";

const FEEDBACK_MESSAGES: Record<string, string> = {
  created: "Compte bancaire créé.",
};

export default async function BankAccountsPage(props: PageProps<"/settings/bank-accounts">) {
  // Bloc F, section 2 — page-level server check, indépendante du masquage
  // du lien dans /settings : même principe que /settings/users et
  // /settings/expense-categories (requireAdmin(), jamais un simple
  // masquage UI). `listBankAccounts()` (gelé, src/lib/bank-data.ts) ne
  // revérifie que verifySession() — c'est cette page qui restreint
  // réellement l'accès à ADMIN.
  await requireAdmin();
  const { done } = await props.searchParams;

  const accounts = await listBankAccounts();

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-6 pb-10">
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
        <h1 className="flex-1 text-xl font-extrabold text-navy">Comptes bancaires</h1>
        <Link
          href="/settings/bank-accounts/new"
          className="flex h-10 items-center rounded-xl bg-navy px-4 text-sm font-bold text-white"
        >
          + Nouveau
        </Link>
      </div>
      <p className="mb-4 text-xs font-medium text-navy/50">
        Comptes utilisés pour les versements effectués depuis la caisse.
      </p>

      {typeof done === "string" && FEEDBACK_MESSAGES[done] ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          {FEEDBACK_MESSAGES[done]}
        </p>
      ) : null}

      {accounts.length === 0 ? (
        <EmptyState
          icon={
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2.5" y="6" width="19" height="12" rx="2" />
              <circle cx="12" cy="12" r="2.6" />
            </svg>
          }
          title="Aucun compte bancaire."
          description="Créez un compte pour pouvoir y effectuer des versements depuis la caisse."
          action={
            <Link
              href="/settings/bank-accounts/new"
              className="flex h-11 items-center rounded-xl bg-navy px-5 text-sm font-bold text-white"
            >
              + Nouveau compte bancaire
            </Link>
          }
        />
      ) : (
        <Card className="px-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between gap-3 border-b border-[#E7EAEE] py-3 last:border-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-navy">{account.label}</p>
                  <BankAccountStatusBadge active={account.active} />
                </div>
                <p className="mt-0.5 truncate text-xs font-semibold text-navy/60">
                  {account.bankName}
                  {account.maskedAccountNumber ? ` · ${account.maskedAccountNumber}` : ""}
                </p>
              </div>
              <BankAccountRowActions
                id={account.id}
                label={account.label}
                bankName={account.bankName}
                maskedAccountNumber={account.maskedAccountNumber}
                active={account.active}
              />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
