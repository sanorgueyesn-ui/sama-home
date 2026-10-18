"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { logout } from "@/app/actions/auth";

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
  { href: "/plateforme/parametres", label: "Paramètres" },
  { href: "/plateforme/historique", label: "Historique des décisions" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/plateforme" && pathname.startsWith(`${href}/`));
}

export function PlatformShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-dvh w-full max-w-full overflow-x-hidden flex-col bg-[#0b141a] text-white">
      {/* Barre supérieure flottante / sticky pour l'administration */}
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0e1a22]/95 backdrop-blur-md shadow-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Identité Plateforme */}
          <div className="flex items-center gap-3">
            <Link href="/plateforme" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-orange text-sm font-black text-ink shadow-sm">
                SH
              </span>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-base font-black tracking-tight text-white">SAMA HOME</span>
                  <span className="rounded-full border border-brand-orange/30 bg-brand-orange/15 px-2 py-0.5 text-[10px] font-bold text-brand-orange">
                    Plateforme
                  </span>
                </div>
                <span className="hidden text-[10px] font-mono font-medium text-white/40 md:block">
                  COMPAGNIE GUEYE TAWFEKH
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation centrale flottante (Desktop >= lg) */}
          <nav className="hidden items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 lg:flex">
            {PLATFORM_NAV_ITEMS.map((item) => {
              if (item.disabled || !item.href) {
                return (
                  <span
                    key={item.label}
                    className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-white/30"
                  >
                    {item.label}
                    <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[9px] font-medium text-white/40">
                      Bientôt
                    </span>
                  </span>
                );
              }
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center rounded-xl px-3.5 py-1.5 text-xs font-black transition-all ${
                    active
                      ? "bg-brand-orange text-ink shadow-sm"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Actions à droite : Déconnexion & Toggle Mobile */}
          <div className="flex items-center gap-2 sm:gap-3">
            <form action={logout}>
              <button
                type="submit"
                aria-label="Déconnexion"
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70 transition-all hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </form>

            {/* Bouton Menu Mobile / Tablette */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu de navigation"
              aria-expanded={menuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition-colors hover:bg-white/10 lg:hidden"
            >
              {menuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Menu déroulant Mobile & Tablette */}
        {menuOpen ? (
          <div className="border-t border-white/10 bg-[#0e1a22] px-4 py-3 lg:hidden">
            <nav className="flex flex-col gap-1.5">
              {PLATFORM_NAV_ITEMS.map((item) => {
                if (item.disabled || !item.href) {
                  return (
                    <span
                      key={item.label}
                      className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-bold text-white/30"
                    >
                      {item.label}
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/50">
                        Bientôt
                      </span>
                    </span>
                  );
                }
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center rounded-xl px-3 py-2.5 text-sm font-extrabold transition-colors ${
                      active ? "bg-brand-orange text-ink" : "text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <div className="mt-2 border-t border-white/10 pt-2.5 text-center">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/50">
                  COMPAGNIE GUEYE TAWFEKH
                </p>
                <p className="mt-0.5 font-mono text-[9px] text-white/35">
                  NINEA 012521599 2R1 • RCCM SN.DKR.2025.A.38803
                </p>
              </div>
            </nav>
          </div>
        ) : null}
      </header>

      {/* Contenu principal en pleine largeur et centré */}
      <main className="w-full max-w-full flex-1 overflow-x-hidden bg-[#0b141a]">
        {children}
      </main>

      {/* Footer légal discret de la plateforme */}
      <footer className="w-full border-t border-white/5 bg-[#091116] py-4 text-center text-xs text-white/40">
        <div className="mx-auto max-w-7xl px-4">
          <p className="font-semibold">
            SAMA HOME • Plateforme de Gestion Multi-Résidences • Édité par{" "}
            <span className="font-bold text-white/70">COMPAGNIE GUEYE TAWFEKH</span>
          </p>
          <p className="mt-1 font-mono text-[10px] text-white/30">
            NINEA : 012521599 2R1 • RCCM : SN.DKR.2025.A.38803 • Dakar, Sénégal • Support : +221 77 338 66 60
          </p>
        </div>
      </footer>
    </div>
  );
}
