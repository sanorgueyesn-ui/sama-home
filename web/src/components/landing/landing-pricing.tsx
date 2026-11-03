"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CATEGORY_PRICING,
  getPriceEquivalents,
  type EstablishmentCategory,
  type BillingCycle,
  type CategoryPlan,
} from "@/lib/pricing-config";
import { planCaps, type BusinessModeName, type PlanTierValue } from "@/lib/subscription-plans";
import { AGENCY_MODE_ENABLED } from "@/lib/business-mode";
import { ArrowRightIcon, BedIcon, BuildingIcon, CheckIcon, KeyIcon, LockIcon, ShieldIcon, UsersIcon } from "@/components/ui/icons";
import { T } from "@/components/i18n/i18n-provider";

const MODE_OF: Record<EstablishmentCategory, BusinessModeName> = { residence: "RESIDENCE", hotel: "HOTEL", agency: "REAL_ESTATE" };
const TIER_OF: Record<CategoryPlan["id"], PlanTierValue> = { essential: "ESSENTIAL", pro: "PRO", premium: "PREMIUM" };

const fmt = (n: number) => n.toLocaleString("fr-FR").replace(/\s|,/g, " ");

function Capacity({ icon: Icon, value, label }: { icon: typeof BedIcon; value: number | null; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/15 bg-surface px-3.5 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--accent)/12 text-(--accent-text)">
        <Icon className="h-4.5 w-4.5" aria-hidden />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="text-lg font-extrabold tabular-nums text-fg">{value === null ? <T>Illimité</T> : value}</p>
        <p className="truncate text-[11px] font-semibold text-muted"><T>{label}</T></p>
      </div>
    </div>
  );
}

function PricingCard({ plan, category, billing }: { plan: CategoryPlan; category: EstablishmentCategory; billing: BillingCycle }) {
  const featured = Boolean(plan.isPopular);
  const isAnnual = billing === "annual";
  const price = isAnnual ? plan.priceAnnual : plan.priceMonthly;
  const { fcfaFormatted, displayLine } = getPriceEquivalents(price);
  const caps = planCaps(MODE_OF[category], TIER_OF[plan.id]);
  const unitsLabel = category === "agency" ? "biens" : "chambres";
  const registerUrl = `/register?category=${category}&plan=${plan.id}&billing=${billing}`;

  return (
    <div
      className={`relative flex h-full flex-col rounded-3xl p-6 sm:p-7 hover-card-lift ${
        featured
          ? "border-2 border-(--accent) bg-surface-raised shadow-card lg:-my-3 lg:py-9"
          : "border border-border/20 bg-surface-raised"
      }`}
    >
      {featured ? (
        <span className="absolute -top-3.5 start-1/2 -translate-x-1/2 rounded-full bg-(--accent) px-4 py-1 text-[11px] font-extrabold uppercase tracking-wide text-(--accent-ink) shadow-sm">
          <T>Le plus choisi</T>
        </span>
      ) : null}

      <h3 className="text-xl font-extrabold text-fg"><T>{plan.name}</T></h3>
      <p className="mt-1.5 min-h-[2.6rem] text-pretty text-sm leading-snug text-muted"><T>{plan.tagline}</T></p>

      <div className="mt-5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-4xl font-black tracking-tight text-fg sm:text-[2.6rem]">{fcfaFormatted}</span>
          <span className="text-sm font-bold text-muted">FCFA</span>
          <span className="text-sm font-medium text-muted"><T>{isAnnual ? "/ an" : "/ mois"}</T></span>
        </div>
        {isAnnual ? (
          <p className="mt-1.5 text-xs font-semibold text-muted">
            <T>Soit</T> <span className="text-fg">{fmt(Math.round(plan.priceAnnual / 12))} FCFA</span> <T>/ mois</T>
            {" · "}
            <T>au lieu de</T> <span className="line-through">{fmt(plan.priceMonthly * 12)}</span>
          </p>
        ) : (
          <p className="mt-1.5 text-xs font-medium text-muted">{displayLine}</p>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <Capacity icon={category === "agency" ? BuildingIcon : BedIcon} value={caps?.units ?? null} label={unitsLabel} />
        <Capacity icon={UsersIcon} value={caps?.users ?? null} label="utilisateurs" />
      </div>

      <ul className="mt-6 flex-1 space-y-2.5" role="list">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm leading-snug text-muted">
            <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <span><T>{feature}</T></span>
          </li>
        ))}
      </ul>

      <Link
        href={registerUrl}
        className={`group mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition-colors ${
          featured
            ? "btn-shimmer bg-(--accent) text-(--accent-ink) hover:bg-(--accent-hover)"
            : "border border-border/30 bg-surface text-fg hover:bg-surface-sunken"
        }`}
      >
        <span>{featured ? <T>Choisir la formule Pro</T> : <T>Sélectionner cette formule</T>}</span>
        <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden />
      </Link>
    </div>
  );
}

