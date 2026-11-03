import Image from "next/image";
import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import {
  ArrowRightIcon,
  BedIcon,
  BuildingIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  ExpenseIcon,
  KeyIcon,
  LockIcon,
  ShieldIcon,
  SparklesIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { ChartIcon, FileTextIcon, GlobeIcon, WhatsAppGlyph } from "@/components/landing/landing-icons";
import { DashboardPreview, PhonePreview, PlanningPreview } from "@/components/landing/product-preview";
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from "@/components/landing/landing-header";
import { COMPANY_LEGAL_INFO } from "@/lib/company-info";
import { HOTEL_MODULE_AVAILABLE } from "@/lib/landing-config";
import type { Messages } from "@/lib/i18n/messages";
import { T } from "@/components/i18n/i18n-provider";
import { getT } from "@/lib/i18n/server";

const WRAP = "mx-auto w-full max-w-6xl";
const SECTION = "scroll-mt-16 px-4 py-20 sm:px-6 sm:py-28 lg:px-8";
const PANEL = "rounded-3xl border border-border/15 bg-surface-raised";
const CARD_LIFT = "hover-card-lift";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

export function whatsappUrl(message: string): string {
  const digits = COMPANY_LEGAL_INFO.phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-[0.14em] text-(--accent-text)">{children}</p>;
}

function SectionHeading({ id, eyebrow, title, subtitle }: { id: string; eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="max-w-2xl">
      <Eyebrow><T>{eyebrow}</T></Eyebrow>
      <h2 id={id} className="mt-3 text-balance text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
        <T>{title}</T>
      </h2>
      {subtitle ? <p className="mt-4 text-pretty text-base leading-relaxed text-muted sm:text-lg"><T>{subtitle}</T></p> : null}
    </div>
  );
}

function IconBadge({ icon: Icon }: { icon: IconType }) {
  return (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-(--accent)/12 text-(--accent-text)">
      <Icon className="h-5 w-5" aria-hidden />
    </span>
  );
}

function Tick({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-snug text-muted">
      <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

// ---------------------------------------------------------------------------------------------
// 1. Hero : le produit, pour qui, le résultat, la suite.
// ---------------------------------------------------------------------------------------------
export function HeroSection() {
  return (
    <section id="accueil" aria-labelledby="hero-titre" className="relative overflow-hidden px-4 pb-20 pt-14 sm:px-6 sm:pb-28 sm:pt-20 lg:px-8">
      <div aria-hidden className="animate-ambient-glow pointer-events-none absolute start-1/2 top-0 h-[28rem] w-[46rem] -translate-x-1/2 rounded-full bg-(--accent)/20 blur-3xl" />
      <div className={`${WRAP} relative grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.02fr_1fr] lg:gap-10`}>
        <div className="animate-fade-in-up">
          <p className="inline-flex items-center gap-2 rounded-full border border-border/20 bg-surface-raised px-3.5 py-1.5 text-xs font-semibold text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <T>Résidences meublées et hôtels · Sénégal</T>
          </p>
          <h1 id="hero-titre" className="mt-6 text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-fg sm:text-5xl lg:text-[3.6rem]">
            <T>Gérez vos logements, vos séjours et votre caisse depuis un seul outil.</T>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
            <T>SAMA HOME remplace le cahier et les fichiers Excel : planning des réservations, encaissements en espèces, Wave et Orange Money, contrats et reçus en PDF, rapports. Sur téléphone comme sur ordinateur.</T>
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className={`${BUTTON_PRIMARY} btn-shimmer !h-12 !px-7 !text-base`}>
              <T>Démarrer l&apos;essai gratuit</T>
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden />
            </Link>
            <a href="#tarifs" className={`${BUTTON_SECONDARY} !h-12 !px-7 !text-base`}>
              <T>Voir les tarifs</T>
            </a>
          </div>

          <ul className="mt-8 grid grid-cols-1 gap-x-6 gap-y-2.5 text-sm font-medium text-muted sm:grid-cols-2">
            {["1 mois d'essai gratuit", "Rien à installer", "Wave, Orange Money et carte", "Vos données restent à vous"].map((item) => (
              <li key={item} className="inline-flex items-center gap-2">
                <CheckIcon className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <T>{item}</T>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative pb-10 sm:pb-0 lg:ps-6">
          <DashboardPreview />
          <div className="absolute -bottom-2 end-3 hidden sm:block lg:-bottom-8 lg:-end-2">
            <PhonePreview />
          </div>
          <p className="mt-4 max-w-[15rem] text-xs text-muted sm:mt-6"><T>Aperçu illustratif : ce n&apos;est pas une capture de l&apos;application.</T></p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// 2. Fonctionnalités : une carte par écran réel de l'application.
// ---------------------------------------------------------------------------------------------
export async function ModulesSection() {
  const t = await getT();
  const small: { icon: IconType; title: string; text: string; badge?: string }[] = [
    { icon: FileTextIcon, title: "Contrats et reçus en PDF", text: "10 présentations de contrats, de quittances et de tickets de caisse, aux couleurs de votre établissement." },
    { icon: WhatsAppGlyph, title: "Messages WhatsApp aux clients", text: "Envoyez le Wi-Fi, les règles et les numéros utiles depuis la fiche d'une location, en un geste." },
    { icon: UserIcon, title: "Fiches clients", text: "Coordonnées, pièce d'identité, historique des séjours et soldes restants au même endroit." },
    { icon: ExpenseIcon, title: "Dépenses classées", text: "Catégories, moyen de paiement et justificatif : vous savez où part l'argent." },
    { icon: ChartIcon, title: "Rapports financiers", text: "Recettes, dépenses et résultat par période, comparés à la précédente.", badge: "Pro" },
    { icon: GlobeIcon, title: "Plusieurs espaces, deux langues", text: "Plusieurs établissements sur un même compte, chacun séparé. Interface en français et en anglais." },
  ];
  return (
    <section id="fonctionnalites" aria-labelledby="fonctionnalites-titre" className={`${SECTION} border-t border-border/10`}>
      <div className={WRAP}>
        <SectionHeading
          id="fonctionnalites-titre"
          eyebrow="Fonctionnalités"
          title="Tout ce qu'il faut pour exploiter vos logements au quotidien"
          subtitle="Chaque carte correspond à un écran de l'application, pas à une promesse."
        />

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <article className={`${PANEL} ${CARD_LIFT} p-7 sm:p-8 lg:col-span-2`}>
            <IconBadge icon={CalendarIcon} />
            <h3 className="mt-5 text-xl font-extrabold text-fg"><T>Réservations, séjours et disponibilités</T></h3>
            <p className="mt-2 max-w-xl text-pretty text-sm leading-relaxed text-muted sm:text-base">
              <T>Le planning montre chaque logement jour par jour. Avant de confirmer, SAMA HOME vérifie qu&apos;il est libre. Arrivées, départs du jour et prolongations se gèrent depuis l&apos;accueil.</T>
            </p>
            <PlanningPreview />
          </article>

          <article className={`${PANEL} ${CARD_LIFT} flex flex-col p-7 sm:p-8`}>
            <IconBadge icon={WalletIcon} />
            <h3 className="mt-5 text-xl font-extrabold text-fg"><T>Caisse et paiements</T></h3>
            <p className="mt-2 flex-1 text-pretty text-sm leading-relaxed text-muted sm:text-base">
              <T>Encaissez, suivez les soldes, ouvrez et clôturez la caisse. L&apos;écart entre l&apos;argent attendu et l&apos;argent compté est calculé et expliqué.</T>
            </p>
            <ul className="mt-6 flex flex-wrap gap-2" aria-label={t("Moyens de paiement")}>
              <li className="rounded-full border border-border/20 bg-surface px-3 py-1.5 text-xs font-bold text-fg"><T>Espèces</T></li>
              {[
                { logo: "/images/payments/wave.png", name: "Wave" },
                { logo: "/images/payments/orange-money.png", name: "Orange Money" },
              ].map((p) => (
                <li key={p.name} className="inline-flex items-center gap-2 rounded-full border border-border/20 bg-surface py-1 ps-1.5 pe-3 text-xs font-bold text-fg">
                  <Image src={p.logo} alt="" width={20} height={20} className="h-5 w-5 rounded-full" />
                  {p.name}
                </li>
              ))}
            </ul>
          </article>

          {small.map(({ icon, title, text, badge }) => (
            <article key={title} className={`${PANEL} ${CARD_LIFT} p-7`}>
              <div className="flex items-start justify-between gap-3">
                <IconBadge icon={icon} />
                {badge ? <span className="rounded-full bg-(--accent)/12 px-2.5 py-1 text-[11px] font-extrabold text-(--accent-text)">{badge}</span> : null}
              </div>
              <h3 className="mt-5 text-lg font-extrabold text-fg"><T>{title}</T></h3>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-muted"><T>{text}</T></p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// 3. Activités : ce qui change selon le métier, avec le statut réel de chacune.
// ---------------------------------------------------------------------------------------------
export function ActivitiesSection({ m }: { m: Messages }) {
  const o = m.landing.offers;
  return (
    <section id="activites" aria-labelledby="activites-titre" className={`${SECTION} border-t border-border/10 bg-surface-raised/40`}>
      <div className={WRAP}>
        <SectionHeading
          id="activites-titre"
          eyebrow="Activités"
          title="Un espace adapté à votre métier"
          subtitle="Les mêmes outils, avec les mots et les écrans de chaque activité. Chaque établissement a son espace, ses données et son abonnement."
        />

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <article className={`${PANEL} ${CARD_LIFT} flex flex-col border-(--accent)/40 bg-surface p-7 shadow-card sm:p-8`}>
            <div className="flex items-start justify-between gap-3">
              <IconBadge icon={KeyIcon} />
              <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">{m.common.available}</span>
            </div>
            <h3 className="mt-6 text-2xl font-extrabold text-fg"><T>Résidence meublée</T></h3>
            <p className="mt-1 text-sm font-semibold text-(--accent-text)"><T>Chambres et appartements en location</T></p>
            <ul className="mt-5 flex-1 space-y-2.5">
              <Tick><T>Locations à la nuit, à la semaine ou au mois</T></Tick>
              <Tick><T>Loyers, acomptes et soldes restants</T></Tick>
              <Tick><T>Contrat de bail et quittance en PDF</T></Tick>
              <Tick><T>Fin de location et prolongation suivies</T></Tick>
            </ul>
            <Link href="/register?mode=RESIDENCE" className={`${BUTTON_PRIMARY} mt-8 self-start`}>
              <T>Démarrer avec la Résidence</T>
              <ArrowRightIcon className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </Link>
          </article>

          <article className={`${PANEL} ${CARD_LIFT} flex flex-col p-7 sm:p-8 ${HOTEL_MODULE_AVAILABLE ? "border-(--accent)/40 bg-surface shadow-card" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <IconBadge icon={BedIcon} />
              {HOTEL_MODULE_AVAILABLE ? (
                <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">{m.common.available}</span>
              ) : (
                <span className="rounded-full bg-fg/8 px-3 py-1 text-xs font-bold text-muted">{m.common.soon}</span>
              )}
            </div>
            <h3 className="mt-6 text-2xl font-extrabold text-fg"><T>Hôtel</T></h3>
            <p className="mt-1 text-sm font-semibold text-(--accent-text)"><T>Chambres, séjours et ménage</T></p>
            <ul className="mt-5 flex-1 space-y-2.5">
              <Tick><T>Planning des chambres sur 14 jours</T></Tick>
              <Tick><T>Ménage : chambre propre, à nettoyer, en cours</T></Tick>
              <Tick><T>Extras facturés au séjour (restaurant, blanchisserie…)</T></Tick>
              <Tick><T>Taux d&apos;occupation et indicateurs de l&apos;hôtel</T></Tick>
            </ul>
            {HOTEL_MODULE_AVAILABLE ? (
              <Link href="/register?mode=HOTEL" className={`${BUTTON_PRIMARY} mt-8 self-start`}>
                <T>Démarrer avec l&apos;Hôtel</T>
                <ArrowRightIcon className="h-4 w-4 rtl:rotate-180" aria-hidden />
              </Link>
            ) : (
              <a href={whatsappUrl(o.hotel.whatsappMessage)} target="_blank" rel="noopener noreferrer" className={`${BUTTON_SECONDARY} mt-8 self-start`}>
                <WhatsAppGlyph className="h-4 w-4" />
                {o.hotel.cta}
              </a>
            )}
          </article>

          <article className={`${PANEL} flex flex-col p-7 sm:p-8`}>
            <div className="flex items-start justify-between gap-3">
              <IconBadge icon={BuildingIcon} />
              <span className="rounded-full bg-fg/8 px-3 py-1 text-xs font-bold text-muted">{m.common.soon}</span>
            </div>
            <h3 className="mt-6 text-2xl font-extrabold text-fg"><T>Agence immobilière</T></h3>
            <p className="mt-1 text-sm font-semibold text-muted"><T>Biens, propriétaires et loyers</T></p>
            <p className="mt-5 flex-1 text-pretty text-sm leading-relaxed text-muted">
              <span className="font-semibold text-fg">{o.plannedLabel}</span> {o.agency.planned}
            </p>
            <a href={whatsappUrl(o.agency.whatsappMessage)} target="_blank" rel="noopener noreferrer" className={`${BUTTON_SECONDARY} mt-8 self-start`}>
              <WhatsAppGlyph className="h-4 w-4" />
              {o.agency.cta}
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// 4. Une journée type : le vrai déroulé, de l'accueil à la clôture de caisse.
// ---------------------------------------------------------------------------------------------
export function DailyFlowSection() {
  const steps = [
    { icon: ClockIcon, title: "Le matin, l'accueil", text: "Arrivées, départs et soldes à recouvrer du jour, sur un seul écran." },
    { icon: KeyIcon, title: "À l'arrivée du client", text: "Vous choisissez le logement, le tarif et les dates ; la disponibilité est vérifiée." },
    { icon: WalletIcon, title: "Dans la journée", text: "Chaque paiement est enregistré, avec son reçu, en espèces, Wave ou Orange Money." },
    { icon: SparklesIcon, title: "Le soir, la clôture", text: "Vous comptez la caisse. SAMA HOME affiche l'écart et garde la trace." },
  ] as const;
  return (
    <section aria-labelledby="etapes-titre" className={`${SECTION} border-t border-border/10`}>
      <div className={WRAP}>
        <SectionHeading id="etapes-titre" eyebrow="Au quotidien" title="Une journée type avec SAMA HOME" subtitle="Quatre gestes qui remplacent le cahier, le tableur et la calculette." />
        <ol className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {steps.map((step, index) => (
            <li key={step.title} className="relative border-t-2 border-(--accent) pt-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold tabular-nums text-(--accent-text)">0{index + 1}</span>
                <step.icon className="h-5 w-5 text-muted" aria-hidden />
              </div>
              <h3 className="mt-3 text-lg font-extrabold text-fg"><T>{step.title}</T></h3>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-muted"><T>{step.text}</T></p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// 5. Équipe et sécurité.
// ---------------------------------------------------------------------------------------------
export function TeamSection({ m }: { m: Messages }) {
  const r = m.landing.roles;
  const trust = [
    { icon: LockIcon, title: "Chacun voit son périmètre", text: "L'administrateur choisit les écrans ouverts à chaque employé." },
    { icon: ShieldIcon, title: "Un journal des actions", text: "Les opérations sensibles (caisse, paiements, suppressions) sont tracées." },
    { icon: KeyIcon, title: "Vos données vous restent", text: "Même si l'abonnement expire, rien n'est supprimé : vous gardez la consultation." },
  ] as const;
  return (
    <section id="roles" aria-labelledby="roles-titre" className={`${SECTION} border-t border-border/10 bg-surface-raised/40`}>
      <div className={`${WRAP} grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16`}>
        <div>
          <SectionHeading id="roles-titre" eyebrow="Équipe et sécurité" title="Votre équipe travaille, vous gardez le contrôle" subtitle={r.subtitle} />
          <ul className="mt-8 space-y-5">
            {trust.map((item) => (
              <li key={item.title} className="flex items-start gap-4">
                <IconBadge icon={item.icon} />
                <div>
                  <p className="font-extrabold text-fg"><T>{item.title}</T></p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted"><T>{item.text}</T></p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-1 content-start gap-5 sm:grid-cols-2">
          {[
            { icon: UserIcon, ...r.admin },
            { icon: UsersIcon, ...r.employee },
          ].map((role) => (
            <article key={role.name} className={`${PANEL} ${CARD_LIFT} bg-surface p-7`}>
              <IconBadge icon={role.icon} />
              <h3 className="mt-5 text-lg font-extrabold text-fg">{role.name}</h3>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-muted"><T>{role.text}</T></p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// 6. Questions fréquentes (réponses fidèles au fonctionnement réel).
// ---------------------------------------------------------------------------------------------
const FAQ: readonly { q: string; a: string }[] = [
  { q: "Combien de temps dure l'essai gratuit ?", a: "1 mois. Toutes les fonctions sont ouvertes pendant l'essai, sans carte bancaire à saisir à l'inscription." },
  { q: "Que se passe-t-il à la fin de l'essai ?", a: "Vos données sont conservées. Vous choisissez une formule et vous la réglez en ligne. Sans paiement, vous pouvez toujours consulter vos données, mais les nouvelles créations sont bloquées." },
  { q: "Comment payer l'abonnement ?", a: "En ligne, par Wave, Orange Money ou carte bancaire. L'abonnement est prolongé dès que le paiement est confirmé." },
  { q: "Faut-il installer quelque chose ?", a: "Non. SAMA HOME s'utilise dans le navigateur, sur téléphone, tablette ou ordinateur. Une application installable est en préparation." },
  { q: "Puis-je gérer plusieurs établissements ?", a: "Oui. Un même compte peut ouvrir plusieurs espaces. Chacun a ses données, ses réglages et son abonnement." },
  { q: "Mes employés voient-ils tout ?", a: "Non. L'administrateur choisit, employé par employé, les écrans et les actions autorisés." },
  { q: "L'application existe-t-elle en anglais ?", a: "Oui, en français et en anglais, au choix de chaque personne. Les documents PDF et les messages WhatsApp aux clients restent en français." },
];

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-titre" className={`${SECTION} border-t border-border/10`}>
      <div className={`${WRAP} grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16`}>
        <SectionHeading id="faq-titre" eyebrow="Questions fréquentes" title="Ce qu'on nous demande le plus" subtitle="Une autre question ? Écrivez-nous sur WhatsApp, nous répondons vite." />
        <div className="divide-y divide-border/15 rounded-3xl border border-border/15 bg-surface-raised">
          {FAQ.map((item) => (
            <details key={item.q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-start text-base font-extrabold text-fg">
                <T>{item.q}</T>
                <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fg/8 text-lg leading-none text-muted transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted sm:text-base"><T>{item.a}</T></p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// 7. Où l'utiliser (disponible / en préparation, sans rien promettre).
// ---------------------------------------------------------------------------------------------
export function AvailabilitySection({ m }: { m: Messages }) {
  const d = m.landing.download;
  return (
    <section id="application" aria-labelledby="application-titre" className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
      <div className={`${WRAP} ${PANEL} grid grid-cols-1 gap-8 p-8 sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:items-center`}>
        <div>
          <Eyebrow><T>Application</T></Eyebrow>
          <h2 id="application-titre" className="mt-3 text-balance text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">
            <T>{d.title}</T>
          </h2>
          <p className="mt-3 max-w-lg text-pretty text-sm leading-relaxed text-muted sm:text-base"><T>{d.subtitle}</T></p>
        </div>
        <ul className="divide-y divide-border/15 rounded-2xl border border-border/15 bg-surface">
          {[
            { name: d.web, text: d.webText, status: m.common.available, ready: true },
            { name: `${d.windows} · ${d.mac}`, text: d.appSoonText, status: m.common.soon, ready: false },
          ].map((row) => (
            <li key={row.name} className="flex items-start justify-between gap-4 p-5">
              <div>
                <p className="font-bold text-fg">{row.name}</p>
                <p className="mt-1 text-sm text-muted"><T>{row.text}</T></p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${row.ready ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : "bg-fg/8 text-muted"}`}>
                {row.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// 8. Appel final.
// ---------------------------------------------------------------------------------------------
export function FinalCtaSection() {
  return (
    <section aria-labelledby="cta-titre" className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
      <div className={`${WRAP} rounded-3xl bg-(--accent) px-6 py-14 text-center text-(--accent-ink) sm:px-12 sm:py-16`}>
        <h2 id="cta-titre" className="mx-auto max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
          <T>Testez SAMA HOME gratuitement pendant 1 mois.</T>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-base opacity-85 sm:text-lg">
          <T>Créez l&apos;espace de votre établissement, ajoutez vos logements et enregistrez votre première réservation.</T>
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-(--accent-ink) px-7 text-base font-extrabold text-(--accent) transition hover:opacity-90"
          >
            <T>Démarrer l&apos;essai gratuit</T>
            <ArrowRightIcon className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-(--accent-ink)/40 px-7 text-base font-bold transition hover:bg-(--accent-ink)/10"
          >
            <T>Se connecter</T>
          </Link>
        </div>
      </div>
    </section>
  );
}

export { ContactSection } from "@/components/landing/contact-section";

// ---------------------------------------------------------------------------------------------
// 9. Pied de page.
// ---------------------------------------------------------------------------------------------
export async function FooterSection() {
  const t = await getT();
  const link = "text-muted transition-colors hover:text-fg";
  return (
    <footer className="border-t border-border/15 px-4 py-14 text-sm sm:px-6 lg:px-8">
      <div className={WRAP}>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <p className="text-lg font-black tracking-wide text-fg">
              <span className="text-(--accent-text)">SAMA</span> HOME
            </p>
            <p className="mt-3 max-w-sm text-pretty leading-relaxed text-muted">
              <T>Gestion de résidences meublées et d&apos;hôtels au Sénégal : logements, réservations, paiements et caisse.</T>
            </p>
            <p className="mt-3 text-xs text-muted">{COMPANY_LEGAL_INFO.address}<T>, Dakar.</T></p>
          </div>

          <nav aria-label={t("Produit")}>
            <p className="font-bold text-fg"><T>Produit</T></p>
            <ul className="mt-3 space-y-2">
              <li><a href="#fonctionnalites" className={link}><T>Fonctionnalités</T></a></li>
              <li><a href="#activites" className={link}><T>Activités</T></a></li>
              <li><a href="#tarifs" className={link}><T>Tarifs</T></a></li>
              <li><a href="#faq" className={link}><T>Questions fréquentes</T></a></li>
            </ul>
          </nav>

          <nav aria-label={t("Compte")}>
            <p className="font-bold text-fg"><T>Compte</T></p>
            <ul className="mt-3 space-y-2">
              <li><Link href="/register" className={link}><T>Essai gratuit</T></Link></li>
              <li><Link href="/login" className={link}><T>Se connecter</T></Link></li>
              <li><Link href="/forgot-password" className={link}><T>Mot de passe oublié</T></Link></li>
            </ul>
          </nav>

          <div>
            <p className="font-bold text-fg"><T>Contact</T></p>
            <ul className="mt-3 space-y-2">
              <li><a href={whatsappUrl("Bonjour, j'ai une question sur SAMA HOME.")} target="_blank" rel="noopener noreferrer" className={link}>WhatsApp</a></li>
              <li><a href={`tel:${COMPANY_LEGAL_INFO.phone}`} className={link}>{COMPANY_LEGAL_INFO.formattedPhone}</a></li>
              <li><a href={`mailto:${COMPANY_LEGAL_INFO.supportEmail}`} className={link}>{COMPANY_LEGAL_INFO.supportEmail}</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border/15 pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            <T>Édité par</T> {COMPANY_LEGAL_INFO.commercialName} ({COMPANY_LEGAL_INFO.sigle}<T>) · NINEA :</T> {COMPANY_LEGAL_INFO.ninea} <T>· RCCM :</T>{" "}
            {COMPANY_LEGAL_INFO.rccm}
          </p>
          <p><T>© 2026 SAMA HOME. Tous droits réservés.</T></p>
        </div>
      </div>
    </footer>
  );
}
