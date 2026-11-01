import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";
import { getRentalPaymentSummaries } from "@/lib/payment-summary";
import { summarizeReceivables } from "@/lib/dashboard-metrics";
import {
  PAYMENT_METHOD_LABELS,
  buildTrend,
  previousReportRange,
  reportRange,
  toShares,
  variationPercent,
  type ReportPeriod,
  type ReportRange,
  type Share,
  type TrendPoint,
} from "@/lib/reports-metrics";

/**
 * Lecture unique de la page Rapports. Aucun chiffre n'est inventé ni stocké : tout est calculé à la
 * lecture, avec la même règle que le tableau de bord (recettes = somme des paiements par date réelle
 * `paidAt`, dépenses = somme des dépenses par `paidAt`, restant dû = `getRentalPaymentSummaries`).
 *
 * Sécurité : réservé aux ADMIN de l'espace (`requireAdmin`), et l'espace vient de la session, jamais
 * du navigateur. Seul `period` vient de l'URL, et il est ramené à une valeur connue avant d'arriver ici.
 *
 * Les totaux et répartitions viennent de la base (`aggregate` / `groupBy`) : ils restent exacts quelle
 * que soit la quantité de lignes. Seul le graphique lit les lignes, plafonnées à `TREND_ROW_LIMIT`.
 */

const TREND_ROW_LIMIT = 20_000;
const RECEIVABLE_LIMIT = 500;

export type Report = {
  spaceName: string;
  isAgency: boolean;
  period: ReportPeriod;
  range: ReportRange;
  now: Date;
  revenue: { total: number; count: number; previous: number; variation: number | null };
  expenses: { total: number; count: number; previous: number; variation: number | null };
  net: { total: number; previous: number; variation: number | null };
  startedStays: number;
  trend: TrendPoint[];
  trendTruncated: boolean;
  revenueByMethod: Share[];
  expensesByMethod: Share[];
  expensesByCategory: Share[];
  receivables: {
    total: number;
    count: number;
    top: { id: string; propertyName: string; clientName: string | null; remaining: number }[];
  };
};

