import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { CreateBankAccountForm } from "./create-bank-account-form";

export default async function NewBankAccountPage() {
  // Bloc F, section 2 — même garde page-level que la liste.
  await requireAdmin();

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-6 pb-10">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/settings/bank-accounts"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-navy"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="text-xl font-extrabold text-navy">Nouveau compte bancaire</h1>
      </div>

      <CreateBankAccountForm />
    </div>
  );
}
