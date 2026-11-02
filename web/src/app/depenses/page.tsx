import { Badge, EmptyPanel, PageHeader, PageShell, StatTile, Surface } from "@/components/ui/page-kit";
import { getActiveSpace } from "@/lib/active-mode";
import { ExpenseFilters } from "./filters";
import { ExpenseIcon } from "@/components/dashboard/stat-icons";
import { listExpenses, type ExpensePeriodFilter } from "@/lib/expenses-data";
import { listExpenseCategoriesForFilter } from "@/lib/expense-categories-data";
import { PAYMENT_METHOD_VALUES } from "@/lib/definitions";
import type { PaymentMethod } from "@/generated/prisma/client";

const PERIOD_VALUES: ExpensePeriodFilter[] = ["today", "month", "all"];

const METHOD_LABELS: Record<string, string> = {
  CASH: "Espèces",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
  OTHER: "Autre",
};

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}
function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
}

export default async function ExpensesPage(props: PageProps<"/depenses">) {
  const { q, period, category, method, created } = await props.searchParams;
  const query = typeof q === "string" ? q : undefined;
  const periodFilter = PERIOD_VALUES.includes(period as ExpensePeriodFilter) ? (period as ExpensePeriodFilter) : "month";
  const methodFilter = PAYMENT_METHOD_VALUES.includes(method as PaymentMethod) ? (method as PaymentMethod) : undefined;

  // Bloc 16.2, section 9 — catégories actives + inactives déjà référencées
  // par une dépense (une catégorie désactivée ne doit jamais disparaître du
  // filtre historique). `categoryId` n'est plus un enum fermé validable par
  // Zod : la seule validation possible est de vérifier qu'il correspond à
  // une catégorie réellement proposée par ce filtre.
  const space = await getActiveSpace();
  const filterCategories = await listExpenseCategoriesForFilter();
  const categoryFilter = filterCategories.some((c) => c.id === category) ? (category as string) : undefined;

  // Correctif Lot 3 — indicateurs fixes "Aujourd'hui" / "Ce mois" /
  // "Nombre d'actes" (maquette depenses-responsive.html), TOUJOURS sur la
  // même fenêtre de temps, indépendamment du filtre actif choisi par
  // l'utilisateur ci-dessous. Deux appels supplémentaires à listExpenses
  // (déjà existante, déjà utilisée telle quelle), pas de nouvelle requête
  // ni de nouveau calcul — même principe que les indicateurs fixes de
  // l'Accueil et de Séjour.
  const [{ items, truncated, totalAmount, byCategory }, todayKpi, monthKpi] = await Promise.all([
    listExpenses({ period: periodFilter, categoryId: categoryFilter, method: methodFilter, query }),
    listExpenses({ period: "today" }),
    listExpenses({ period: "month" }),
  ]);

  const expenseRows = (
    <div className="flex flex-col gap-3">
      {items.map((e) => (
        <div key={e.id} className="rounded-2xl border border-app-line bg-app-panel p-3.5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danger-bg text-danger">
              <ExpenseIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                {/* Nom historique figé à la création : un renommage de catégorie ne change jamais une dépense passée. */}
                <p className="truncate text-sm font-extrabold text-app-text">{e.categoryNameSnapshot}</p>
                <p className="shrink-0 text-sm font-extrabold tabular-nums text-app-text">{fmtFcfa(e.amount)}</p>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-app-muted">
                <span>{fmtDateTime(e.paidAt)}</span>
                <Badge>{METHOD_LABELS[e.method] ?? e.method}</Badge>
              </div>
              {e.reference ? <p className="mt-1.5 truncate text-[11px] font-medium text-app-muted">Référence : {e.reference}</p> : null}
              {e.note ? <p className="mt-1 truncate text-[11px] font-medium text-app-muted">{e.note}</p> : null}
            </div>
          </div>
        </div>
      ))}
      {truncated && <p className="pt-1 text-center text-xs font-medium text-app-faint">Affinez la recherche pour voir plus de résultats.</p>}
    </div>
  );

  const categoryBreakdown = (
    <Surface title="Répartition par catégorie" subtitle="Selon les filtres actifs">
      {byCategory.map((c) => (
        <div key={c.categoryId} className="flex items-center justify-between gap-3 border-b border-app-line py-2.5 last:border-0">
          <span className="truncate text-sm font-semibold text-app-text-2">{c.categoryName}</span>
          <span className="shrink-0 text-sm font-bold tabular-nums text-app-text">{fmtFcfa(c.amount)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-app-line-strong pt-3">
        <span className="text-sm font-extrabold text-app-text">Total</span>
        <span className="text-base font-extrabold tabular-nums text-app-text">{fmtFcfa(totalAmount)}</span>
      </div>
    </Surface>
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow={space.name}
        title="Dépenses"
        subtitle="Les sorties d'argent de l'établissement"
        actions={[{ href: "/depenses/new", label: "+ Nouvelle dépense" }]}
      />

      {created ? (
        <p role="status" className="rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Dépense enregistrée.
        </p>
      ) : null}

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <StatTile label="Aujourd'hui" value={fmtFcfa(todayKpi.totalAmount)} sub={`${todayKpi.total} ${todayKpi.total > 1 ? "dépenses" : "dépense"}`} />
        <StatTile label="Ce mois" value={fmtFcfa(monthKpi.totalAmount)} sub={`${monthKpi.total} ${monthKpi.total > 1 ? "dépenses" : "dépense"}`} />
        <StatTile label="Nb d'actes" value={String(monthKpi.total)} sub="Ce mois-ci" />
      </div>

      <ExpenseFilters
        defaultQuery={query ?? ""}
        defaultPeriod={periodFilter}
        defaultCategory={categoryFilter ?? ""}
        defaultMethod={methodFilter ?? ""}
        categories={filterCategories}
      />

      {items.length === 0 ? (
        <EmptyPanel title="Aucune dépense enregistrée" text="Aucune dépense ne correspond à ces critères." action={{ href: "/depenses/new", label: "+ Nouvelle dépense" }} />
      ) : (
        <>
          <div className="flex flex-col gap-5 lg:hidden">
            {categoryBreakdown}
            {expenseRows}
          </div>
          <div className="hidden lg:grid lg:grid-cols-[2fr_1fr] lg:items-start lg:gap-5">
            {expenseRows}
            {categoryBreakdown}
          </div>
        </>
      )}
    </PageShell>
  );
}
