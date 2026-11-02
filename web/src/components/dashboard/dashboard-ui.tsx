import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { ArrowRightIcon } from "@/components/ui/icons";
import { formatFcfa } from "@/lib/dashboard-metrics";
import type { DailyFinancialPoint } from "@/lib/dashboard-data";
import type { ShellMode } from "@/lib/business-mode";

// Éléments communs aux trois tableaux de bord. Même langage visuel que le shell de l'application
// (fond sombre, bordures fines, un accent par mode), aucun état client : tout est rendu serveur.

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * Identité de chaque mode : son nom. Les couleurs sont les mêmes pour tous les modes et suivent la
 * palette de l'établissement (Paramètres > Apparence) : action principale en couleur d'accent avec du
 * texte sombre (contraste vérifié dans l'éditeur), repères et anneaux en accent. Changer la palette
 * change donc aussi les tableaux de bord. Classes écrites en toutes lettres pour que Tailwind les détecte.
 */
const MODE_COLORS = {
  primary: "bg-brand-orange text-ink hover:brightness-110",
  soft: "bg-brand-orange/15 text-brand-orange",
  bar: "bg-brand-orange",
  ring: "focus-visible:outline-app-focus",
} as const;

export const MODE_THEME: Record<
  ShellMode,
  { label: string; primary: string; soft: string; bar: string; ring: string }
> = {
  RESIDENCE: { label: "Résidence", ...MODE_COLORS },
  HOTEL: { label: "Hôtel", ...MODE_COLORS },
  AGENCY: { label: "Agence immobilière", ...MODE_COLORS },
};

const PANEL = "rounded-2xl border border-app-line bg-app-panel";

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${PANEL} p-4 sm:p-5 ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-app-text">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-app-muted">{subtitle}</p> : null}
        </div>
        {action ? (
          <Link
            href={action.href}
            className="inline-flex shrink-0 items-center gap-1 rounded-md text-xs font-semibold text-app-muted transition-colors hover:text-app-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
          >
            {action.label}
            <ArrowRightIcon className="h-3 w-3" aria-hidden />
          </Link>
        ) : null}
      </header>
      {children}
    </section>
  );
}

export type QuickAction = { href: string; label: string; shortLabel?: string; hint: string; icon: IconType };

/**
 * En-tête de page. Ordinateur : titre à gauche, barre d'actions à droite (la première est l'action
 * principale du mode). Mobile : le titre seul, les actions passent en tuiles tactiles juste dessous.
 */
