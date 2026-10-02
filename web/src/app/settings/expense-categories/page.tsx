import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/dal";
import { listExpenseCategoriesForSettings } from "@/lib/expense-categories-data";
import { ExpenseCategoryRowActions } from "./expense-category-row-actions";

// Bloc 16.3 — seule la création navigue vers cette page après succès (son
// propre formulaire, sur une page séparée) : un message de confirmation par
// query string y a donc du sens, même convention que /depenses?created=1.
// Renommer/activer/désactiver/supprimer agissent en place sur cette même
// page (router.refresh() uniquement) : la ligne qui change EST le retour
// utilisateur, pas de banner nécessaire — même principe que
// TariffRowActions/CheckInButton.
const FEEDBACK_MESSAGES: Record<string, string> = {
  created: "Catégorie créée.",
};

export default async function ExpenseCategoriesPage(props: PageProps<"/settings/expense-categories">) {
  // Bloc 16.3, section 5 — page-level server check, indépendant du
  // masquage du lien dans /settings : même principe que
  // /settings/users (requireAdmin(), jamais un simple masquage UI).
  await requireAdmin();
  const { done } = await props.searchParams;

  const categories = await listExpenseCategoriesForSettings();

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-6 pb-10">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/settings"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-navy"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="flex-1 text-xl font-extrabold text-navy">Catégories de dépenses</h1>
        <Link
          href="/settings/expense-categories/new"
          className="flex h-10 items-center rounded-xl bg-navy px-4 text-sm font-bold text-white"
        >
          + Nouvelle
        </Link>
      </div>

      {typeof done === "string" && FEEDBACK_MESSAGES[done] ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          {FEEDBACK_MESSAGES[done]}
        </p>
      ) : null}

      {categories.length === 0 ? (
        <EmptyState
          icon={
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v18M7 7.5c0-1.9 2-3 5-3s5 1.1 5 3-2 2.5-5 3-5 1.1-5 3 2 3 5 3 5-1.1 5-3" />
            </svg>
          }
          title="Aucune catégorie de dépense."
          description="Créez votre première catégorie pour pouvoir classer les dépenses de l'établissement."
          action={
            <Link
              href="/settings/expense-categories/new"
              className="flex h-11 items-center rounded-xl bg-navy px-5 text-sm font-bold text-white"
            >
              + Nouvelle catégorie
            </Link>
          }
        />
      ) : (
        <Card className="px-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between gap-3 border-b border-[#E7EAEE] py-3 last:border-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-navy">{category.name}</p>
                  {!category.active ? (
                    <span className="shrink-0 rounded-full bg-neutral-bg px-2 py-0.5 text-[10px] font-bold text-neutral">
                      Désactivée
                    </span>
                  ) : null}
                </div>
                {category._count.expenses > 0 ? (
                  <p className="mt-0.5 text-xs font-medium text-navy/50">
                    Utilisée dans l&apos;historique ({category._count.expenses})
                  </p>
                ) : null}
              </div>
              <ExpenseCategoryRowActions
                id={category.id}
                name={category.name}
                active={category.active}
                usageCount={category._count.expenses}
              />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
