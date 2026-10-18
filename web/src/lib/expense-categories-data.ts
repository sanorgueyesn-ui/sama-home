import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAdmin } from "@/lib/dal";

/**
 * Bloc 16.2 — catégories proposées pour CRÉER une nouvelle dépense : actives
 * uniquement (règle métier Bloc 16.1 : "une catégorie inactive ne peut pas
 * être utilisée pour une nouvelle dépense"), triées par `position`.
 * Phase 3C / Lot C1 — getCurrentUser() pour résoudre l'établissement.
 */
export async function listActiveExpenseCategories() {
  const user = await getCurrentUser();
  if (!user.establishmentId) {
    return [];
  }
  return prisma.expenseCategory.findMany({
    where: { active: true, establishmentId: user.establishmentId },
    orderBy: { position: "asc" },
  });
}

/**
 * Bloc 16.2, section 9 — catégories proposées pour le FILTRE de
 * l'historique `/depenses` : actives + inactives mais déjà référencées par
 * au moins une dépense (une catégorie désactivée ne doit jamais disparaître
 * de l'historique, même si elle n'est plus proposée à la création).
 */
export async function listExpenseCategoriesForFilter() {
  const user = await getCurrentUser();
  if (!user.establishmentId) {
    return [];
  }
  return prisma.expenseCategory.findMany({
    where: {
      establishmentId: user.establishmentId,
      OR: [{ active: true }, { expenses: { some: {} } }],
    },
    orderBy: { position: "asc" },
  });
}

/**
 * Bloc 16.3 — Paramètres → Catégories de dépenses : TOUTES les catégories
 * (actives et inactives, quel que soit leur usage), triées par `position`
 * puis `name` en cas d'égalité (section 8 — critère stable, jamais de
 * modification des positions existantes juste pour l'affichage). ADMIN
 * uniquement (même garde que requireAdmin() partout ailleurs — cohérent
 * avec src/lib/users-data.ts, seul autre module à revérifier ici dans la
 * couche de lecture plutôt que seulement dans la page).
 *
 * `_count.expenses` permet à l'UI de savoir, sans requête supplémentaire,
 * si une suppression serait refusée par le serveur — pour ne jamais
 * proposer un bouton "Supprimer" qui échouerait systématiquement sans
 * explication (Bloc 16.3, section 14).
 */
export async function listExpenseCategoriesForSettings() {
  const admin = await requireAdmin();
  if (!admin.establishmentId) {
    return [];
  }
  return prisma.expenseCategory.findMany({
    where: { establishmentId: admin.establishmentId },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { expenses: true } } },
  });
}
