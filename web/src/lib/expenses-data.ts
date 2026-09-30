import "server-only";
import type { ExpenseCategory, PaymentMethod } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
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
  category?: ExpenseCategory;
  method?: PaymentMethod;
  query?: string;
}) {
  await verifySession();

  const period = filters.period ?? "month";
  const range = periodRange(period);
  const trimmedQuery = filters.query?.trim();

  const where = {
    ...(range ? { paidAt: range } : {}),
    ...(filters.category ? { category: filters.category } : {}),
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
  const [items, total, totalAgg, byCategoryAgg] = await Promise.all([
    prisma.expense.findMany({ where, orderBy: { paidAt: "desc" }, take: LIST_LIMIT }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
    prisma.expense.groupBy({ by: ["category"], where, _sum: { amount: true }, orderBy: { category: "asc" } }),
  ]);

  return {
    items,
    total,
    truncated: total > items.length,
    totalAmount: totalAgg._sum.amount ?? 0,
    byCategory: byCategoryAgg.map((c) => ({ category: c.category, amount: c._sum.amount ?? 0 })),
  };
}
