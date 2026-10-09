import Link from "next/link";
import { ExpenseForm } from "@/app/depenses/expense-form";
import { createExpense } from "@/app/actions/expenses";
import { listActiveExpenseCategories } from "@/lib/expense-categories-data";

export default async function NewExpensePage() {
  // Bloc 16.2, section 10 — catégories actives uniquement pour la création
  // (une catégorie désactivée n'est jamais proposée pour une nouvelle
  // dépense).
  const categories = await listActiveExpenseCategories();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pt-6 pb-10 md:max-w-none md:px-8 lg:px-10">
      <div className="mb-5 flex items-center gap-3 lg:mx-auto lg:w-full lg:max-w-2xl">
        <Link
          href="/depenses"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-fg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="text-xl font-extrabold text-fg">Nouvelle dépense</h1>
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
        <ExpenseForm action={createExpense} categories={categories} />
      </div>
    </div>
  );
}
