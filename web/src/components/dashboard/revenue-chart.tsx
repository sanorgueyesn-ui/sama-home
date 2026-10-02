import type { DailyFinancialPoint } from "@/lib/dashboard-data";

function fmtDayLabel(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(d);
}

/**
 * "Recettes et dépenses (7 derniers jours)" — maquette PC uniquement. SVG
 * fait main (cohérent avec le style icônes du reste de l'app) : aucune
 * dépendance de graphique ajoutée.
 */
export function RevenueChart({ data }: { data: DailyFinancialPoint[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.revenue, d.expense]));
  const barWidth = 18;
  const barGap = 4;
  const groupGap = 14;
  const groupWidth = barWidth * 2 + barGap;
  const chartHeight = 140;
  const width = data.length * groupWidth + (data.length - 1) * groupGap;

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs font-bold text-navy/60">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success" /> Recettes
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-danger" /> Dépenses
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${chartHeight + 20}`}
        className="w-full"
        role="img"
        aria-label="Recettes et dépenses des 7 derniers jours"
      >
        {data.map((d, i) => {
          const x = i * (groupWidth + groupGap);
          const revenueH = (d.revenue / max) * chartHeight;
          const expenseH = (d.expense / max) * chartHeight;
          return (
            <g key={d.date.toISOString()}>
              <rect x={x} y={chartHeight - revenueH} width={barWidth} height={revenueH} rx={3} className="fill-success" />
              <rect
                x={x + barWidth + barGap}
                y={chartHeight - expenseH}
                width={barWidth}
                height={expenseH}
                rx={3}
                className="fill-danger"
              />
              <text
                x={x + groupWidth / 2}
                y={chartHeight + 14}
                textAnchor="middle"
                className="fill-navy/50 text-[10px] font-semibold"
              >
                {fmtDayLabel(d.date)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
