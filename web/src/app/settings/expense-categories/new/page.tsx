import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { CreateExpenseCategoryForm } from "./create-expense-category-form";
import { T } from "@/components/i18n/i18n-provider";
import { getT } from "@/lib/i18n/server";

export default async function NewExpenseCategoryPage() {
  const t = await getT();
  // Bloc 16.3, section 5 — même garde page-level que la liste, indépendante
  // du masquage du lien dans /settings.
  await requireAdmin();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-7">
      <div className="mb-5 flex items-center gap-3 lg:mx-auto lg:w-full lg:max-w-2xl">
        <Link
          href="/settings/expense-categories"
          aria-label={t("Retour")}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-fg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="text-xl font-extrabold text-fg"><T>Nouvelle catégorie</T></h1>
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
        <CreateExpenseCategoryForm />
      </div>
    </div>
  );
}
