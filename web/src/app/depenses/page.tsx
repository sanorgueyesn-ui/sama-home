import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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

// Correctif Lot 3 — tuile indicateur compacte (même esprit que les tuiles
// de /sejour) : label, montant, sous-texte réel (jamais inventé — voir
// la section "indicateurs" du rapport pour ce qui a été volontairement
// omis faute de donnée moteur fiable : "Cette semaine", évolution %).
function KpiTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border/10 bg-surface-raised px-2.5 py-3 shadow-card sm:px-3.5">
      <p className="truncate text-[9px] font-bold uppercase tracking-wide text-fg/50 sm:text-[10px]">{label}</p>
      {/* Montants réels (ex. "1 200 000 FCFA", voire 8 chiffres) : `truncate`
          coupait silencieusement les montants trop longs à 390px (mesuré :
          "1 200 000 FCFA" débordait de 4px) — un montant réel ne doit
          jamais être caché. Taille réduite + retour à la ligne contrôlé
          (`break-words`, pas de troncature) au lieu de couper le texte ;
          remonte à sa taille normale sur une seule ligne dès `sm`, où la
          largeur disponible est suffisante même à 8 chiffres. */}
      <p className="mt-1 break-words text-[11px] font-extrabold leading-tight text-fg sm:text-lg">{value}</p>
      <p className="mt-0.5 truncate text-[10px] font-medium text-fg/50 sm:text-[11px]">{sub}</p>
    </div>
  );
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
        <Card key={e.id} className="p-3.5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danger-bg text-danger">
              <ExpenseIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                {/* Bloc 16.2, section 8 — nom historique figé à la
                    création, jamais le nom courant de la catégorie : un
                    renommage ultérieur ne doit jamais changer
                    rétroactivement l'affichage d'une dépense existante. */}
                <p className="truncate text-sm font-extrabold text-fg">{e.categoryNameSnapshot}</p>
                <p className="shrink-0 text-sm font-extrabold text-fg">{fmtFcfa(e.amount)}</p>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-fg/60">
                <span>{fmtDateTime(e.paidAt)}</span>
                <span className="h-1 w-1 rounded-full bg-fg/30" />
                <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-warning">
                  {METHOD_LABELS[e.method] ?? e.method}
                </span>
              </div>
              {e.reference ? (
                <p className="mt-1 truncate text-[11px] font-medium text-fg/50">Référence : {e.reference}</p>
              ) : null}
              {e.note ? <p className="mt-1 truncate text-[11px] font-medium text-fg/50">{e.note}</p> : null}
            </div>
          </div>
        </Card>
      ))}
      {truncated && (
        <p className="pt-1 text-center text-xs font-medium text-fg/50">
          Affinez la recherche pour voir plus de résultats.
        </p>
      )}
    </div>
  );

  const categoryBreakdown = (
    <Card className="px-4">
      <p className="pt-3 text-[11px] font-bold text-fg/50">TOTAL DES DÉPENSES</p>
      {byCategory.map((c) => (
        <div key={c.categoryId} className="flex items-center justify-between border-b border-border/10 py-2.5 last:border-0">
          <span className="truncate text-sm font-semibold text-fg">{c.categoryName}</span>
          <span className="shrink-0 text-sm font-bold text-fg">{fmtFcfa(c.amount)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between pt-3">
        <span className="text-sm font-extrabold text-fg">TOTAL</span>
        <span className="text-base font-extrabold text-fg">{fmtFcfa(totalAmount)}</span>
      </div>
    </Card>
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pt-6 pb-28 md:max-w-none md:px-8 md:pb-10 lg:px-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-fg">Dépenses</h1>
        <Link
          href="/depenses/new"
          className="flex h-10 items-center rounded-xl bg-brand-orange px-4 text-sm font-bold text-ink"
        >
          + Nouvelle
        </Link>
      </div>

      {created ? (
        <p className="mt-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Dépense enregistrée.
        </p>
      ) : null}

      {/* Indicateurs — correctif Lot 3, section 6. */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <KpiTile
          label="Aujourd'hui"
          value={fmtFcfa(todayKpi.totalAmount)}
          sub={`${todayKpi.total} ${todayKpi.total > 1 ? "dépenses" : "dépense"}`}
        />
        <KpiTile
          label="Ce mois"
          value={fmtFcfa(monthKpi.totalAmount)}
          sub={`${monthKpi.total} ${monthKpi.total > 1 ? "dépenses" : "dépense"}`}
        />
        <KpiTile label="Nombre d'actes" value={String(monthKpi.total)} sub="Ce mois-ci" />
      </div>

      <ExpenseFilters
        defaultQuery={query ?? ""}
        defaultPeriod={periodFilter}
        defaultCategory={categoryFilter ?? ""}
        defaultMethod={methodFilter ?? ""}
        categories={filterCategories}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v18M7 7.5c0-1.9 2-3 5-3s5 1.1 5 3-2 2.5-5 3-5 1.1-5 3 2 3 5 3 5-1.1 5-3" />
            </svg>
          }
          title="Aucune dépense enregistrée."
          description="Aucune dépense ne correspond à ces critères."
          action={
            <Link
              href="/depenses/new"
              className="flex h-11 items-center rounded-xl bg-brand-orange px-5 text-sm font-bold text-ink"
            >
              + Nouvelle dépense
            </Link>
          }
        />
      ) : (
        <>
          {/* Mobile + tablette — répartition au-dessus de la liste. */}
          <div className="mt-4 lg:hidden">{categoryBreakdown}</div>
          <div className="mt-4 lg:hidden">{expenseRows}</div>

          {/* Desktop — liste principale à gauche, répartition par catégorie
              à droite (évite le grand espace vide signalé pour Séjour,
              même principe de composition). */}
          <div className="mt-4 hidden lg:grid lg:grid-cols-[2fr_1fr] lg:gap-5">
            {expenseRows}
            <div>{categoryBreakdown}</div>
          </div>
        </>
      )}
    </div>
  );
}