// Lignes du tableau : seulement ce qui est réellement contrôlé ou offert dans l'application.
const COMPARE: { label: string; in: readonly [boolean, boolean, boolean] }[] = [
  { label: "Planning et calendrier des réservations", in: [true, true, true] },
  { label: "Suivi des entrées, sorties et séjours", in: [true, true, true] },
  { label: "Journal de caisse et encaissements", in: [true, true, true] },
  { label: "Contrats, quittances et tickets en PDF", in: [true, true, true] },
  { label: "Messages WhatsApp aux clients", in: [true, true, true] },
  { label: "Rapports financiers", in: [false, true, true] },
  { label: "Support prioritaire WhatsApp et téléphone", in: [false, true, true] },
];

function ComparisonTable({ category }: { category: EstablishmentCategory }) {
  const plans = CATEGORY_PRICING[category].plans;
  const unitsLabel = category === "agency" ? "Biens gérés" : "Chambres gérées";
  const cap = (tier: PlanTierValue, key: "units" | "users") => planCaps(MODE_OF[category], tier)?.[key] ?? null;
  return (
    <details className="group mt-12 rounded-3xl border border-border/20 bg-surface-raised">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-base font-extrabold text-fg [&::-webkit-details-marker]:hidden">
        <T>Comparer les formules en détail</T>
        <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-fg/8 text-lg leading-none text-muted transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="overflow-x-auto px-2 pb-4 sm:px-4">
        <table className="w-full min-w-[34rem] text-start text-sm">
          <thead>
            <tr className="border-b border-border/15">
              <th scope="col" className="px-4 py-3 text-start text-xs font-bold uppercase tracking-wide text-muted"><T>Fonction</T></th>
              {plans.map((plan) => (
                <th key={plan.id} scope="col" className={`px-4 py-3 text-center text-sm font-extrabold ${plan.isPopular ? "text-(--accent-text)" : "text-fg"}`}>
                  <T>{plan.name}</T>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/10">
            {[
              { label: unitsLabel, values: plans.map((p) => cap(TIER_OF[p.id], "units")) },
              { label: "Utilisateurs", values: plans.map((p) => cap(TIER_OF[p.id], "users")) },
            ].map((row) => (
              <tr key={row.label}>
                <th scope="row" className="px-4 py-3 text-start font-semibold text-fg"><T>{row.label}</T></th>
                {row.values.map((value, i) => (
                  <td key={i} className="px-4 py-3 text-center font-extrabold tabular-nums text-fg">{value === null ? <T>Illimité</T> : value}</td>
                ))}
              </tr>
            ))}
            {COMPARE.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="px-4 py-3 text-start font-semibold text-fg"><T>{row.label}</T></th>
                {row.in.map((included, i) => (
                  <td key={i} className="px-4 py-3 text-center">
                    {included ? (
                      <CheckIcon className="mx-auto h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" aria-label="Inclus" />
                    ) : (
                      <span className="text-muted" aria-label="Non inclus">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function PricingSection() {
  const [selectedCategory, setSelectedCategory] = useState<EstablishmentCategory>("residence");
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const currentCategory = CATEGORY_PRICING[selectedCategory];

  const categories: { id: EstablishmentCategory; label: string; icon: typeof BedIcon }[] = [
    { id: "residence", label: "Résidence meublée", icon: KeyIcon },
    { id: "hotel", label: "Hôtel", icon: BedIcon },
    ...(AGENCY_MODE_ENABLED ? [{ id: "agency" as const, label: "Agence immobilière", icon: BuildingIcon }] : []),
  ];

  return (
    <section id="tarifs" aria-labelledby="tarifs-titre" className="scroll-mt-20 border-t border-border/10 bg-surface-raised/40 py-20 sm:py-28">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-(--accent-text)"><T>Tarifs</T></p>
          <h2 id="tarifs-titre" className="mt-3 text-balance text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
            <T>Un prix clair, selon la taille de votre établissement</T>
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted sm:text-lg">
            <T>1 mois gratuit sans engagement, puis la formule de votre choix. Paiement en ligne par Wave, Orange Money ou carte.</T>
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center gap-5">
          <div role="tablist" aria-label="Activité" className="inline-flex rounded-2xl border border-border/25 bg-surface p-1.5">
            {categories.map((cat) => {
              const selected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors ${
                    selected ? "bg-(--accent) text-(--accent-ink)" : "text-muted hover:text-fg"
                  }`}
                >
                  <cat.icon className="h-4 w-4" aria-hidden />
                  <T>{cat.label}</T>
                </button>
              );
            })}
          </div>

          <div role="group" aria-label="Durée" className="inline-flex items-center rounded-2xl border border-border/25 bg-surface p-1.5">
            {(["monthly", "annual"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={billing === value}
                onClick={() => setBilling(value)}
                className={`inline-flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-bold transition-colors ${
                  billing === value ? "bg-(--accent) text-(--accent-ink)" : "text-muted hover:text-fg"
                }`}
              >
                <T>{value === "monthly" ? "Mensuel" : "Annuel"}</T>
                {value === "annual" ? (
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${billing === "annual" ? "bg-(--accent-ink)/15" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"}`}>
                    <T>1 mois offert</T>
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <p className="max-w-xl text-center text-sm text-muted"><T>{currentCategory.description}</T></p>
        </div>

        <div className="mt-12 grid items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {currentCategory.plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} category={selectedCategory} billing={billing} />
          ))}
        </div>

        <ComparisonTable category={selectedCategory} />

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: LockIcon, title: "Paiement sécurisé", text: "Wave, Orange Money et carte, via PayDunya. SAMA HOME ne voit jamais votre numéro de carte." },
            { icon: ShieldIcon, title: "Aucune surprise", text: "Si la limite de chambres est atteinte, seules les nouvelles créations sont bloquées. Rien n'est supprimé." },
            { icon: KeyIcon, title: "Sans engagement", text: "Ces tarifs concernent le logiciel, pas vos prix de location, que vous fixez librement." },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3.5 rounded-2xl border border-border/15 bg-surface p-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--accent)/12 text-(--accent-text)">
                <item.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h4 className="text-sm font-extrabold text-fg"><T>{item.title}</T></h4>
                <p className="mt-1 text-xs leading-relaxed text-muted"><T>{item.text}</T></p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-semibold text-muted">
          <span className="inline-flex items-center gap-2"><Image src="/images/payments/wave.png" alt="" width={20} height={20} className="h-5 w-5 rounded-full" />Wave</span>
          <span className="inline-flex items-center gap-2"><Image src="/images/payments/orange-money.png" alt="" width={20} height={20} className="h-5 w-5 rounded-full" />Orange Money</span>
          <span><T>Cartes Visa et Mastercard</T></span>
          <span className="text-muted/70"><T>* Les montants en euros (€) et en dollars ($) sont fournis à titre indicatif.</T></span>
        </div>
      </div>
    </section>
  );
}
