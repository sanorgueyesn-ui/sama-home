import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ExpenseFilters } from "./filters";
import { listExpenses, type ExpensePeriodFilter } from "@/lib/expenses-data";
import { EXPENSE_CATEGORY_VALUES, PAYMENT_METHOD_VALUES } from "@/lib/definitions";
import type { ExpenseCategory, PaymentMethod } from "@/generated/prisma/client";

const PERIOD_VALUES: ExpensePeriodFilter[] = ["today", "month", "all"];

const CATEGORY_LABELS: Record<string, string> = {
  RENT: "Loyer",
  ELECTRICITY: "Électricité",
  WATER: "Eau",
  INTERNET: "Internet",
  CLEANING: "Nettoyage",
  MAINTENANCE: "Entretien",
  REPAIR: "Réparation",
  SALARY: "Salaire",
  PURCHASE: "Achat",
  OTHER: "Autre",
};
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
  const categoryFilter = EXPENSE_CATEGORY_VALUES.includes(category as ExpenseCategory)
    ? (category as ExpenseCategory)
    : undefined;
  const methodFilter = PAYMENT_METHOD_VALUES.includes(method as PaymentMethod) ? (method as PaymentMethod) : undefined;

  const { items, truncated, totalAmount, byCategory } = await listExpenses({
    period: periodFilter,
    category: categoryFilter,
    method: methodFilter,
    query,
  });

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 pt-6 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-navy">Dépenses</h1>
        <Link
          href="/depenses/new"
          className="flex h-10 items-center rounded-xl bg-navy px-4 text-sm font-bold text-white"
        >
          + Nouvelle
        </Link>
      </div>

      {created ? (
        <p className="mt-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Dépense enregistrée.
        </p>
      ) : null}

      <ExpenseFilters
        defaultQuery={query ?? ""}
        defaultPeriod={periodFilter}
        defaultCategory={categoryFilter ?? ""}
        defaultMethod={methodFilter ?? ""}
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
              className="flex h-11 items-center rounded-xl bg-navy px-5 text-sm font-bold text-white"
            >
              + Nouvelle dépense
            </Link>
          }
        />
      ) : (
        <>
          {/* Bloc 14 — total réel calculé côté serveur pour la période/les
              filtres sélectionnés, avec le détail par catégorie donné en
              exemple dans le prompt. */}
          <Card className="mt-4 px-4">
            <p className="pt-3 text-[11px] font-bold text-navy/50">TOTAL DES DÉPENSES</p>
            {byCategory.map((c) => (
              <div key={c.category} className="flex items-center justify-between border-b border-[#E7EAEE] py-2.5 last:border-0">
                <span className="text-sm font-semibold text-navy">{CATEGORY_LABELS[c.category] ?? c.category}</span>
                <span className="text-sm font-bold text-navy">{fmtFcfa(c.amount)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3">
              <span className="text-sm font-extrabold text-navy">TOTAL</span>
              <span className="text-base font-extrabold text-navy">{fmtFcfa(totalAmount)}</span>
            </div>
          </Card>

          <div className="mt-4 flex flex-col gap-3">
            {items.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-extrabold text-navy">{CATEGORY_LABELS[e.category] ?? e.category}</p>
                  <p className="text-sm font-extrabold text-navy">{fmtFcfa(e.amount)}</p>
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-xs font-semibold text-navy/60">
                  <span>{fmtDateTime(e.paidAt)}</span>
                  <span>{METHOD_LABELS[e.method] ?? e.method}</span>
                </div>
                {e.reference ? (
                  <p className="mt-1 text-xs font-medium text-navy/50">Référence : {e.reference}</p>
                ) : null}
                {e.note ? <p className="mt-1 text-xs font-medium text-navy/50">{e.note}</p> : null}
              </Card>
            ))}
            {truncated && (
              <p className="pt-1 text-center text-xs font-medium text-navy/50">
                Affinez la recherche pour voir plus de résultats.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
