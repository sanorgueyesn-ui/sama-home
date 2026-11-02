import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { CreateBankAccountForm } from "./create-bank-account-form";

export default async function NewBankAccountPage() {
  // Bloc F, section 2 — même garde page-level que la liste.
  await requireAdmin();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-7">
      <div className="mb-5 flex items-center gap-3 lg:mx-auto lg:w-full lg:max-w-2xl">
        <Link
          href="/settings/bank-accounts"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-fg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="text-xl font-extrabold text-fg">Nouveau compte bancaire</h1>
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
        <CreateBankAccountForm />
      </div>
    </div>
  );
}
