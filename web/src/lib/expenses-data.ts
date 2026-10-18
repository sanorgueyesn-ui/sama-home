import "server-only";
import type { PaymentMethod } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { todayRange, monthRange, type DateRange } from "@/lib/period";

// Bloc 11 — "NE PAS charger une quantité illimitée de dépenses en mémoire."
// Same limitation pattern (take + count + truncated flag) already used by
// listReservations/listRentals rather than a full pagination UI, which
// Bloc 11 explicitly leaves as a choice ("pagination OU limitation").
const LIST_LIMIT = 50;

export type ExpensePeriodFilter = "today" | "month" | "all";

// Phase 10, Bloc 14/15: extracted to src/lib/period.ts so /depenses and the
// new dashboard share the exact same "today"/"month" boundaries — see that
// file for the timezone-convention rationale. Behavior is unchanged.
function periodRange(period: ExpensePeriodFilter): DateRange | undefined {
  if (period === "all") return undefined;
  return period === "today" ? todayRange() : monthRange();
}

export async function listExpenses(filters: {
  period?: ExpensePeriodFilter;
  categoryId?: string;
  method?: PaymentMethod;
  query?: string;
}) {
  // Phase 3C / Lot C1 — getCurrentUser() pour résoudre l'établissement.
  const user = await getCurrentUser();
  if (!user.establishmentId) {
    return { items: [], total: 0, truncated: false, totalAmount: 0, byCategory: [] };
  }

  const period = filters.period ?? "month";
  const range = periodRange(period);
  const trimmedQuery = filters.query?.trim();

  const where = {
    establishmentId: user.establishmentId,
    ...(range ? { paidAt: range } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.method ? { method: filters.method } : {}),
    // Bloc 13 — server-side search on reference/note only, never a
    // navigator-side scan of thousands of rows.
    ...(trimmedQuery
      ? {
          OR: [
            { reference: { contains: trimmedQuery, mode: "insensitive" as const } },
            { note: { contains: trimmedQuery, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  // Bloc 14 — total (and the worked example's per-category breakdown) is
  // always computed server-side from the SAME `where` as the list, never
  // trusted from the browser, and never a second, independently-maintained
  // formula (single source: this one query per figure).
  //
  // Bloc 16.2, section 7 — groupBy sur `categoryId` (Bloc 16.1), puis
  // jointure explicite vers `ExpenseCategory` pour le libellé. Le nom
  // affiché ici est volontairement le nom COURANT de la catégorie — cette
  // vue est un agrégat vivant, pas un enregistrement historique individuel
  // (contrairement à chaque ligne de `items`, qui affiche
  // `categoryNameSnapshot` — voir depenses/page.tsx).
  const [items, total, totalAgg, byCategoryAgg] = await Promise.all([
    prisma.expense.findMany({ where, orderBy: { paidAt: "desc" }, take: LIST_LIMIT }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
    prisma.expense.groupBy({ by: ["categoryId"], where, _sum: { amount: true }, orderBy: { categoryId: "asc" } }),
  ]);

  const categories = await prisma.expenseCategory.findMany({
    where: { id: { in: byCategoryAgg.map((c) => c.categoryId) } },
    select: { id: true, name: true },
  });
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  return {
    items,
    total,
    truncated: total > items.length,
    totalAmount: totalAgg._sum.amount ?? 0,
    byCategory: byCategoryAgg.map((c) => ({
      categoryId: c.categoryId,
      categoryName: categoryNameById.get(c.categoryId) ?? c.categoryId,
      amount: c._sum.amount ?? 0,
    })),
  };
}
