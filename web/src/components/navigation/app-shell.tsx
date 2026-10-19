"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { logout } from "@/app/actions/auth";
import { hasEstablishmentPermission } from "@/lib/permissions";

type NavItem = {
  href?: string;
  label: string;
  icon: (active: boolean) => ReactNode;
  disabled?: boolean;
  permission?: string;
};

function iconProps(active: boolean) {
  return {
    width: 18,
    height: 18,
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
function UserIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 19.5c0-4 3.2-6.2 7.2-6.2s7.2 2.2 7.2 6.2" />
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
function CashIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.6" fill={active ? "currentColor" : "none"} />
      <path d="M5.5 6v12M18.5 6v12" />
    </svg>
  );
}
function FinanceIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M4 18V9M10 18V5M16 18v-7M21 18V3" />
    </svg>
  );
}
function SecurityIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M12 3.5 5 6v5.5c0 4.8 3 7.8 7 9 4-1.2 7-4.2 7-9V6l-7-2.5Z" />
      <path d="M9.3 12 11 13.7 14.8 10" />
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
function MenuIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
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
function PlatformIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M12 3 4 7l8 4 8-4-8-4Z" />
      <path d="M4 12l8 4 8-4" />
      <path d="M4 17l8 4 8-4" />
    </svg>
  );
}

const PRIMARY_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: (a) => <HomeIcon active={a} /> },
  { href: "/sejour", label: "Séjour", icon: (a) => <KeyIcon active={a} />, permission: "MODULE_SEJOUR" },
  { href: "/depenses", label: "Dépenses", icon: (a) => <WalletIcon active={a} />, permission: "MODULE_DEPENSES" },
];

const GROUP_RENTAL: NavItem[] = [
  { href: "/logements", label: "Logements", icon: (a) => <BuildingIcon active={a} />, permission: "MODULE_LOGEMENTS" },
  { href: "/reservations", label: "Réservations", icon: (a) => <CalendarIcon active={a} />, permission: "MODULE_RESERVATIONS" },
  { href: "/locations", label: "Locations", icon: (a) => <KeyIcon active={a} />, permission: "MODULE_LOCATIONS" },
  { href: "/clients", label: "Locataires", icon: (a) => <PeopleIcon active={a} />, permission: "MODULE_CLIENTS" },
];

const GROUP_FINANCES: NavItem[] = [
  { href: "/depenses", label: "Dépenses", icon: (a) => <WalletIcon active={a} />, permission: "MODULE_DEPENSES" },
  { href: "/caisse", label: "Caisse", icon: (a) => <CashIcon active={a} />, permission: "MODULE_CAISSE" },
  { label: "Finances", icon: (a) => <FinanceIcon active={a} />, disabled: true },
];

const GROUP_ADMIN: NavItem[] = [
  { href: "/settings", label: "Paramètres", icon: (a) => <GearIcon active={a} />, permission: "MODULE_SETTINGS" },
  { href: "/settings/users", label: "Utilisateurs", icon: (a) => <UserIcon active={a} />, permission: "CAN_MANAGE_USERS" },
  { label: "Sécurité", icon: (a) => <SecurityIcon active={a} />, disabled: true },
];

const PLATFORM_NAV_ITEM: NavItem = {
  href: "/plateforme",
  label: "Espace plateforme",
  icon: (a) => <PlatformIcon active={a} />,
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getFocusable(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
  );
}

