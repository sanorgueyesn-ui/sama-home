import Link from "next/link";
import type { ReactNode } from "react";
import { BackIcon } from "./settings-icons";

// Éléments communs à toutes les pages de paramètres : un seul gabarit d'en-tête, de carte de
// section et de message, pour que chaque page ait le même aspect et les mêmes repères.

export type HeaderAction = { href: string; label: string };

/**
 * En-tête de page. `backHref` ramène à la vue d'ensemble (visible sur téléphone seulement, où le
 * menu latéral n'existe pas) ou, pour une page enfant (création, modification), à sa liste
 * (visible partout).
 */
export function SettingsPageHeader({
  title,
  description,
  backHref = "/settings",
  hideBack = false,
  action,
}: {
  title: string;
  description?: string;
  backHref?: string;
  /** Vue d'ensemble : il n'y a rien au-dessus à quoi revenir. */
  hideBack?: boolean;
  action?: HeaderAction;
}) {
  const isChild = backHref !== "/settings";
  return (
    <header className="mb-6 flex items-start gap-3">
      {hideBack ? null : (
        <Link
          href={backHref}
          aria-label={isChild ? "Retour à la liste" : "Retour aux paramètres"}
          className={`-ms-2 mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-fg/70 transition-colors hover:bg-fg/5 hover:text-fg focus-visible:outline-2 focus-visible:outline-brand-orange ${
            isChild ? "" : "lg:hidden"
          }`}
        >
          <BackIcon />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-extrabold tracking-tight text-fg md:text-2xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-fg/55">{description}</p> : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-xl bg-brand-orange px-4 text-sm font-bold text-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
        >
          {action.label}
        </Link>
      ) : null}
    </header>
  );
}

/** Carte de section : titre, texte d'aide, contenu. Sert à découper une page longue en blocs clairs. */
export function SettingsSection({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-border/15 bg-surface-raised p-5 shadow-card sm:p-6 ${className}`}>
      <header className="mb-5">
        <h2 className="text-base font-bold text-fg">{title}</h2>
        {description ? <p className="mt-1 text-sm text-fg/55">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}

/** Message de confirmation (succès) affiché en haut de page après une action. */
export function SettingsNotice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="mb-5 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
      {children}
    </p>
  );
}
