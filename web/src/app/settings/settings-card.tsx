import Link from "next/link";
import type { ReactNode } from "react";

function iconProps() {
  return {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

export function DomainIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9.5a.5.5 0 0 0 .5.5H10v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20h3.5a.5.5 0 0 0 .5-.5V10" />
    </svg>
  );
}

export function BuildingIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="5" y="3.5" width="9" height="17" rx="1" />
      <path d="M14 9.5h4.5a1 1 0 0 1 1 1V20H14" />
      <path d="M8 7.5h1.2M8 11h1.2M8 14.5h1.2" />
    </svg>
  );
}

export function TagIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M11.5 4h6a1 1 0 0 1 1 1v6a1 1 0 0 1-.3.7l-9 9a1 1 0 0 1-1.4 0l-5.5-5.5a1 1 0 0 1 0-1.4l9-9a1 1 0 0 1 .2-.1Z" />
      <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ReceiptIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M12 3v18M7 7.5c0-1.9 2-3 5-3s5 1.1 5 3-2 2.5-5 3-5 1.1-5 3 2 3 5 3 5-1.1 5-3" />
    </svg>
  );
}

export function PeopleIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 19.5c0-3.6 2.8-5.6 6.2-5.6s6.2 2 6.2 5.6" />
      <circle cx="17" cy="8.5" r="2.4" />
      <path d="M15.6 14c2.7.3 4.6 2.1 4.6 5.3" />
    </svg>
  );
}

export function WalletIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="3.5" y="6.5" width="17" height="12.5" rx="2" />
      <path d="M3.5 10h17" />
      <circle cx="16.5" cy="14" r="1" fill="currentColor" />
    </svg>
  );
}

export function TransferIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M4 7h14M14 3l4 4-4 4" />
      <path d="M20 17H6M10 21l-4-4 4-4" />
    </svg>
  );
}

/** Carte de navigation réutilisée pour chaque module de configuration réel
 * (Lot Paramètres 2) — uniquement pour les 7 fonctionnalités disponibles ;
 * ne jamais instancier pour une fonctionnalité absente du backend. */
export function SettingsCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-border/10 bg-surface-raised p-4 shadow-card transition-colors hover:border-brand-orange/40"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/10 bg-surface-sunken text-brand-orange">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-fg">{title}</p>
        <p className="truncate text-xs font-medium text-fg/50">{description}</p>
      </div>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-fg/30"
      >
        <path d="m9 6 6 6-6 6" />
      </svg>
    </Link>
  );
}
