import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getReport, type Report } from "@/lib/reports-data";
import { getHotelKpis } from "@/lib/hotel-kpis-data";
import {
  REPORT_PERIODS,
  REPORT_PERIOD_LABELS,
  parseReportPeriod,
  trendMax,
  type Share,
} from "@/lib/reports-metrics";
import { T } from "@/components/i18n/i18n-provider";
import { getT } from "@/lib/i18n/server";
import { dateLocale } from "@/lib/i18n/date-locale";

export const dynamic = "force-dynamic";

function fmtFcfa(amount: number) {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(amount)).replace(/[  ]/g, " ")} FCFA`;
}

function fmtVariation(variation: number | null) {
  if (variation === null) return "Pas de période précédente à comparer";
  if (variation === 0) return "Stable par rapport à la période précédente";
  return `${variation > 0 ? "+" : ""}${variation} % par rapport à la période précédente`;
}

function periodTitle(report: Report) {
  const fmt = new Intl.DateTimeFormat(dateLocale(), { month: "long", year: "numeric" });
  if (report.period === "year") return String(report.range.gte.getFullYear());
  const label = fmt.format(report.range.gte);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function bucketLabel(report: Report, date: Date) {
  return report.range.granularity === "day"
    ? new Intl.DateTimeFormat(dateLocale(), { day: "numeric", month: "short" }).format(date)
    : new Intl.DateTimeFormat(dateLocale(), { month: "long" }).format(date);
}

function KpiTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "success" | "danger";
}) {
  const valueTone = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-fg";
  return (
    <div className="min-w-0 rounded-2xl border border-border/10 bg-surface-raised px-3 py-3.5 shadow-card sm:px-4">
      <p className="truncate text-[10px] font-bold uppercase tracking-wide text-fg/50"><T>{label}</T></p>
      <p className={`mt-1 break-words text-base font-extrabold leading-tight sm:text-xl ${valueTone}`}>{value}</p>
      <p className="mt-1 text-[11px] font-medium leading-snug text-fg/50"><T>{sub}</T></p>
    </div>
  );
}

function ShareList({ title, rows, emptyText }: { title: string; rows: Share[]; emptyText: string }) {
  return (
    <Card className="px-4 pb-3">
      <p className="pt-3 text-[11px] font-bold uppercase text-fg/50"><T>{title}</T></p>
      {rows.length === 0 ? (
        <p className="py-4 text-sm font-medium text-fg/50"><T>{emptyText}</T></p>
      ) : (
        <ul className="mt-1">
          {rows.map((row) => (
            <li key={row.key} className="border-b border-border/10 py-2.5 last:border-0">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-semibold text-fg"><T>{row.label}</T></span>
                <span className="shrink-0 text-sm font-bold text-fg">{fmtFcfa(row.amount)}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                  <div className="h-full rounded-full bg-brand-orange" style={{ width: `${row.percent}%` }} />
                </div>
                <span className="w-9 shrink-0 text-right text-[11px] font-bold text-fg/60">{row.percent} %</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

async function TrendChart({ report }: { report: Report }) {
  const t = await getT();
  const max = trendMax(report.trend);
  const hasData = report.trend.some((point) => point.revenue > 0 || point.expense > 0);
  const summary = `Recettes et dépenses ${periodTitle(report)} : ${fmtFcfa(report.revenue.total)} de recettes, ${fmtFcfa(report.expenses.total)} de dépenses.`;

  return (
    <Card className="px-4 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
        <p className="text-[11px] font-bold uppercase text-fg/50">
          <T>Recettes et dépenses</T> {report.range.granularity === "day" ? <T>{"par jour"}</T> : <T>{"par mois"}</T>}
        </p>
        <div className="flex items-center gap-3 text-[11px] font-semibold text-fg/60">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
            {report.isAgency ? <T>{"Loyers"}</T> : <T>{"Recettes"}</T>}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-danger" aria-hidden />
            <T>Dépenses</T>
          </span>
        </div>
      </div>

      {!hasData ? (
        <p className="py-10 text-center text-sm font-medium text-fg/50">
          <T>Aucun mouvement sur cette période.</T>
        </p>
      ) : (
        <>
          <div
            role="img"
            aria-label={t(summary)}
            className="mt-4 flex h-40 items-end gap-[3px] sm:gap-1"
          >
            {report.trend.map((point) => (
              <div
                key={point.start.toISOString()}
                className="flex h-full min-w-0 flex-1 items-end justify-center gap-px"
                title={t(`${bucketLabel(report, point.start)} — recettes ${fmtFcfa(point.revenue)}, dépenses ${fmtFcfa(point.expense)}`)}
              >
                <div
                  className="w-full max-w-3 rounded-t-sm bg-success"
                  style={{ height: `${(point.revenue / max) * 100}%`, minHeight: point.revenue > 0 ? 2 : 0 }}
                />
                <div
                  className="w-full max-w-3 rounded-t-sm bg-danger"
                  style={{ height: `${(point.expense / max) * 100}%`, minHeight: point.expense > 0 ? 2 : 0 }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] font-medium text-fg/50">
            <span>{bucketLabel(report, report.trend[0].start)}</span>
            <span>{bucketLabel(report, report.trend[report.trend.length - 1].start)}</span>
          </div>
        </>
      )}
      {report.trendTruncated ? (
        <p className="mt-2 text-[11px] font-medium text-fg/50">
          <T>Le graphique est limité aux premiers mouvements de la période. Les totaux restent exacts.</T>
        </p>
      ) : null}
    </Card>
  );
}

export default async function ReportsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getT();
  const { period: rawPeriod } = await props.searchParams;
  const period = parseReportPeriod(Array.isArray(rawPeriod) ? rawPeriod[0] : rawPeriod);
  const report = await getReport(period);

  const hotel = await getHotelKpis(report.range, report.revenue.total, report.now);
  const stayWord = report.isAgency ? "Locations démarrées" : "Séjours démarrés";
  const revenueLabel = report.isAgency ? "Loyers encaissés" : "Recettes";
  const noActivity =
    report.revenue.count === 0 && report.expenses.count === 0 && report.startedStays === 0;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1360px] flex-col px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-7">
      <div>
        <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-app-text sm:text-2xl lg:text-[28px]"><T>Rapports</T></h1>
        <p className="mt-0.5 text-sm font-medium text-fg/60">
          {report.spaceName} · {periodTitle(report)}
        </p>
      </div>

      <nav aria-label={t("Période du rapport")} className="mt-4 flex gap-2 overflow-x-auto">
        {REPORT_PERIODS.map((value) => {
          const active = value === report.period;
          return (
            <Link
              key={value}
              href={`/rapports?period=${value}`}
              aria-current={active ? "page" : undefined}
              className={`flex h-10 shrink-0 items-center rounded-xl px-4 text-sm font-bold ${
                active
                  ? "bg-brand-orange text-ink"
                  : "border border-border/10 bg-surface-raised text-fg/70"
              }`}
            >
              <T>{REPORT_PERIOD_LABELS[value]}</T>
            </Link>
          );
        })}
      </nav>

      {noActivity ? (
        <div className="mt-6">
          <EmptyState
            icon={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
              </svg>
            }
            title="Aucune activité sur cette période."
            description="Les encaissements, dépenses et séjours de la période apparaîtront ici."
          />
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <KpiTile
              label={revenueLabel}
              value={fmtFcfa(report.revenue.total)}
              sub={`${report.revenue.count} ${report.revenue.count > 1 ? "paiements" : "paiement"} · ${fmtVariation(report.revenue.variation)}`}
              tone="success"
            />
            <KpiTile
              label="Dépenses"
              value={fmtFcfa(report.expenses.total)}
              sub={`${report.expenses.count} ${report.expenses.count > 1 ? "dépenses" : "dépense"} · ${fmtVariation(report.expenses.variation)}`}
              tone="danger"
            />
            <KpiTile
              label="Résultat"
              value={fmtFcfa(report.net.total)}
              sub={`${report.isAgency ? "Loyers" : "Recettes"} moins dépenses · ${fmtVariation(report.net.variation)}`}
              tone={report.net.total < 0 ? "danger" : "success"}
            />
            <KpiTile label={stayWord} value={String(report.startedStays)} sub="Arrivées de la période, hors annulées" />
          </div>

          {hotel ? (
            <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              <KpiTile label="Occupation" value={`${hotel.occupancyPercent} %`} sub={`${hotel.occupiedNights} nuits sur ${hotel.availableNights} disponibles`} />
              <KpiTile
                label="Recette par nuit occupée"
                value={hotel.revenuePerOccupiedNight === null ? "—" : fmtFcfa(hotel.revenuePerOccupiedNight)}
                sub="Recettes encaissées ÷ nuits occupées"
              />
              <KpiTile
                label="Recette par chambre disponible"
                value={hotel.revenuePerAvailableNight === null ? "—" : fmtFcfa(hotel.revenuePerAvailableNight)}
                sub="Recettes encaissées ÷ nuits disponibles"
              />
              <KpiTile label="Jours comptés" value={String(hotel.elapsedDays)} sub="Depuis le début de la période" />
            </div>
          ) : null}

          <div className="mt-4">
            <TrendChart report={report} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ShareList
              title={`${revenueLabel} par moyen de paiement`}
              rows={report.revenueByMethod}
              emptyText="Aucun encaissement sur cette période."
            />
            <ShareList
              title="Dépenses par moyen de paiement"
              rows={report.expensesByMethod}
              emptyText="Aucune dépense sur cette période."
            />
          </div>

          <div className="mt-4">
            <ShareList
              title="Dépenses par catégorie"
              rows={report.expensesByCategory}
              emptyText="Aucune dépense sur cette période."
            />
          </div>
        </>
      )}

      <section aria-labelledby="soldes" className="mt-4">
        <Card className="px-4 pb-3">
          <div className="flex items-start justify-between gap-3 pt-3">
            <div>
              <p id="soldes" className="text-[11px] font-bold uppercase text-fg/50">
                <T>Soldes à recouvrer aujourd&apos;hui</T>
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-fg/50">
                <T>Situation actuelle des séjours en cours, indépendante de la période choisie.</T>
              </p>
            </div>
            <p className="shrink-0 text-base font-extrabold text-fg">{fmtFcfa(report.receivables.total)}</p>
          </div>
          {report.receivables.top.length === 0 ? (
            <p className="py-4 text-sm font-medium text-fg/50"><T>Aucun solde à recouvrer.</T></p>
          ) : (
            <ul className="mt-2">
              {report.receivables.top.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/locations/${row.id}`}
                    className="flex items-center justify-between gap-3 border-b border-border/10 py-2.5 last:border-0"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-fg">{row.propertyName}</span>
                      {row.clientName ? (
                        <span className="block truncate text-[11px] font-medium text-fg/50">{row.clientName}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-sm font-bold text-danger">{fmtFcfa(row.remaining)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {report.receivables.count > report.receivables.top.length ? (
            <p className="pt-2 text-[11px] font-medium text-fg/50">
              {report.receivables.count} <T>séjours ont un solde ; les</T> {report.receivables.top.length} <T>plus importants sont listés.</T>
            </p>
          ) : null}
        </Card>
      </section>
    </div>
  );
}
