import Image from "next/image";
import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import {
  ArrowRightIcon,
  BedIcon,
  BuildingIcon,
  CalendarIcon,
  CheckIcon,
  ExpenseIcon,
  KeyIcon,
  LockIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { FileTextIcon, WhatsAppGlyph } from "@/components/landing/landing-icons";
import { DashboardPreview, PhonePreview, PlanningPreview } from "@/components/landing/product-preview";
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from "@/components/landing/landing-header";
import { COMPANY_LEGAL_INFO } from "@/lib/company-info";
import type { Messages } from "@/lib/i18n/messages";
import { T } from "@/components/i18n/i18n-provider";
import { getT } from "@/lib/i18n/server";

const WRAP = "mx-auto w-full max-w-6xl";
const SECTION = "scroll-mt-16 px-4 py-20 sm:px-6 sm:py-28 lg:px-8";
const PANEL = "rounded-3xl border border-border/15 bg-surface-raised";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

export function whatsappUrl(message: string): string {
  const digits = COMPANY_LEGAL_INFO.phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-[0.14em] text-(--accent-text)">{children}</p>;
}

function SectionHeading({
  id,
  eyebrow,
  title,
  subtitle,
}: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
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

// ---------------------------------------------------------------------------------------------
// 1. Hero : le produit, pour qui, le résultat, la suite.
// ---------------------------------------------------------------------------------------------
export function HeroSection() {
  return (
    <section id="accueil" aria-labelledby="hero-titre" className="px-4 pb-20 pt-14 sm:px-6 sm:pb-28 sm:pt-20 lg:px-8">
      <div className={`${WRAP} grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.02fr_1fr] lg:gap-10`}>
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-border/20 bg-surface-raised px-3.5 py-1.5 text-xs font-semibold text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <T>Résidences meublées · Hôtels et agences bientôt</T>
          </p>
          <h1
            id="hero-titre"
            className="mt-6 text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-fg sm:text-5xl lg:text-[3.6rem]"
          >
            <T>Vos logements, réservations et paiements. Au même endroit.</T>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
            <T>Fini le cahier et les fichiers Excel. Suivez vos disponibilités, encaissez en espèces, Wave ou Orange Money
            et éditez vos contrats, depuis votre téléphone ou votre ordinateur.</T>
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className={`${BUTTON_PRIMARY} !h-12 !px-7 !text-base`}>
              <T>Démarrer l&apos;essai gratuit</T>
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden />
            </Link>
            <Link href="/login" className={`${BUTTON_SECONDARY} !h-12 !px-7 !text-base`}>
              <T>Se connecter</T>
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-muted">
            {["1 mois d'essai gratuit", "Rien à installer", "Wave et Orange Money"].map((item) => (
              <li key={item} className="inline-flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
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
// 2. Activités : un espace par activité, avec le statut réel de chacune.
// ---------------------------------------------------------------------------------------------
export function OffersSection({ m }: { m: Messages }) {
  const o = m.landing.offers;
  const planned = [
    { icon: BedIcon, ...o.hotel, mode: "HOTEL" },
    { icon: BuildingIcon, ...o.agency, mode: "AGENCY" },
  ];
  return (
    <section id="activites" aria-labelledby="activites-titre" className={`${SECTION} border-t border-border/10 bg-surface-raised/40`}>
      <div className={WRAP}>
        <SectionHeading id="activites-titre" eyebrow="Activités" title={o.title} subtitle={o.subtitle} />

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-[1.25fr_1fr_1fr]">
          <article className="flex flex-col rounded-3xl border border-(--accent)/40 bg-surface p-7 shadow-card sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <IconBadge icon={KeyIcon} />
              <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                {m.common.available}
              </span>
            </div>
            <h3 className="mt-6 text-2xl font-extrabold text-fg">{o.residence.name}</h3>
            <p className="mt-1 text-sm font-semibold text-(--accent-text)">{o.residence.tagline}</p>
            <p className="mt-4 text-pretty leading-relaxed text-muted"><T>{o.residence.description}</T></p>
            <Link href="/register?mode=RESIDENCE" className={`${BUTTON_PRIMARY} mt-8 self-start`}>
              {o.residence.cta}
              <ArrowRightIcon className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </Link>
          </article>

          {planned.map((item) => (
            <article key={item.mode} className={`${PANEL} flex flex-col p-7 sm:p-8`}>
              <div className="flex items-start justify-between gap-3">
                <IconBadge icon={item.icon} />
                <span className="rounded-full bg-fg/8 px-3 py-1 text-xs font-bold text-muted">{m.common.soon}</span>
              </div>
              <h3 className="mt-6 text-xl font-extrabold text-fg">{item.name}</h3>
              <p className="mt-1 text-sm font-semibold text-muted">{item.tagline}</p>
              <p className="mt-4 flex-1 text-pretty text-sm leading-relaxed text-muted">
                <span className="font-semibold text-fg">{o.plannedLabel}</span> {item.planned}
              </p>
              <a
                href={whatsappUrl(item.whatsappMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className={`${BUTTON_SECONDARY} mt-6 self-start`}
              >
                <WhatsAppGlyph className="h-4 w-4" />
                {item.cta}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// 3. Fonctionnalités de la Résidence : mosaïque, les deux preuves fortes d'abord.
// ---------------------------------------------------------------------------------------------
export async function FeaturesSection({ m }: { m: Messages }) {
  const t = await getT();
  const r = m.landing.residence;
  const [homes, bookings, availability, payments, expenses, contracts] = r.items;
  const small = [
    { icon: BuildingIcon, item: homes },
    { icon: ExpenseIcon, item: expenses },
    { icon: FileTextIcon, item: contracts },
  ];
  return (
    <section id="fonctionnalites" aria-labelledby="fonctionnalites-titre" className={`${SECTION} border-t border-border/10`}>
      <div className={WRAP}>
        <SectionHeading id="fonctionnalites-titre" eyebrow="Résidence" title={r.title} subtitle={r.subtitle} />

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <article className={`${PANEL} p-7 sm:p-8 lg:col-span-2`}>
            <IconBadge icon={CalendarIcon} />
            <h3 className="mt-5 text-xl font-extrabold text-fg">
              {bookings.title.replace(" et ", ", ")} et {availability.title.toLowerCase()}
            </h3>
            <p className="mt-2 max-w-xl text-pretty text-sm leading-relaxed text-muted sm:text-base">
              <T>{bookings.text}</T> <T>{availability.text}</T>
            </p>
            <PlanningPreview />
          </article>

          <article className={`${PANEL} flex flex-col p-7 sm:p-8`}>
            <IconBadge icon={WalletIcon} />
            <h3 className="mt-5 text-xl font-extrabold text-fg"><T>{payments.title}</T></h3>
            <p className="mt-2 flex-1 text-pretty text-sm leading-relaxed text-muted sm:text-base"><T>{payments.text}</T></p>
            <ul className="mt-6 flex flex-wrap gap-2" aria-label={t("Moyens de paiement")}>
              <li className="rounded-full border border-border/20 bg-surface px-3 py-1.5 text-xs font-bold text-fg"><T>Espèces</T></li>
              {[
                { logo: "/images/payments/wave.png", name: "Wave" },
                { logo: "/images/payments/orange-money.png", name: "Orange Money" },
              ].map((p) => (
                <li
                  key={p.name}
                  className="inline-flex items-center gap-2 rounded-full border border-border/20 bg-surface py-1 ps-1.5 pe-3 text-xs font-bold text-fg"
                >
                  <Image src={p.logo} alt="" width={20} height={20} className="h-5 w-5 rounded-full" />
                  {p.name}
                </li>
              ))}
            </ul>
          </article>

          {small.map(({ icon, item }) => (
            <article key={item.title} className={`${PANEL} p-7`}>
              <IconBadge icon={icon} />
              <h3 className="mt-5 text-lg font-extrabold text-fg"><T>{item.title}</T></h3>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-muted"><T>{item.text}</T></p>
            </article>
          ))}
        </div>

        <p className="mt-6 text-sm text-muted">{r.footnote}</p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// 4. Comment ça marche + rôles.
// ---------------------------------------------------------------------------------------------
export function HowItWorksSection({ m }: { m: Messages }) {
  const d = m.landing.demo;
  return (
    <section aria-labelledby="etapes-titre" className={`${SECTION} border-t border-border/10 bg-surface-raised/40`}>
      <div className={WRAP}>
        <SectionHeading id="etapes-titre" eyebrow="Au quotidien" title="Une journée type avec SAMA HOME" subtitle={d.subtitle} />
        <ol className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {d.steps.map((step, index) => (
            <li key={step.title} className="relative border-t-2 border-(--accent) pt-5">
              <span className="text-sm font-extrabold tabular-nums text-(--accent-text)">0{index + 1}</span>
              <h3 className="mt-2 text-lg font-extrabold text-fg">{step.title.replace(/^\d+\.\s*/, "")}</h3>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-muted"><T>{step.text}</T></p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function RolesSection({ m }: { m: Messages }) {
  const r = m.landing.roles;
  return (
    <section id="roles" aria-labelledby="roles-titre" className={`${SECTION} border-t border-border/10`}>
      <div className={`${WRAP} grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16`}>
        <SectionHeading id="roles-titre" eyebrow="Équipe" title={r.title} subtitle={r.subtitle} />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {[
            { icon: LockIcon, ...r.admin },
            { icon: UsersIcon, ...r.employee },
          ].map((role) => (
            <article key={role.name} className={`${PANEL} p-7`}>
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
// 5. Où l'utiliser (disponible / en préparation, sans rien promettre).
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
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                  row.ready ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : "bg-fg/8 text-muted"
                }`}
              >
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
// 6. Appel final.
// ---------------------------------------------------------------------------------------------
export function FinalCtaSection() {
  return (
    <section aria-labelledby="cta-titre" className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
      <div className={`${WRAP} rounded-3xl bg-(--accent) px-6 py-14 text-center text-(--accent-ink) sm:px-12 sm:py-16`}>
        <h2 id="cta-titre" className="mx-auto max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
          <T>Testez SAMA HOME gratuitement pendant 1 mois.</T>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-base opacity-85 sm:text-lg">
          <T>Créez l&apos;espace de votre résidence, ajoutez vos logements et enregistrez votre première réservation.</T>
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-(--accent-ink) px-7 text-base font-extrabold text-(--accent) transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent-ink)"
          >
            <T>Démarrer l&apos;essai gratuit</T>
            <ArrowRightIcon className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-(--accent-ink)/40 px-7 text-base font-bold transition hover:bg-(--accent-ink)/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent-ink)"
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
// 7. Pied de page.
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
              <T>Gestion de résidences meublées au Sénégal : logements, réservations, paiements et caisse.</T>
            </p>
            <p className="mt-3 text-xs text-muted">{COMPANY_LEGAL_INFO.address}<T>, Dakar.</T></p>
          </div>

          <nav aria-label={t("Produit")}>
            <p className="font-bold text-fg"><T>Produit</T></p>
            <ul className="mt-3 space-y-2">
              <li><a href="#activites" className={link}><T>Activités</T></a></li>
              <li><a href="#fonctionnalites" className={link}><T>Fonctionnalités</T></a></li>
              <li><a href="#tarifs" className={link}><T>Tarifs</T></a></li>
              <li><Link href="/register" className={link}><T>Essai gratuit</T></Link></li>
            </ul>
          </nav>

          <nav aria-label={t("Compte")}>
            <p className="font-bold text-fg"><T>Compte</T></p>
            <ul className="mt-3 space-y-2">
              <li><Link href="/login" className={link}><T>Se connecter</T></Link></li>
              <li><Link href="/register" className={link}><T>Créer un compte</T></Link></li>
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