function NavRow({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  if (item.disabled || !item.href) {
    return (
      <span
        aria-disabled="true"
        className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-fg/30"
      >
        {item.icon(false)}
        {item.label}
        <span className="ml-auto rounded-full bg-fg/10 px-2 py-0.5 text-[9px] font-bold text-fg/45">
          Bientôt
        </span>
      </span>
    );
  }
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
        active ? "bg-navy text-white" : "text-fg/70 hover:bg-surface-sunken hover:text-white"
      }`}
    >
      {item.icon(active)}
      {item.label}
    </Link>
  );
}

/**
 * Composant de sous-menu déroulant pour la barre supérieure desktop
 */
function TopNavDropdown({
  label,
  icon,
  active,
  items,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  items: NavItem[];
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [open]);

  return (
    <div
      ref={dropdownRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
          active || open
            ? "bg-navy text-white shadow-sm"
            : "text-fg/80 hover:bg-surface-sunken hover:text-white"
        }`}
      >
        <span>{icon}</span>
        <span>{label}</span>
        <span className={`text-[9px] text-fg/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-60 rounded-2xl border border-white/15 bg-surface-raised/98 p-1.5 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
          {items.map((item) => {
            if (item.disabled || !item.href) {
              return (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-fg/30"
                >
                  <span className="flex items-center gap-2">
                    {item.icon(false)}
                    {item.label}
                  </span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-bold text-fg/40">
                    Bientôt
                  </span>
                </div>
              );
            }
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-fg/80 transition-colors hover:bg-surface-sunken hover:text-brand-orange"
              >
                {item.icon(false)}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AppShell({
  children,
  isPlatformAdmin = false,
  userPermissions,
  userRole,
}: {
  children: ReactNode;
  isPlatformAdmin?: boolean;
  userPermissions?: string | null;
  userRole?: string | null;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const userPermContext = { role: userRole, isPlatformAdmin, permissions: userPermissions };
  const filterByPerm = (items: NavItem[]) =>
    items.filter((item) => !item.permission || hasEstablishmentPermission(userPermContext, item.permission));

  const visiblePrimary = filterByPerm(PRIMARY_ITEMS);
  const visibleRental = filterByPerm(GROUP_RENTAL);
  const visibleFinances = filterByPerm(GROUP_FINANCES);
  const baseAdmin = isPlatformAdmin ? [...GROUP_ADMIN, PLATFORM_NAV_ITEM] : GROUP_ADMIN;
  const visibleAdmin = filterByPerm(baseAdmin);

  const isSejourAllowed = hasEstablishmentPermission(userPermContext, "MODULE_SEJOUR");

  // Détection d'état actif pour les sous-menus
  const isRentalActive = visibleRental.some((i) => i.href && isActive(pathname, i.href));
  const isFinancesActive = visibleFinances.some((i) => i.href && isActive(pathname, i.href));
  const isAdminActive = visibleAdmin.some((i) => i.href && isActive(pathname, i.href));

  useEffect(() => {
    if (!menuOpen) return;
    const dialog = dialogRef.current;
    const menuButton = menuButtonRef.current;
    if (!dialog) return;

    const firstNavItem = dialog.querySelector<HTMLElement>("nav a[href], nav button:not([disabled])");
    const focusable = getFocusable(dialog);
    (firstNavItem ?? focusable[0] ?? dialog).focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setMenuOpen(false);
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const items = getFocusable(dialog);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      menuButton?.focus();
    };
  }, [menuOpen]);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ===================== TOP NAVIGATION BAR (DESKTOP LG+) ===================== */}
      <header
        inert={menuOpen}
        className="fixed top-0 inset-x-0 z-40 hidden h-16 w-full items-center justify-between border-b border-white/10 bg-surface-raised/95 px-6 backdrop-blur-xl shadow-sm lg:flex"
      >
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-orange/10 p-0.5 shadow-sm">
              <Image
                src="/brand/Sama-Home-icone-Orange.png"
                alt="SAMA HOME"
                width={32}
                height={32}
                priority
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-base font-black tracking-tight text-fg">
              <span className="text-brand-orange">SAMA</span> HOME
            </span>
          </Link>

          {/* Navigation Links and Dropdowns */}
          <nav className="flex items-center gap-1.5">
            {/* Direct Links */}
            <Link
              href="/dashboard"
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                pathname === "/dashboard"
                  ? "bg-navy text-white shadow-sm"
                  : "text-fg/80 hover:bg-surface-sunken hover:text-white"
              }`}
            >
              <HomeIcon active={pathname === "/dashboard"} />
              Tableau de bord
            </Link>

            {isSejourAllowed && (
              <Link
                href="/sejour"
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  isActive(pathname, "/sejour")
                    ? "bg-navy text-white shadow-sm"
                    : "text-fg/80 hover:bg-surface-sunken hover:text-white"
                }`}
              >
                <KeyIcon active={isActive(pathname, "/sejour")} />
                Séjour
              </Link>
            )}

            {/* Dropdown 1: Gestion Locative */}
            {visibleRental.length > 0 && (
              <TopNavDropdown
                label="Gestion Locative"
                icon={<BuildingIcon active={isRentalActive} />}
                active={isRentalActive}
                items={visibleRental}
              />
            )}

            {/* Dropdown 2: Finances & Caisse */}
            {visibleFinances.length > 0 && (
              <TopNavDropdown
                label="Finances"
                icon={<CashIcon active={isFinancesActive} />}
                active={isFinancesActive}
                items={visibleFinances}
              />
            )}

            {/* Dropdown 3: Administration */}
            {visibleAdmin.length > 0 && (
              <TopNavDropdown
                label="Administration"
                icon={<GearIcon active={isAdminActive} />}
                active={isAdminActive}
                items={visibleAdmin}
              />
            )}
          </nav>
        </div>

        {/* Right Actions: Quick button + Logout */}
        <div className="flex items-center gap-3">
          <Link
            href="/locations/new"
            className="flex h-9 items-center gap-1.5 rounded-xl bg-brand-orange px-3.5 text-xs font-black text-ink shadow-sm hover:brightness-110 transition-all"
          >
            <span>+</span> Louer / Réserver
          </Link>

          <form action={logout}>
            <button
              type="submit"
              aria-label="Déconnexion"
              title="Déconnexion"
              className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-surface-sunken px-3 text-xs font-bold text-fg/70 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-300 transition-colors"
            >
              <LogoutIcon />
              <span className="hidden xl:inline">Déconnexion</span>
            </button>
          </form>
        </div>
      </header>

      {/* ===================== HEADER (MOBILE & TABLETTE) ===================== */}
      <header
        inert={menuOpen}
        className="fixed top-0 inset-x-0 z-40 flex h-14 items-center justify-between border-b border-border/10 bg-surface-raised px-4 lg:hidden"
      >
        <Link
          href="/settings"
          aria-label="Paramètres"
          className="flex h-9 w-9 items-center justify-center rounded-full text-fg/70 hover:bg-surface-sunken"
        >
          <GearIcon active={isActive(pathname, "/settings")} />
        </Link>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-orange/10 p-0.5 shadow-sm">
            <Image
              src="/brand/Sama-Home-icone-Orange.png"
              alt="SAMA HOME"
              width={32}
              height={32}
              priority
              className="h-full w-full object-contain"
            />
          </div>
          <span className="text-sm font-black tracking-tight text-fg">
            <span className="text-brand-orange">SAMA</span> HOME
          </span>
        </Link>
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Menu"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          className="flex h-9 w-9 items-center justify-center rounded-full text-fg/70 hover:bg-surface-sunken"
        >
          <MenuIcon active={menuOpen} />
        </button>
      </header>

      {/* Main Page Content */}
      <div inert={menuOpen} className="min-w-0 flex-1 pt-14 lg:pt-16 pb-28 lg:pb-12">
        {children}
      </div>

      {/* Barre flottante mobile — items principaux visibles */}
      <nav
        inert={menuOpen}
        className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex h-16 items-stretch gap-1 rounded-[28px] border border-border/10 bg-surface-raised px-2 shadow-card lg:hidden"
      >
        {visiblePrimary.map((item) => {
          const active = isActive(pathname, item.href!);
          return (
            <Link
              key={item.href}
              href={item.href!}
              onClick={() => setMenuOpen(false)}
              className="flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                  active ? "bg-navy text-white" : "text-fg/40"
                }`}
              >
                {item.icon(active)}
              </span>
              <span className={active ? "text-fg" : "text-fg/40"}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile Drawer (Menu) */}
      {menuOpen ? (
        <div
          ref={dialogRef}
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-end outline-none lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-navy/40 backdrop-blur-sm"
          />
          <div className="relative w-full max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-surface-raised px-5 pt-4 pb-8 shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-fg/15" />
            <div className="mb-4 flex items-center justify-center gap-2">
              <Image
                src="/brand/Sama-Home-icone-Orange.png"
                alt="SAMA HOME"
                width={26}
                height={26}
                className="h-6 w-6 object-contain"
              />
              <span className="text-sm font-black tracking-tight text-fg">
                <span className="text-brand-orange">SAMA</span> HOME
              </span>
            </div>

            <nav className="flex flex-col gap-4">
              {/* Groupe Gestion */}
              {visibleRental.length > 0 && (
                <div>
                  <p className="px-2 text-[10px] font-black uppercase tracking-wider text-fg/40 mb-1">
                    Gestion Locative
                  </p>
                  <div className="flex flex-col gap-1">
                    {visibleRental.map((item) => (
                      <NavRow
                        key={item.label}
                        item={item}
                        active={!item.disabled && isActive(pathname, item.href!)}
                        onNavigate={() => setMenuOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Groupe Finances */}
              {visibleFinances.length > 0 && (
                <div>
                  <p className="px-2 text-[10px] font-black uppercase tracking-wider text-fg/40 mb-1">
                    Finances &amp; Caisse
                  </p>
                  <div className="flex flex-col gap-1">
                    {visibleFinances.map((item) => (
                      <NavRow
                        key={item.label}
                        item={item}
                        active={!item.disabled && isActive(pathname, item.href!)}
                        onNavigate={() => setMenuOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Groupe Administration */}
              {visibleAdmin.length > 0 && (
                <div>
                  <p className="px-2 text-[10px] font-black uppercase tracking-wider text-fg/40 mb-1">
                    Administration
                  </p>
                  <div className="flex flex-col gap-1">
                    {visibleAdmin.map((item) => (
                      <NavRow
                        key={item.label}
                        item={item}
                        active={!item.disabled && isActive(pathname, item.href!)}
                        onNavigate={() => setMenuOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <form action={logout} className="pt-2 border-t border-white/10">
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-danger hover:bg-rose-500/10 transition-colors"
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
