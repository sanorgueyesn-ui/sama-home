"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { logout } from "@/app/actions/auth";

/**
 * Phase 3G / Lot D12-P86 — console de plateforme, séparée de l'application
 * métier : AUCUNE réutilisation de `AppShell` (src/components/navigation/
 * app-shell.tsx) — composant distinct, navigation distincte, thème sombre
 * fixe (toujours sombre, indépendant du sélecteur clair/sombre de
 * l'application métier, dont c'est une préférence par établissement sans
 * rapport avec cette console). N'est JAMAIS un mécanisme d'autorisation —
 * seule `requirePlatformAdmin()` (appelée dans src/app/plateforme/layout.tsx
 * et dans chaque page) protège réellement cette zone ; voir le commentaire
 * de src/app/layout.tsx sur la sélection de cette coquille par chemin.
 *
 * Éléments de navigation dont la page réelle n'existe pas encore : rendus
 * en `<span>` non cliquable avec un badge "Bientôt" — même convention que
 * les éléments `disabled` de `AppShell` (ex. Finances/Sécurité), jamais une
 * fausse destination.
 */
type PlatformNavItem = {
  href?: string;
  label: string;
  disabled?: boolean;
};

const PLATFORM_NAV_ITEMS: PlatformNavItem[] = [
  { href: "/plateforme", label: "Tableau de bord" },
  { href: "/plateforme/etablissements", label: "Établissements" },
  { href: "/plateforme/abonnements", label: "Abonnements et paiements" },
  { href: "/plateforme/utilisateurs", label: "Utilisateurs" },
  { href: "/plateforme/parametres", label: "Tarification et paramètres globaux" },
  { href: "/plateforme/historique", label: "Historique des décisions" },
  { label: "Paramètres de la plateforme", disabled: true },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/plateforme" && pathname.startsWith(`${href}/`));
}

function NavRow({ item, active, onNavigate }: { item: PlatformNavItem; active: boolean; onNavigate?: () => void }) {
  if (item.disabled || !item.href) {
    return (
      <span className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold text-white/30">
        {item.label}
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/50">Bientôt</span>
      </span>
    );
  }
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
        active ? "bg-brand-orange text-ink" : "text-white/70 hover:bg-white/10"
      }`}
    >
      {item.label}
    </Link>
  );
}

export function PlatformShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-[#0b141a] text-white lg:flex-row">
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-white/10 lg:bg-[#0e1a22] lg:px-3 lg:py-6">
        <div className="mb-1 px-3">
          <p className="text-lg font-extrabold tracking-tight text-white">SAMA HOME</p>
          <p className="text-[11px] font-bold uppercase tracking-wide text-white/40">Espace plateforme</p>
        </div>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {PLATFORM_NAV_ITEMS.map((item) => (
            <NavRow key={item.label} item={item} active={Boolean(item.href) && isActive(pathname, item.href!)} />
          ))}
        </nav>
        <form action={logout}>
          <button
            type="submit"
            className="flex h-11 w-full items-center gap-2 rounded-xl px-3 text-sm font-bold text-white/60 hover:bg-white/10"
          >
            Déconnexion
          </button>
        </form>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-[#0e1a22] px-4 lg:hidden">
        <div>
          <p className="text-sm font-extrabold tracking-tight text-white">SAMA HOME</p>
          <p className="text-[9px] font-bold uppercase tracking-wide text-white/40">Espace plateforme</p>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </header>

      {menuOpen ? (
        <div className="border-b border-white/10 bg-[#0e1a22] px-4 py-3 lg:hidden">
          <nav className="flex flex-col gap-1">
            {PLATFORM_NAV_ITEMS.map((item) => (
              <NavRow
                key={item.label}
                item={item}
                active={Boolean(item.href) && isActive(pathname, item.href!)}
                onNavigate={() => setMenuOpen(false)}
              />
            ))}
            <form action={logout} className="mt-1">
              <button type="submit" className="flex h-11 w-full items-center gap-2 rounded-xl px-3 text-sm font-bold text-white/60 hover:bg-white/10">
                Déconnexion
              </button>
            </form>
          </nav>
        </div>
      ) : null}

      <div className="min-w-0 flex-1 bg-[#0b141a]">{children}</div>
    </div>
  );
}
