"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CATEGORY_PRICING,
  getPriceEquivalents,
  type EstablishmentCategory,
  type BillingCycle,
  type CategoryPlan,
} from "@/lib/pricing-config";

/* --------------------------------------------------------------------------
 * VRAIES ICÔNES SVG OFFICIELLES (AUCUN EMOJI)
 * -------------------------------------------------------------------------- */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-4 w-4 shrink-0 text-muted"}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ResidenceIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function HotelIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16" />
      <path d="M9 7h1" />
      <path d="M14 7h1" />
      <path d="M9 11h1" />
      <path d="M14 11h1" />
      <path d="M9 15h1" />
      <path d="M14 15h1" />
      <path d="M10 21v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3" />
    </svg>
  );
}

function AgencyIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="12" y2="18" />
    </svg>
  );
}

function TargetIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function ShieldIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/* --------------------------------------------------------------------------
 * COMPOSANT CARTE TARIFAIRE SOBRE ET ÉPURÉE
 * -------------------------------------------------------------------------- */
function PricingCard({
  plan,
  category,
  billing,
}: {
  plan: CategoryPlan;
  category: EstablishmentCategory;
  billing: BillingCycle;
}) {
  const isRecommended = plan.isPopular;
  const isAnnual = billing === "annual";
  const rawPrice = isAnnual ? plan.priceAnnual : plan.priceMonthly;
  const { fcfaFormatted, displayLine } = getPriceEquivalents(rawPrice);
  const registerUrl = `/register?category=${category}&plan=${plan.id}&billing=${billing}`;

  return (
    <div
      className={`relative flex h-full flex-col justify-between rounded-2xl p-6 sm:p-7 hover-card-lift ${
        isRecommended
          ? "border border-border/50 bg-surface-raised shadow-sm"
          : "border border-border/25 bg-surface-raised shadow-xs"
      }`}
    >
      {/* Badge Recommandé sobre */}
      {isRecommended && (
        <div className="absolute -top-3 start-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-sunken border border-border/30 px-3 py-0.5 text-[11px] font-bold text-fg shadow-xs">
            Recommandé
          </span>
        </div>
      )}

      {/* Contenu supérieur extensible */}
      <div className="flex-1 flex flex-col">
        {/* Titre */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xl font-bold text-fg">{plan.name}</h3>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-muted sm:text-sm min-h-[38px]">
          {plan.tagline}
        </p>

        {/* Bloc Prix : FCFA principal à gauche + équivalents indicatifs EUR et USD à droite */}
        <div className="mt-4 border-b border-border/15 pb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
                {fcfaFormatted}
              </span>
              <span className="text-sm font-bold text-muted">FCFA</span>
              <span className="text-xs font-medium text-muted">
                {isAnnual ? "/ an" : "/ mois"}
              </span>
            </div>

            <span className="text-sm font-medium text-muted sm:text-[15px] text-right ms-auto">
              {displayLine}
            </span>
          </div>

          {/* Économie Annuelle sobre */}
          {isAnnual ? (
            <div className="mt-2.5 flex items-center justify-between text-xs text-muted rounded-lg bg-surface-sunken px-2.5 py-1 border border-border/20">
              <span>Économie : {plan.priceMonthly.toLocaleString("fr-FR")} FCFA</span>
              <span className="font-semibold text-fg">12 mois pour le prix de 11</span>
            </div>
          ) : null}
        </div>

        {/* Plafonds de capacité */}
        <div className="mt-4 rounded-xl border border-border/15 bg-surface-sunken/40 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Capacité incluse
          </p>
          <div className="mt-1.5 space-y-1 text-xs font-semibold text-fg">
            <div className="flex items-center justify-between">
              <span className="text-muted font-normal">{plan.limits.unitsLabel} :</span>
              <span>{plan.limits.unitsMax}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted font-normal">Utilisateurs :</span>
              <span>{plan.limits.usersMax}</span>
            </div>
          </div>
        </div>

        {/* Avantages inclus */}
        <ul className="mt-4 space-y-2 flex-1" role="list">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-muted">
              <CheckIcon className="h-3.5 w-3.5 shrink-0 text-muted mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bouton CTA ancré en bas */}
      <div className="mt-6 pt-4 border-t border-border/10">
        <Link
          href={registerUrl}
          className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-center text-xs sm:text-sm font-bold transition-colors ${
            isRecommended
              ? "bg-(--accent) text-(--accent-ink) hover:bg-(--accent-hover) shadow-xs"
              : "border border-border/30 bg-surface text-fg hover:bg-surface-sunken"
          }`}
        >
          <span>{isRecommended ? "Choisir la formule Pro" : "Sélectionner cette formule"}</span>
          <svg
            className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3.333 8h9.334M8.667 4l4 4-4 4" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * SECTION PRICING PRINCIPALE
 * -------------------------------------------------------------------------- */
export function PricingSection() {
  const [selectedCategory, setSelectedCategory] = useState<EstablishmentCategory>("residence");
  const [billing, setBilling] = useState<BillingCycle>("monthly");

  const currentCategory = CATEGORY_PRICING[selectedCategory];

  return (
    <section
      id="tarifs"
      aria-labelledby="tarifs-titre"
      className="scroll-mt-20 border-t border-border/10 py-16 sm:py-24"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* En-tête de section */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-(--accent-text) sm:text-sm">
            Abonnements SaaS &amp; Tarifs Officiels
          </p>
          <h2
            id="tarifs-titre"
            className="mt-3 text-balance text-2xl font-black tracking-tight text-fg sm:text-3xl lg:text-4xl"
          >
            Des formules adaptées à votre catégorie d&apos;établissement
          </h2>
          <p className="mt-3 text-pretty text-sm font-medium leading-relaxed text-muted sm:text-base">
            Profitez d&apos;<strong>1 mois gratuit sans engagement</strong> sur l&apos;ensemble de nos offres.
            Choisissez votre type d&apos;activité pour afficher la grille de référence et ses plafonds de capacité.
          </p>
        </div>

        {/* Ligne 1 : Boutons Catégories parfaitement alignés et stylisés avec vraies icônes SVG */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          {[
            { id: "residence" as const, label: "Chambre meublée / Résidence", Icon: ResidenceIcon },
            { id: "hotel" as const, label: "Hôtel", Icon: HotelIcon },
            { id: "agency" as const, label: "Agence Immobilière", Icon: AgencyIcon },
          ].map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const Icon = cat.Icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex h-11 items-center justify-center gap-2.5 rounded-2xl px-5 text-xs font-bold transition-all sm:text-sm shadow-xs ${
                  isSelected
                    ? "bg-(--accent) text-(--accent-ink) shadow-md"
                    : "border border-border/25 bg-surface-raised text-fg/80 hover:bg-surface-sunken hover:text-fg"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Ligne 2 : Commutateur Facturation Mensuelle / Annuelle parfaitement centré et calibré */}
        <div className="mt-6 flex items-center justify-center">
          <div className="inline-flex items-center rounded-2xl border border-border/30 bg-surface-raised p-1.5 shadow-xs">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={`inline-flex h-9 items-center justify-center rounded-xl px-4 text-xs font-bold transition-all sm:text-sm ${
                billing === "monthly"
                  ? "bg-(--accent) text-(--accent-ink) shadow-xs"
                  : "text-muted hover:text-fg"
              }`}
            >
              Facturation Mensuelle
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              className={`inline-flex h-9 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition-all sm:text-sm ${
                billing === "annual"
                  ? "bg-(--accent) text-(--accent-ink) shadow-xs"
                  : "text-muted hover:text-fg"
              }`}
            >
              <span>Facturation Annuelle</span>
              <span className="rounded-md bg-surface-sunken border border-border/20 px-1.5 py-0.5 text-[10px] font-bold text-fg">
                1 mois offert
              </span>
            </button>
          </div>
        </div>

        {/* Description de la catégorie sélectionnée */}
        <p className="mx-auto mt-4 max-w-xl text-center text-xs font-medium text-muted">
          {currentCategory.description}
        </p>

        {/* Grille des 3 cartes avec items-stretch pour égaliser la hauteur et aligner les boutons */}
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8 items-stretch">
          {currentCategory.plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              category={selectedCategory}
              billing={billing}
            />
          ))}
        </div>

        {/* Note indicative de bas de section */}
        <p className="mt-6 text-center text-xs font-medium text-muted">
          * Les montants en euros (€) et en dollars ($) sont fournis à titre indicatif.
        </p>

        {/* Blocs d'éclaircissements avec vraies icônes SVG */}
        <div className="mt-8 grid gap-4 rounded-3xl border border-border/20 bg-surface-sunken/60 p-6 sm:grid-cols-2 sm:gap-6 sm:p-8">
          <div className="flex items-start gap-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--accent)/15 text-(--accent-text)">
              <TargetIcon className="h-5 w-5" />
            </span>
            <div>
              <h4 className="text-sm font-extrabold text-fg">Périmètre des abonnements SaaS</h4>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Ces tarifs concernent exclusivement l&apos;utilisation du logiciel de gestion SAMA HOME. Ils sont distincts
                des prix de location (à la nuitée, journée ou mois) que vous facturez librement à vos clients.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--accent)/15 text-(--accent-text)">
              <ShieldIcon className="h-5 w-5" />
            </span>
            <div>
              <h4 className="text-sm font-extrabold text-fg">Respect des plafonds &amp; Données protégées</h4>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Lorsque la limite de chambres ou de biens est atteinte, seules les nouvelles créations sont bloquées.
                Vos données existantes ne sont jamais supprimées ni désactivées automatiquement.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
