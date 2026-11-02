import Link from "next/link";
import type { ReactNode } from "react";
import { T } from "@/components/i18n/i18n-provider";
import { getT } from "@/lib/i18n/server";

// Kit de pages : même langage que le tableau de bord (fond de page, panneaux, bordures fines, accent
// de la palette). Tout est rendu serveur ; aucune couleur en dur, uniquement les jetons de l'application.

/** Cadre d'une page : fond, marges et largeur identiques au tableau de bord. */
export function PageShell({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)] overflow-x-hidden bg-app-page px-4 pb-28 pt-4 font-sans text-app-text sm:px-6 sm:pt-5 lg:min-h-[calc(100dvh-60px)] lg:px-8 lg:pb-10 lg:pt-7">
      <div className={`mx-auto flex flex-col gap-5 lg:gap-6 ${narrow ? "max-w-3xl" : "max-w-[1360px]"}`}>{children}</div>
    </div>
  );
}

export type PageAction = { href: string; label: string; icon?: ReactNode };

export const PRIMARY_BUTTON =
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-brand-orange px-4 text-[13px] font-bold text-ink transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus";
export const SECONDARY_BUTTON =
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-app-line-strong bg-app-panel px-4 text-[13px] font-bold text-app-text-2 transition-colors hover:border-app-line-hover hover:bg-app-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus";

/**
 * En-tête de page : repère (espace, mode), titre, sous-titre et actions. Sur téléphone, les actions
 * passent sous le titre, pleine largeur et alignées.
 */
export async function PageHeader({
  title,
  subtitle,
  eyebrow,
  back,
  badge,
  actions = [],
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  back?: { href: string; label: string };
  /** Statut affiché à côté du titre. */
  badge?: ReactNode;
  actions?: PageAction[];
}) {
  const t = await getT();
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-app-muted hover:text-app-text focus-visible:outline-2 focus-visible:outline-app-focus">
            <span aria-hidden>←</span> <T>{back.label}</T>
          </Link>
        ) : null}
        {eyebrow ? <p className="text-xs font-semibold text-app-muted">{eyebrow}</p> : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="min-w-0 break-words text-[22px] font-extrabold leading-tight tracking-tight text-app-text sm:text-2xl lg:text-[28px]"><T>{title}</T></h1>
          {badge}
        </div>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-app-muted"><T>{subtitle}</T></p> : null}
      </div>
      {actions.length > 0 ? (
        <nav aria-label={t("Actions de la page")} className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:items-center">
          {actions.map((action, index) => (
            <Link key={action.href + action.label} href={action.href} className={`${index === 0 ? PRIMARY_BUTTON : SECONDARY_BUTTON} ${actions.length % 2 === 1 && index === 0 ? "col-span-2 sm:col-span-1" : ""}`}>
              {action.icon}
              <T>{action.label}</T>
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

/** Panneau : fond, bordure, titre facultatif. */
export function Surface({ title, subtitle, children, className = "" }: { title?: string; subtitle?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-app-line bg-app-panel p-4 sm:p-5 ${className}`}>
      {title ? (
        <header className="mb-4">
          <h2 className="text-sm font-bold text-app-text"><T>{title}</T></h2>
          {subtitle ? <p className="mt-0.5 text-xs text-app-muted"><T>{subtitle}</T></p> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

const TONES = {
  neutral: "bg-fg/8 text-app-text-2",
  good: "bg-success-bg text-success",
  warn: "bg-warning-bg text-warning",
  bad: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
} as const;

/** Pastille de statut : le texte porte toujours le sens, la couleur ne fait que le souligner. */
export function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${TONES[tone]}`}>{children}</span>;
}

/** Carte cliquable d'une liste (séjour, réservation, client…). */
export function ListCard({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-app-line bg-app-panel p-4 transition-colors hover:border-app-line-hover hover:bg-app-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
    >
      {children}
    </Link>
  );
}

/** Liste vide : dit ce qui manque et propose le premier geste utile. */
export function EmptyPanel({ title, text, action }: { title: string; text: string; action?: PageAction }) {
  return (
    <div className="rounded-2xl border border-dashed border-app-line-strong px-6 py-12 text-center">
      <p className="text-base font-extrabold text-app-text"><T>{title}</T></p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-app-muted"><T>{text}</T></p>
      {action ? (
        <Link href={action.href} className={`${PRIMARY_BUTTON} mt-5`}>
          <T>{action.label}</T>
        </Link>
      ) : null}
    </div>
  );
}

/** Paire « libellé / valeur » en ligne, pour les fiches. */
export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
      <dt className="text-app-muted"><T>{label}</T></dt>
      <dd className="text-right font-semibold text-app-text">{children}</dd>
    </div>
  );
}

/** Indicateur compact : libellé, valeur (jamais tronquée), précision. */
export function StatTile({ label, value, sub, tone = "default" }: { label: string; value: string; sub?: string; tone?: "default" | "good" | "warn" | "bad" }) {
  const valueTone = tone === "good" ? "text-app-good" : tone === "warn" ? "text-app-warn" : tone === "bad" ? "text-app-bad" : "text-app-text";
  return (
    <div className="min-w-0 rounded-2xl border border-app-line bg-app-panel p-3.5 sm:p-4">
      <p className="truncate text-[10px] font-bold uppercase tracking-wide text-app-muted sm:text-[11px]"><T>{label}</T></p>
      <p className={`mt-2 break-words text-base font-extrabold leading-tight tabular-nums sm:text-xl ${valueTone}`}>{value}</p>
      {sub ? <p className="mt-0.5 truncate text-[11px] text-app-muted"><T>{sub}</T></p> : null}
    </div>
  );
}

/** Message de confirmation (création, modification, encaissement…). */
export function Flash({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-xl border border-success/30 bg-success-bg px-4 py-3 text-sm font-bold text-success">
      {children}
    </p>
  );
}

const ACTION_TONES = {
  primary: "bg-brand-orange text-ink hover:brightness-110",
  secondary: "border border-app-line-strong bg-app-panel text-app-text-2 hover:bg-app-hover",
  warn: "border border-warning/40 bg-warning-bg text-app-warn hover:brightness-95",
  danger: "border border-danger/40 bg-danger-bg text-app-bad hover:brightness-95",
} as const;

/** Bouton-lien d'action pleine largeur, hauteur tactile. */
export function ActionLink({ href, tone = "secondary", children }: { href: string; tone?: keyof typeof ACTION_TONES; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus ${ACTION_TONES[tone]}`}
    >
      {children}
    </Link>
  );
}

/** Titre de section au-dessus d'un bloc, avec un lien facultatif à droite. */
export function SectionTitle({ children, action }: { children: ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-app-muted">{children}</h2>
      {action ? (
        <Link href={action.href} className="text-xs font-bold text-app-text-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-app-focus">
          <T>{action.label}</T>
        </Link>
      ) : null}
    </div>
  );
}