export function DashboardHeader({
  userName,
  spaceName,
  mode,
  now,
  actions,
}: {
  userName: string;
  spaceName: string;
  mode: ShellMode;
  now: Date;
  actions: QuickAction[];
}) {
  const firstName = userName.trim().split(/\s+/)[0] || userName;
  const longDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(now);
  const date = longDate.charAt(0).toUpperCase() + longDate.slice(1);
  const theme = MODE_THEME[mode];
  return (
    <>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className={`rounded-full px-2.5 py-1 font-bold ${theme.soft}`}>{theme.label}</span>
            <span className="truncate font-semibold text-app-text-2">{spaceName}</span>
            <span className="text-app-faint" aria-hidden>
              ·
            </span>
            <span className="text-app-muted">{date}</span>
          </div>
          <h1 className="mt-2.5 text-[22px] font-extrabold leading-tight tracking-tight text-app-text sm:text-2xl lg:text-[28px]">
            Bonjour, {firstName}
          </h1>
        </div>

        <nav aria-label="Actions rapides" className="hidden shrink-0 items-center gap-2 lg:flex">
          {actions.map((action, index) => (
            <Link
              key={action.href + action.label}
              href={action.href}
              title={action.hint}
              className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-[13px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${theme.ring} ${
                index === 0
                  ? theme.primary
                  : "border border-app-line-strong bg-app-panel text-app-text-2 hover:border-app-line-hover hover:bg-app-hover"
              }`}
            >
              <action.icon className="h-4 w-4" aria-hidden />
              {action.label}
            </Link>
          ))}
        </nav>
      </header>

      <nav aria-label="Actions rapides" className="grid grid-cols-4 gap-2.5 lg:hidden">
        {actions.map((action, index) => (
          <Link
            key={action.href + action.label}
            href={action.href}
            className={`flex min-h-[5.25rem] flex-col items-center justify-center gap-2 rounded-2xl px-1 py-3 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${theme.ring} ${
              index === 0 ? theme.primary : "border border-app-line bg-app-panel text-app-text-2 active:bg-app-hover"
            }`}
          >
            <action.icon className="h-5 w-5" aria-hidden />
            <span className="text-[11px] font-bold leading-tight">{action.shortLabel ?? action.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

/** Anneau de progression (taux d'occupation) : SVG pur, valeur lisible en clair à côté. */
function Ring({ percent, label }: { percent: number; label: string }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className="relative h-[76px] w-[76px] shrink-0" role="img" aria-label={`${clamped} % ${label}`}>
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={radius} fill="none" className="stroke-app-track" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          className="stroke-brand-orange"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * circumference} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-extrabold leading-none tabular-nums text-app-text">{clamped}%</span>
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-app-muted">{label}</span>
      </div>
    </div>
  );
}

/**
 * Carte de synthèse du téléphone : le chiffre qui compte (argent encaissé), le taux d'occupation en
 * anneau et trois compteurs du jour. Masquée sur ordinateur, où les indicateurs ont leur grille.
 */
export function MobileSummary({
  title,
  value,
  caption,
  percent,
  percentLabel,
  stats,
}: {
  /** Conservé pour les appelants : l'anneau suit désormais la palette, quel que soit le mode. */
  mode?: ShellMode;
  title: string;
  value: string;
  caption: string;
  percent: number;
  percentLabel: string;
  stats: { label: string; value: string; href: string }[];
}) {
  return (
    <section aria-label="Synthèse du jour" className="rounded-2xl border border-app-line bg-gradient-to-br from-app-panel-hi to-app-panel p-4 lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-app-muted">{title}</p>
          <p className="mt-1.5 whitespace-nowrap text-[28px] font-extrabold leading-none tabular-nums tracking-tight text-app-text">
            {value} <span className="text-xs font-bold text-app-muted">FCFA</span>
          </p>
          <p className="mt-2 text-xs text-app-muted">{caption}</p>
        </div>
        <Ring percent={percent} label={percentLabel} />
      </div>
      <dl className="mt-4 grid grid-cols-3 divide-x divide-app-line border-t border-app-line pt-3">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="px-2 text-center first:pl-0 last:pr-0 focus-visible:outline-2 focus-visible:outline-app-focus">
            <dd className="text-lg font-extrabold tabular-nums text-app-text">{stat.value}</dd>
            <dt className="mt-0.5 text-[10px] font-semibold text-app-muted">{stat.label}</dt>
          </Link>
        ))}
      </dl>
    </section>
  );
}

export function KpiTile({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  mode,
  href,
  tone = "default",
  display = "block",
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  icon: IconType;
  mode: ShellMode;
  href?: string;
  tone?: "default" | "good" | "warn";
  /** Classe d'affichage : « hidden lg:block » pour une tuile réservée à l'ordinateur. */
  display?: string;
}) {
  const valueTone = tone === "good" ? "text-app-good" : tone === "warn" ? "text-app-warn" : "text-app-text";
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-app-muted sm:text-[11px]">{label}</p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${MODE_THEME[mode].soft}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className={`mt-2.5 whitespace-nowrap text-xl font-extrabold sm:mt-3 sm:text-2xl tabular-nums tracking-tight ${valueTone}`}>
        {value}
        {unit ? <span className="ms-1 text-xs font-bold text-app-muted">{unit}</span> : null}
      </p>
      {hint ? <p className="mt-1 text-xs text-app-muted">{hint}</p> : null}
    </>
  );
  const base = `${PANEL} ${display} p-3.5 sm:p-4`;
  return href ? (
    <Link
      href={href}
      className={`${base} transition-colors hover:border-app-line-hover hover:bg-app-hover focus-visible:outline-2 focus-visible:outline-offset-2 ${MODE_THEME[mode].ring}`}
    >
      {body}
    </Link>
  ) : (
    <div className={base}>{body}</div>
  );
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">{children}</div>;
}

export function EmptyState({ text, action }: { text: string; action?: { href: string; label: string } }) {
  return (
    <div className="rounded-xl border border-dashed border-app-line-strong px-4 py-6 text-center">
      <p className="text-sm text-app-muted">{text}</p>
      {action ? (
        <Link href={action.href} className="mt-2 inline-block text-sm font-bold text-app-text underline-offset-4 hover:underline">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

const SEGMENTS = [
  { key: "available", label: "Disponibles", bar: "bg-success", dot: "bg-success" },
  { key: "occupied", label: "Occupés", bar: "bg-danger", dot: "bg-danger" },
  { key: "reserved", label: "Réservés", bar: "bg-info", dot: "bg-info" },
  { key: "unavailable", label: "Indisponibles", bar: "bg-neutral", dot: "bg-neutral" },
] as const;

/** Barre empilée des statuts + légende chiffrée. `noun` : « logements », « chambres », « biens »… */
export function StatusBar({
  counts,
  noun,
}: {
  counts: { total: number; available: number; occupied: number; reserved: number; unavailable: number };
  noun: string;
}) {
  if (counts.total === 0) return null;
  return (
    <div>
      <div
        role="img"
        aria-label={`${counts.total} ${noun} : ${counts.available} disponibles, ${counts.occupied} occupés, ${counts.reserved} réservés, ${counts.unavailable} indisponibles`}
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-app-line-soft"
      >
        {SEGMENTS.map((segment) =>
          counts[segment.key] > 0 ? (
            <span
              key={segment.key}
              className={segment.bar}
              style={{ width: `${(counts[segment.key] / counts.total) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {SEGMENTS.map((segment) => (
          <li key={segment.key} className="flex items-center justify-between gap-2 text-app-text-2">
            <span className="inline-flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${segment.dot}`} aria-hidden />
              {segment.label}
            </span>
            <span className="font-bold tabular-nums text-app-text">{counts[segment.key]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ligne « libellé … valeur » des encarts d'argent. */
export function MoneyRow({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-2 ${strong ? "border-t border-app-line pt-3" : ""}`}>
      <dt className={`text-xs ${strong ? "font-bold text-app-text" : "text-app-muted"}`}>{label}</dt>
      <dd className={`tabular-nums ${strong ? "text-base font-extrabold text-app-text" : "text-sm font-bold text-app-text-2"}`}>
        {formatFcfa(value)} <span className="text-[10px] font-bold text-app-muted">FCFA</span>
      </dd>
    </div>
  );
}

/** Recettes et dépenses des 7 derniers jours : colonnes en HTML, sans bibliothèque de graphiques. */
export function WeeklyBars({ data }: { data: DailyFinancialPoint[] }) {
  const max = Math.max(1, ...data.flatMap((point) => [point.revenue, point.expense]));
  const label = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
  const total = data.reduce((sum, point) => sum + point.revenue + point.expense, 0);
  return (
    <figure>
      <figcaption className="mb-3 flex items-center gap-4 text-[11px] font-semibold text-app-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success" aria-hidden /> Recettes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-danger" aria-hidden /> Dépenses
        </span>
      </figcaption>
      {total === 0 ? (
        <p className="rounded-xl border border-dashed border-app-line-strong px-3 py-5 text-center text-xs text-app-muted">
          Aucun mouvement sur les 7 derniers jours.
        </p>
      ) : (
        <div className="flex h-28 items-end gap-2" role="img" aria-label="Recettes et dépenses des 7 derniers jours">
          {data.map((point) => (
            <div key={point.date.toISOString()} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1">
              <div className="flex flex-1 items-end justify-center gap-0.5">
                <span
                  className="w-1/2 max-w-3 rounded-t bg-success"
                  style={{ height: `${Math.max(point.revenue > 0 ? 4 : 0, (point.revenue / max) * 100)}%` }}
                />
                <span
                  className="w-1/2 max-w-3 rounded-t bg-danger"
                  style={{ height: `${Math.max(point.expense > 0 ? 4 : 0, (point.expense / max) * 100)}%` }}
                />
              </div>
              <span className="truncate text-center text-[10px] capitalize text-app-faint">{label.format(point.date)}</span>
            </div>
          ))}
        </div>
      )}
    </figure>
  );
}

/** Module annoncé mais pas encore livré : décrit ce qui viendra, ne montre AUCUN chiffre. */
export function SoonCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-app-line-strong bg-app-panel-2 p-5">
      <span className="rounded-full bg-fg/8 px-2.5 py-1 text-[11px] font-bold text-app-text-2">Bientôt disponible</span>
      <h3 className="mt-3 text-sm font-bold text-app-text">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-app-muted">{text}</p>
    </div>
  );
}

/** Pastille d'alerte réelle (compteur issu des données) : masquée quand il n'y a rien à faire. */
export function TodoRow({
  label,
  count,
  href,
  detail,
}: {
  label: string;
  count: number;
  href: string;
  detail?: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-app-hover focus-visible:outline-2 focus-visible:outline-app-focus"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-app-text">{label}</span>
          {detail ? <span className="block text-xs text-app-muted">{detail}</span> : null}
        </span>
        <span
          className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-extrabold tabular-nums ${
            count > 0 ? "bg-warning/15 text-app-warn" : "bg-fg/5 text-app-faint"
          }`}
        >
          {count}
        </span>
      </Link>
    </li>
  );
}

export function timeLabel(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function shortDateTime(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}
