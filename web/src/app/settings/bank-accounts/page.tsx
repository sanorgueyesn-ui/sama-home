import Link from "next/link";
import { SettingsPageHeader } from "@/app/settings/settings-ui";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/dal";
import { listBankAccounts } from "@/lib/bank-data";
import { BankAccountStatusBadge } from "./bank-account-status-badge";
import { BankAccountRowActions } from "./bank-account-row-actions";
import { T } from "@/components/i18n/i18n-provider";

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
    <>
      <SettingsPageHeader title="Comptes bancaires" backHref={"/settings"} description="Comptes utilisés pour les versements effectués depuis la caisse." action={{ href: "/settings/bank-accounts/new", label: "+ Nouveau" }} />

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
              className="flex h-11 items-center rounded-xl bg-brand-orange px-5 text-sm font-bold text-ink"
            >
              <T>+ Nouveau compte bancaire</T>
            </Link>
          }
        />
      ) : (
        <Card className="px-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between gap-3 border-b border-border/10 py-3 last:border-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-fg"><T>{account.label}</T></p>
                  <BankAccountStatusBadge active={account.active} />
                </div>
                <p className="mt-0.5 truncate text-xs font-semibold text-fg/60">
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
    </>
  );
}