export async function getReport(period: ReportPeriod, now: Date = new Date()): Promise<Report> {
  const user = await requireAdmin();
  const establishmentId = user.establishmentId;
  // Un compte de plateforme n'a pas d'espace : aucun rapport à lui montrer ici.
  if (!establishmentId) redirect("/dashboard");

  const range = reportRange(period, now);
  const previous = previousReportRange(period, now);
  const inRange = { gte: range.gte, lt: range.lt };
  const inPrevious = { gte: previous.gte, lt: previous.lt };

  const [
    establishment,
    revenueAgg,
    revenuePrevAgg,
    expenseAgg,
    expensePrevAgg,
    revenueByMethodRows,
    expensesByMethodRows,
    expensesByCategoryRows,
    paymentRows,
    expenseRows,
    startedStays,
    activeRentals,
  ] = await Promise.all([
    prisma.establishment.findFirst({
      where: { id: establishmentId },
      select: { name: true, businessMode: true },
    }),
    prisma.payment.aggregate({
      where: { establishmentId, paidAt: inRange },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.aggregate({ where: { establishmentId, paidAt: inPrevious }, _sum: { amount: true } }),
    prisma.expense.aggregate({
      where: { establishmentId, paidAt: inRange },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.expense.aggregate({ where: { establishmentId, paidAt: inPrevious }, _sum: { amount: true } }),
    prisma.payment.groupBy({
      by: ["method"],
      where: { establishmentId, paidAt: inRange },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["method"],
      where: { establishmentId, paidAt: inRange },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: { establishmentId, paidAt: inRange },
      _sum: { amount: true },
    }),
    prisma.payment.findMany({
      where: { establishmentId, paidAt: inRange },
      select: { paidAt: true, amount: true },
      orderBy: { paidAt: "asc" },
      take: TREND_ROW_LIMIT + 1,
    }),
    prisma.expense.findMany({
      where: { establishmentId, paidAt: inRange },
      select: { paidAt: true, amount: true },
      orderBy: { paidAt: "asc" },
      take: TREND_ROW_LIMIT + 1,
    }),
    prisma.rental.count({
      where: { establishmentId, arrivalAt: inRange, status: { not: "CANCELLED" } },
    }),
    prisma.rental.findMany({
      where: { establishmentId, status: "ACTIVE" },
      select: {
        id: true,
        amount: true,
        reservationId: true,
        property: { select: { name: true } },
        client: { select: { name: true } },
      },
      take: RECEIVABLE_LIMIT,
    }),
  ]);

  // Les noms de catégories sont relus par `categoryId` (la référence structurelle), restreints à l'espace.
  const categoryIds = expensesByCategoryRows.map((row) => row.categoryId);
  const categories =
    categoryIds.length === 0
      ? []
      : await prisma.expenseCategory.findMany({
          where: { id: { in: categoryIds }, establishmentId },
          select: { id: true, name: true },
        });
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

  const summaries = await getRentalPaymentSummaries(
    prisma,
    activeRentals.map((r) => ({ id: r.id, amount: r.amount, reservationId: r.reservationId })),
  );
  const owing = summarizeReceivables(
    activeRentals.map((r) => ({
      id: r.id,
      propertyName: r.property.name,
      clientName: r.client?.name ?? null,
      remaining: summaries.get(r.id)?.remaining ?? 0,
    })),
  );

  const trendTruncated = paymentRows.length > TREND_ROW_LIMIT || expenseRows.length > TREND_ROW_LIMIT;
  const revenueTotal = revenueAgg._sum.amount ?? 0;
  const revenuePrevious = revenuePrevAgg._sum.amount ?? 0;
  const expenseTotal = expenseAgg._sum.amount ?? 0;
  const expensePrevious = expensePrevAgg._sum.amount ?? 0;
  const netTotal = revenueTotal - expenseTotal;
  const netPrevious = revenuePrevious - expensePrevious;

  const methodShares = (rows: { method: string; _sum: { amount: number | null } }[]) =>
    toShares(
      rows.map((row) => ({
        key: row.method,
        label: PAYMENT_METHOD_LABELS[row.method] ?? row.method,
        amount: row._sum.amount ?? 0,
      })),
    );

  return {
    spaceName: establishment?.name ?? "Mon espace",
    isAgency: establishment?.businessMode === "REAL_ESTATE",
    period,
    range,
    now,
    revenue: {
      total: revenueTotal,
      count: revenueAgg._count,
      previous: revenuePrevious,
      variation: variationPercent(revenueTotal, revenuePrevious),
    },
    expenses: {
      total: expenseTotal,
      count: expenseAgg._count,
      previous: expensePrevious,
      variation: variationPercent(expenseTotal, expensePrevious),
    },
    // L'évolution du résultat n'a de sens que si la période précédente était positive.
    net: { total: netTotal, previous: netPrevious, variation: variationPercent(netTotal, netPrevious) },
    startedStays,
    trend: buildTrend(
      range,
      paymentRows.slice(0, TREND_ROW_LIMIT),
      expenseRows.slice(0, TREND_ROW_LIMIT),
      now,
    ),
    trendTruncated,
    revenueByMethod: methodShares(revenueByMethodRows),
    expensesByMethod: methodShares(expensesByMethodRows),
    expensesByCategory: toShares(
      expensesByCategoryRows.map((row) => ({
        key: row.categoryId,
        label: categoryNames.get(row.categoryId) ?? "Catégorie supprimée",
        amount: row._sum.amount ?? 0,
      })),
    ),
    receivables: {
      total: owing.total,
      count: owing.count,
      top: owing.top.map((row) => ({
        id: row.id,
        propertyName: row.propertyName,
        clientName: row.clientName,
        remaining: row.remaining,
      })),
    },
  };
}
