"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { logout } from "@/app/actions/auth";

// Audit Client/Réservation, Bloc 6 (PRIORITAIRE) — navigation persistante
// présente sur TOUTE page authentifiée, pour qu'aucun écran ne soit un
// cul-de-sac : barre d'onglets fixe en mobile, barre latérale fixe en
// tablette/PC. Le logo/texte "SAMA HOME" remplace le placeholder
// "Résidence Atlantique" visible sur la maquette (nom de marque incohérent,
// signalé dans le rapport d'audit — non repris ici).

type NavItem = { href: string; label: string; mobileLabel?: string; icon: (active: boolean) => ReactNode };

function iconProps(active: boolean) {
  return {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: active ? "currentColor" : "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9.5a.5.5 0 0 0 .5.5H10v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20h3.5a.5.5 0 0 0 .5-.5V10" />
    </svg>
  );
}
function BuildingIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <rect x="5" y="3.5" width="9" height="17" rx="1" />
      <path d="M14 9.5h4.5a1 1 0 0 1 1 1V20H14" />
      <path d="M8 7.5h1.2M8 11h1.2M8 14.5h1.2" />
    </svg>
  );
}
function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 9.5h16" />
      <path d="M8 3v3M16 3v3" />
      <path d="M8.5 13.5h1M12 13.5h1M15.5 13.5h1M8.5 16.5h1M12 16.5h1" />
    </svg>
  );
}
function KeyIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <circle cx="8" cy="15" r="3.8" />
      <path d="M10.7 12.3 19 4" />
      <path d="M16.3 6.7 19 9.4M14 9 16.7 11.7" />
    </svg>
  );
}
function PeopleIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 19.5c0-3.6 2.8-5.6 6.2-5.6s6.2 2 6.2 5.6" />
      <circle cx="17" cy="8.5" r="2.4" />
      <path d="M15.6 14c2.7.3 4.6 2.1 4.6 5.3" />
    </svg>
  );
}
function WalletIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <rect x="3.5" y="6.5" width="17" height="12.5" rx="2" />
      <path d="M3.5 10h17" />
      <circle cx="16.5" cy="14" r="1" fill={active ? "currentColor" : "none"} />
    </svg>
  );
}
function GearIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4M17.7 17.7l-1.4-1.4M7.7 7.7 6.3 6.3" />
    </svg>
  );
}
function MoreIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <circle cx="5" cy="12" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      <circle cx="19" cy="12" r="1.3" fill="currentColor" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg {...iconProps(false)}>
      <path d="M15 4h3.5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H15" />
      <path d="M10 8l-4 4 4 4" />
      <path d="M6 12h11.5" />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Tableau de bord", mobileLabel: "Accueil", icon: (a) => <HomeIcon active={a} /> },
  { href: "/logements", label: "Logements", icon: (a) => <BuildingIcon active={a} /> },
  { href: "/reservations", label: "Réservations", icon: (a) => <CalendarIcon active={a} /> },
  { href: "/locations", label: "Locations", icon: (a) => <KeyIcon active={a} /> },
  { href: "/clients", label: "Clients", icon: (a) => <PeopleIcon active={a} /> },
  { href: "/depenses", label: "Dépenses", icon: (a) => <WalletIcon active={a} /> },
  { href: "/settings", label: "Paramètres", icon: (a) => <GearIcon active={a} /> },
];

// Bloc 6 — mobile : Accueil/Logements/Réservations/Locations toujours
// visibles, le reste (Clients/Dépenses/Paramètres) derrière "Plus".
const MOBILE_PRIMARY = NAV_ITEMS.slice(0, 4);
const MOBILE_MORE = NAV_ITEMS.slice(4);

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="hidden md:sticky md:top-0 md:flex md:h-dvh md:w-60 md:shrink-0 md:flex-col md:border-r md:border-navy/10 md:bg-white md:px-3 md:py-6">
        <div className="mb-6 px-3 text-lg font-extrabold tracking-tight text-navy">SAMA HOME</div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                  active ? "bg-navy text-white" : "text-navy/70 hover:bg-paper"
                }`}
              >
                {item.icon(active)}
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action={logout}>
          <button
            type="submit"
            className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-navy/70 hover:bg-paper"
          >
            <LogoutIcon />
            Déconnexion
          </button>
        </form>
      </aside>

      <div className="min-w-0 flex-1 pb-20 md:pb-0">{children}</div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-navy/10 bg-white [padding-bottom:env(safe-area-inset-bottom)] md:hidden">
        {MOBILE_PRIMARY.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMoreOpen(false)}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-bold ${
                active ? "text-navy" : "text-navy/40"
              }`}
            >
              {item.icon(active)}
              {item.mobileLabel ?? item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-label="Plus de modules"
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-bold ${
            moreOpen || MOBILE_MORE.some((i) => isActive(pathname, i.href)) ? "text-navy" : "text-navy/40"
          }`}
        >
          <MoreIcon active={moreOpen} />
          Plus
        </button>
      </nav>

      {moreOpen ? (
        <div className="fixed inset-0 z-50 flex items-end md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-navy/40"
          />
          <div className="relative w-full rounded-t-2xl bg-white px-4 pt-4 [padding-bottom:calc(env(safe-area-inset-bottom)+1.5rem)]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-navy/15" />
            <nav className="flex flex-col gap-1">
              {MOBILE_MORE.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold ${
                      active ? "bg-navy text-white" : "text-navy"
                    }`}
                  >
                    {item.icon(active)}
                    {item.label}
                  </Link>
                );
              })}
              <form action={logout}>
                <button
                  type="submit"
                  className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-danger"
                >
                  <LogoutIcon />
                  Déconnexion
                </button>
              </form>
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
