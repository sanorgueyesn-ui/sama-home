import { PageHeader } from "@/components/ui/page-kit";
import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { listActiveBankAccounts } from "@/lib/bank-data";
import { CreateBankTransferForm } from "./create-bank-transfer-form";
import { T } from "@/components/i18n/i18n-provider";

export default async function NewBankTransferPage() {
  // Bloc G, section 16 — ADMIN et GESTIONNAIRE peuvent créer un virement.
  await verifySession();

  // Bloc G, section 9 — uniquement les comptes actifs proposés à la création.
  const accounts = await listActiveBankAccounts();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-7">
      <div className="mb-5">
        <PageHeader back={{ href: "/caisse/virements", label: "Retour" }} title="Nouveau virement" />
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
        {accounts.length === 0 ? (
          <p className="rounded-xl bg-warning-bg px-4 py-3 text-sm font-medium text-warning">
            <T>Aucun compte bancaire actif.</T>{" "}
            <Link href="/settings/bank-accounts/new" className="underline">
              <T>Créer un compte bancaire</T>
            </Link>{" "}
            <T>avant de pouvoir enregistrer un virement.</T>
          </p>
        ) : (
          <CreateBankTransferForm accounts={accounts.map((a) => ({ id: a.id, label: a.label, bankName: a.bankName }))} />
        )}
      </div>
    </div>
  );
}
