// Calculs purs de la page Rapports. Aucune base, aucun accès à la session : tout ce qui est ici se
// teste seul. La lecture des données est dans `reports-data.ts`. Les périodes suivent la même
// convention que `period.ts` : jours et mois du fuseau local du serveur.

export type ReportPeriod = "month" | "last-month" | "year";
export type Granularity = "day" | "month";

export const REPORT_PERIODS: readonly ReportPeriod[] = ["month", "last-month", "year"];

export const REPORT_PERIOD_LABELS: Record<ReportPeriod, string> = {
  month: "Ce mois",
  "last-month": "Mois dernier",
  year: "Cette année",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Espèces",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
  OTHER: "Autre",
};

/** Valeur de `?period=` du navigateur : tout ce qui n'est pas une période connue vaut « ce mois ». */
export function parseReportPeriod(raw: unknown): ReportPeriod {
  return REPORT_PERIODS.includes(raw as ReportPeriod) ? (raw as ReportPeriod) : "month";
}

export type ReportRange = { gte: Date; lt: Date; granularity: Granularity };

/** [début, fin) de la période, en heure locale du serveur. L'année se découpe par mois, le reste par jour. */
export function reportRange(period: ReportPeriod, now: Date = new Date()): ReportRange {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (period) {
    case "last-month":
      return { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1), granularity: "day" };
    case "year":
      return { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1), granularity: "month" };
    case "month":
    default:
      return { gte: new Date(y, m, 1), lt: new Date(y, m + 1, 1), granularity: "day" };
  }
}

/** Période de comparaison : le mois d'avant pour un mois, l'année d'avant pour une année. */
export function previousReportRange(period: ReportPeriod, now: Date = new Date()): ReportRange {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (period) {
    case "last-month":
      return { gte: new Date(y, m - 2, 1), lt: new Date(y, m - 1, 1), granularity: "day" };
    case "year":
      return { gte: new Date(y - 1, 0, 1), lt: new Date(y, 0, 1), granularity: "month" };
    case "month":
    default:
      return { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1), granularity: "day" };
  }
}

/** Pourcentage entier de `part` dans `total`. 0 si le total est nul ou négatif. */
export function percentOf(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

/**
 * Évolution en % par rapport à la période précédente. `null` quand la période précédente est à zéro :
 * une évolution n'a pas de sens, et on n'invente pas « +100 % ».
 */
export function variationPercent(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export type Dated = { paidAt: Date; amount: number };
export type TrendPoint = { start: Date; revenue: number; expense: number; net: number };

function bucketKey(date: Date, granularity: Granularity): string {
  return granularity === "day"
    ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    : `${date.getFullYear()}-${date.getMonth()}`;
}

function nextBucket(date: Date, granularity: Granularity): Date {
  return granularity === "day"
    ? new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
    : new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

/**
 * Recettes et dépenses par jour (ou par mois) sur la période. Les lignes hors période sont ignorées.
 * Les jours ou mois qui n'ont pas encore commencé à `until` sont omis : pas de barre pour l'avenir.
 */
export function buildTrend(
  range: ReportRange,
  payments: Dated[],
  expenses: Dated[],
  until: Date = new Date(),
): TrendPoint[] {
  const points: TrendPoint[] = [];
  const index = new Map<string, TrendPoint>();
  for (let cursor = range.gte; cursor < range.lt; cursor = nextBucket(cursor, range.granularity)) {
    if (cursor > until) break;
    const point: TrendPoint = { start: cursor, revenue: 0, expense: 0, net: 0 };
    points.push(point);
    index.set(bucketKey(cursor, range.granularity), point);
  }

  const inRange = (date: Date) => date >= range.gte && date < range.lt;
  for (const row of payments) {
    if (!inRange(row.paidAt)) continue;
    const point = index.get(bucketKey(row.paidAt, range.granularity));
    if (point) point.revenue += row.amount;
  }
  for (const row of expenses) {
    if (!inRange(row.paidAt)) continue;
    const point = index.get(bucketKey(row.paidAt, range.granularity));
    if (point) point.expense += row.amount;
  }
  for (const point of points) point.net = point.revenue - point.expense;
  return points;
}

export type Share = { key: string; label: string; amount: number; percent: number };

/** Regroupe des montants par clé, du plus gros au plus petit, avec leur part du total en %. */
export function toShares(rows: { key: string; label: string; amount: number }[]): Share[] {
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  return rows
    .filter((row) => row.amount > 0)
    .map((row) => ({ ...row, percent: percentOf(row.amount, total) }))
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label, "fr"));
}

/** Plus grande valeur affichée du graphique, au moins 1 pour éviter une division par zéro. */
export function trendMax(points: TrendPoint[]): number {
  return Math.max(1, ...points.map((point) => Math.max(point.revenue, point.expense)));
}
