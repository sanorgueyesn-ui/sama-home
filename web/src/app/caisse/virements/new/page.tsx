import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { listActiveBankAccounts } from "@/lib/bank-data";
import { CreateBankTransferForm } from "./create-bank-transfer-form";

export default async function NewBankTransferPage() {
  // Bloc G, section 16 — ADMIN et GESTIONNAIRE peuvent créer un virement.
  await verifySession();

  // Bloc G, section 9 — uniquement les comptes actifs proposés à la création.
  const accounts = await listActiveBankAccounts();

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-6 pb-10">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/caisse/virements"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-navy"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="text-xl font-extrabold text-navy">Nouveau virement</h1>
      </div>

      {accounts.length === 0 ? (
        <p className="rounded-xl bg-warning-bg px-4 py-3 text-sm font-medium text-warning">
          Aucun compte bancaire actif.{" "}
          <Link href="/settings/bank-accounts/new" className="underline">
            Créer un compte bancaire
          </Link>{" "}
          avant de pouvoir enregistrer un virement.
        </p>
      ) : (
        <CreateBankTransferForm accounts={accounts.map((a) => ({ id: a.id, label: a.label, bankName: a.bankName }))} />
      )}
    </div>
  );
}
