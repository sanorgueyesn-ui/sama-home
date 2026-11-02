import { PageHeader } from "@/components/ui/page-kit";
import { ExpenseForm } from "@/app/depenses/expense-form";
import { createExpense } from "@/app/actions/expenses";
import { listActiveExpenseCategories } from "@/lib/expense-categories-data";

export default async function NewExpensePage() {
  // Bloc 16.2, section 10 — catégories actives uniquement pour la création
  // (une catégorie désactivée n'est jamais proposée pour une nouvelle
  // dépense).
  const categories = await listActiveExpenseCategories();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-7">
      <div className="mb-5">
        <PageHeader back={{ href: "/depenses", label: "Retour" }} title="Nouvelle dépense" />
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
        <ExpenseForm action={createExpense} categories={categories} />
      </div>
    </div>
  );
}
