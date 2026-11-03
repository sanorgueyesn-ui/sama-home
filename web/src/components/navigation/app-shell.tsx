"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { logout } from "@/app/actions/auth";
import { SpaceSwitcher } from "@/components/navigation/space-switcher";
import { T, useT, useLocale } from "@/components/i18n/i18n-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { getMessages } from "@/lib/i18n/messages";
import { AGENCY_MODE_ENABLED, BUSINESS_MODE_LABELS, toShellMode, type SpaceOption } from "@/lib/business-mode";
import { dateLocale } from "@/lib/i18n/date-locale";

type NavItem = {
  href: string;
  label: string;
  icon: (active: boolean) => ReactNode;
  permission?: string;
  /** Page pas encore livrée : affichée grisée avec « Bientôt », jamais un lien mort. */
  soon?: boolean;
};

// Repère de l'entrée active : toujours la couleur d'accent de l'établissement (Paramètres >
// Apparence), quel que soit le mode. Plus de teinte fixe par mode : changer la palette change aussi
// le menu. `text-brand-orange` est la version lisible de l'accent selon le thème clair ou sombre.
const MODE_ACCENT = {
  RESIDENCE: { bar: "bg-brand-orange", text: "text-brand-orange" },
  HOTEL: { bar: "bg-brand-orange", text: "text-brand-orange" },
  AGENCY: { bar: "bg-brand-orange", text: "text-brand-orange" },
} as const;

const SOON_ROUTES = new Set(["/contrats", "/echeances"]);

/** Horloge réelle, rafraîchie chaque minute. Rendu serveur neutre (pas d'heure inventée). */
function subscribeMinute(notify: () => void) {
  const timer = window.setInterval(notify, 30_000);
  return () => window.clearInterval(timer);
}
const readMinute = () => Math.floor(Date.now() / 60_000);

function ShellClock() {
  const minute = useSyncExternalStore(subscribeMinute, readMinute, () => 0);
  if (minute === 0) return <span className="h-8 w-28" aria-hidden />;
  const date = new Date(minute * 60_000);
  const day = new Intl.DateTimeFormat(dateLocale(), { weekday: "long", day: "numeric", month: "long" }).format(date);
  const time = new Intl.DateTimeFormat(dateLocale(), { hour: "2-digit", minute: "2-digit" }).format(date);
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[11px] font-medium text-app-text/90">{day.charAt(0).toUpperCase() + day.slice(1)}</span>
      <span className="text-[10px] text-app-faint">{time}</span>
    </div>
  );
}

function parsePreviewMode(raw: string | null): "HOTEL" | "RESIDENCE" | "AGENCY" | null {
  const value = (raw ?? "").toUpperCase();
  if (value === "HOTEL" || value === "RESIDENCE") return value;
  // Agence immobilière suspendue (AGENCY_MODE_ENABLED) : l'aperçu ne la propose plus.
  if (AGENCY_MODE_ENABLED && (value === "AGENCY" || value === "IMMOBILIER")) return "AGENCY";
  return null;
}

function iconProps(active: boolean) {
  return {
    width: 17,
    height: 17,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
    </svg>
  );
}

function KeyIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function BedIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M2 4v16" />
      <path d="M2 8h18a2 2 0 0 1 2 2v10" />
      <path d="M2 17h20" />
      <path d="M6 8v9" />
    </svg>
  );
}

function BuildingIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <path d="M9 22v-4h6v4" />
    </svg>
  );
}

function PeopleIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  );
}

function CashIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}

function WalletIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6" />
      <path d="M16 12h-6" />
      <path d="M16 16h-6" />
    </svg>
  );
}

function FinanceIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <line x1="18" x2="18" y1="20" y2="10" />
      <line x1="12" x2="12" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="14" />
    </svg>
  );
}

function GearIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
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

function ContractIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
    </svg>
  );
}

function AlertCalendarIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <circle cx="17" cy="17" r="3" />
      <line x1="17" x2="17" y1="16" y2="17" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M15 4h3.5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H15" />
      <path d="M10 8l-4 4 4 4" />
      <path d="M6 12h11.5" />
    </svg>
  );
}

export function AppShell({
  children,
  isPlatformAdmin = false,
  userPermissions,
  userRole,
  userName = null,
  spaces = [],
  activeSpaceId = null,
  subscriptionExpired = false,
}: {
  children: ReactNode;
  isPlatformAdmin?: boolean;
  userPermissions?: string | null;
  userRole?: string | null;
  userName?: string | null;
  spaces?: SpaceOption[];
  activeSpaceId?: string | null;
  subscriptionExpired?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Espace actif RÉEL (issu des appartenances du compte, voir src/lib/dal.ts) : c'est lui qui
  // décide du mode. Le paramètre d'URL `?mode=` ne sert plus qu'à l'aperçu quand aucun espace
  // n'est connu (jamais un mécanisme d'accès : le serveur ne s'y fie pas).
  const activeSpace = spaces.find((space) => space.id === activeSpaceId) ?? null;
  // Aperçu des trois modes : uniquement en développement local (même règle que /dashboard).
  const previewMode = process.env.NODE_ENV === "development" ? parsePreviewMode(searchParams?.get("mode") ?? null) : null;
  const currentMode = previewMode ?? (activeSpace ? toShellMode(activeSpace.businessMode) : "RESIDENCE");
  const homeHref = previewMode ? `/dashboard?mode=${previewMode}` : "/dashboard";
  const displayName = userName?.trim() || "Mon compte";
  const initial = displayName.charAt(0).toUpperCase();
  const roleLabel = userRole === "ADMIN" ? "Administrateur" : userRole ? "Gestionnaire" : isPlatformAdmin ? "Plateforme" : "";

  const establishmentData =
    currentMode === "HOTEL"
      ? {
          name: "Hôtel Le Saphir",
          units: "12 chambres • 6 appartements",
          image: "/images/hotel-resort-sunset.jpg",
          sub: "Gestion d'hébergement",
          btnLabel: "Voir l'établissement",
          searchPlaceholder: "Rechercher une chambre, un appartement ou une réservation...",
          topDropdownIconBg: "bg-navy",
          role: "Responsable",
        }
      : currentMode === "AGENCY"
        ? {
            name: "Agence Atlantique",
            units: "28 biens • 16 loués",
            image: "/images/agence-atlantique-thumb.png",
            sub: "Agence immobilière",
            btnLabel: "Voir l'agence",
            searchPlaceholder: "Rechercher un bien, un locataire, un contrat...",
            topDropdownIconBg: "bg-navy",
            role: "Administrateur",
          }
        : {
            name: "Hôtel Le Saphir",
            units: "12 chambres • 6 appartements",
            image: "/images/hotel-resort-sunset.jpg",
            sub: "Gestion d'hébergement",
            btnLabel: "Voir l'établissement",
            searchPlaceholder: "Rechercher une chambre, un appartement ou une réservation...",
            topDropdownIconBg: "bg-navy",
            role: "Responsable",
          };

  // Nom réel de l'espace ; la ligne « 12 chambres • 6 appartements » de la maquette était fictive :
  // avec un espace réel on affiche son mode, jamais un chiffre inventé.
  const shownName = activeSpace?.name ?? establishmentData.name;
  const shownUnits = activeSpace ? BUSINESS_MODE_LABELS[activeSpace.businessMode] : establishmentData.units;

  const navItems: NavItem[] =
    currentMode === "AGENCY"
      ? [
          { href: homeHref, label: "Accueil", icon: (a) => <HomeIcon active={a} /> },
          { href: "/logements", label: "Biens", icon: (a) => <BuildingIcon active={a} /> },
          { href: "/locations", label: "Locations", icon: (a) => <KeyIcon active={a} /> },
          { href: "/clients", label: "Clients", icon: (a) => <PeopleIcon active={a} /> },
          { href: "/caisse", label: "Paiements", icon: (a) => <CashIcon active={a} /> },
          { href: "/depenses", label: "Dépenses", icon: (a) => <WalletIcon active={a} /> },
          { href: "/contrats", label: "Contrats", icon: (a) => <ContractIcon active={a} /> },
          { href: "/echeances", label: "Échéances", icon: (a) => <AlertCalendarIcon active={a} /> },
          { href: "/rapports", label: "Rapports", icon: (a) => <FinanceIcon active={a} /> },
          { href: "/settings", label: "Paramètres", icon: (a) => <GearIcon active={a} /> },
        ]
      : [
          { href: homeHref, label: "Accueil", icon: (a) => <HomeIcon active={a} /> },
          { href: "/reservations", label: "Réservations", icon: (a) => <CalendarIcon active={a} /> },
          { href: "/locations", label: "Locations", icon: (a) => <KeyIcon active={a} /> },
          { href: "/logements?type=ROOM", label: "Chambres", icon: (a) => <BedIcon active={a} /> },
          ...(currentMode === "HOTEL"
            ? [
                { href: "/planning", label: "Planning", icon: (a: boolean) => <CalendarIcon active={a} /> },
                { href: "/menage", label: "Ménage", icon: (a: boolean) => <KeyIcon active={a} /> },
              ]
            : []),
          ...(currentMode === "RESIDENCE"
            ? [{ href: "/logements?type=APARTMENT", label: "Appartements", icon: (a: boolean) => <BuildingIcon active={a} /> }]
            : []),
          { href: "/clients", label: "Clients", icon: (a) => <PeopleIcon active={a} /> },
          { href: "/caisse", label: "Paiements", icon: (a) => <CashIcon active={a} /> },
          { href: "/depenses", label: "Dépenses", icon: (a) => <WalletIcon active={a} /> },
          { href: "/rapports", label: "Rapports", icon: (a) => <FinanceIcon active={a} /> },
          { href: "/settings", label: "Paramètres", icon: (a) => <GearIcon active={a} /> },
        ];

  for (const item of navItems) item.soon = SOON_ROUTES.has(item.href);

  if (isPlatformAdmin) {
    navItems.push({
      href: "/plateforme",
      label: "Plateforme",
      icon: (a) => <PlatformIcon active={a} />,
    });
  }

  const isItemActive = (href: string) => {
    if (href.startsWith("/dashboard")) return pathname === "/dashboard";
    const pathBase = href.split("?")[0];
    return pathname === pathBase || pathname.startsWith(`${pathBase}/`);
  };

  const accent = MODE_ACCENT[currentMode];
  // Barre du bas volontairement courte : les 3 gestes les plus fréquents + le menu complet.
  const tabHrefs = [homeHref, "/locations", "/caisse"];
  const tabItems = tabHrefs.map((href) => navItems.find((item) => item.href === href)).filter((item): item is NavItem => Boolean(item));

  // Logo officiel : version d'origine en thème clair, version inversée en thème sombre (symbole et
  // « SAMA » en rouge, courbe et « HOME » en clair). Les fichiers d'origine restent dans public/brand/.
  const logo = (
    <>
      <Image src="/brand/sama-home-lockup.png" alt={t("SAMA HOME")} width={720} height={202} priority className="h-auto w-[164px] [[data-theme=dark]_&]:hidden" />
      <Image src="/brand/sama-home-lockup-light.png" alt={t("SAMA HOME")} width={720} height={202} priority className="hidden h-auto w-[164px] [[data-theme=dark]_&]:block" />
    </>
  );

  return (
    <div className="min-h-screen bg-surface text-fg">
      {/* ===================== MENU LATÉRAL (ORDINATEUR) ===================== */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-app-line bg-app-sidebar lg:flex">
        <div className="px-5 pb-6 pt-6">
          <Link href={homeHref} aria-label={t("SAMA HOME, accueil")} className="block w-fit rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-app-focus">
            {logo}
          </Link>
        </div>

        <nav aria-label={t("Navigation principale")} className="flex-1 overflow-y-auto px-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const active = isItemActive(item.href);
              if (item.soon) {
                return (
                  <li key={item.label}>
                    <span aria-disabled="true" className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold text-app-faint">
                      <span className="shrink-0">{item.icon(false)}</span>
                      <span><T>{item.label}</T></span>
                      <span className="ms-auto rounded-full bg-fg/5 px-2 py-0.5 text-[9px] font-bold text-app-faint"><T>Bientôt</T></span>
                    </span>
                  </li>
                );
              }
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-app-focus ${
                      active ? "bg-fg/[0.07] text-app-text" : "text-app-muted hover:bg-fg/[0.04] hover:text-app-text"
                    }`}
                  >
                    {active ? <span aria-hidden className={`absolute inset-y-2 left-0 w-[3px] rounded-r ${accent.bar}`} /> : null}
                    <span className={`shrink-0 ${active ? accent.text : ""}`}>{item.icon(active)}</span>
                    <span><T>{item.label}</T></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-app-line p-3">
          <div className="rounded-xl border border-app-line bg-app-panel-2 p-3">
            <p className="truncate text-[13px] font-bold text-app-text">{shownName}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-app-muted">
              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${accent.bar}`} />
              <T>{shownUnits}</T>
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2.5 px-1">
            <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-app-track text-xs font-bold text-app-text">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-app-text">{displayName}</p>
              <p className="truncate text-[11px] text-app-muted"><T>{roleLabel}</T></p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                aria-label={t("Se déconnecter")}
                title={t("Se déconnecter")}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-app-muted transition-colors hover:bg-fg/[0.06] hover:text-app-bad focus-visible:outline-2 focus-visible:outline-app-focus"
              >
                <LogoutIcon />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ===================== EN-TÊTE ===================== */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-app-line bg-app-sidebar/92 px-4 backdrop-blur lg:left-[248px] lg:h-[60px] lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={homeHref} aria-label={t("SAMA HOME, accueil")} className="flex h-10 w-10 shrink-0 items-center justify-center lg:hidden">
            <Image src="/brand/sama-home-symbol.png" alt="" width={320} height={267} priority className="h-auto w-8 [[data-theme=dark]_&]:hidden" />
            <Image src="/brand/sama-home-symbol-light.png" alt="" width={320} height={267} priority className="hidden h-auto w-8 [[data-theme=dark]_&]:block" />
          </Link>
          <div className="relative hidden w-64 md:block lg:w-96">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-faint"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" x2="16.65" y1="21" y2="16.65" />
            </svg>
            <input
              type="text"
              aria-label={t("Rechercher")}
              placeholder={t(establishmentData.searchPlaceholder)}
              className="h-9 w-full rounded-full border border-app-line bg-app-panel-2 pl-9 pr-3 text-xs text-app-text outline-none placeholder:text-app-faint focus:border-brand-orange"
            />
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {spaces.length > 0 ? (
            <SpaceSwitcher
              spaces={spaces}
              activeId={activeSpaceId}
              triggerClassName="flex max-w-[9.5rem] items-center gap-2 rounded-xl border border-app-line bg-app-panel-2 px-2.5 py-1.5 text-xs font-bold text-app-text sm:max-w-[16rem]"
              iconBgClassName={establishmentData.topDropdownIconBg}
              canAddSpace={userRole === "ADMIN"}
            />
          ) : (
            <div className="flex max-w-[9.5rem] items-center gap-2 rounded-xl border border-app-line bg-app-panel-2 px-2.5 py-1.5 text-xs font-bold text-app-text sm:max-w-[16rem]">
              <span className={`h-2 w-2 shrink-0 rounded-full ${accent.bar}`} aria-hidden />
              <span className="truncate">{shownName}</span>
            </div>
          )}

          <div className="hidden items-center gap-2.5 rounded-xl border border-app-line bg-app-panel-2 px-3 py-1 text-xs text-app-muted md:flex">
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <rect width="18" height="18" x="3" y="4" rx="2" />
              <path d="M3 10h18" />
              <path d="M8 2v4" />
              <path d="M16 2v4" />
            </svg>
            <ShellClock />
          </div>

          <LanguageSwitcher locale={locale} labels={getMessages(locale).common} />

          <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-app-muted transition-colors hover:text-app-text" aria-label={t("Notifications")}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </button>

          <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
            {initial}
          </span>
        </div>
      </header>

      {/* ===================== BARRE D'ONGLETS (MOBILE) ===================== */}
      <nav
        aria-label={t("Navigation principale")}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-app-line bg-app-sidebar/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-4">
          {tabItems.map((item) => {
            const active = isItemActive(item.href);
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-[3.5rem] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-app-focus ${
                    active ? `${accent.text} font-bold` : "text-app-muted"
                  }`}
                >
                  {item.icon(active)}
                  <span><T>{item.label}</T></span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={mobileMenuOpen}
              className="flex min-h-[3.5rem] w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold text-app-muted focus-visible:outline-2 focus-visible:outline-app-focus"
            >
              <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                <line x1="4" x2="20" y1="7" y2="7" />
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="17" y2="17" />
              </svg>
              <span><T>Menu</T></span>
            </button>
          </li>
        </ul>
      </nav>

      {/* ===================== MENU COMPLET (MOBILE) ===================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label={t("Menu")}>
          <button type="button" aria-label={t("Fermer le menu")} className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex h-full w-72 max-w-[85vw] flex-col justify-between overflow-y-auto border-r border-app-line bg-app-sidebar p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div>
              <div className="mb-6 mt-1">{logo}</div>
              <nav aria-label={t("Menu complet")}>
                <ul className="flex flex-col gap-0.5">
                  {navItems.map((item) => (
                    <li key={item.label}>
                      {item.soon ? (
                        <span aria-disabled="true" className="flex min-h-11 cursor-not-allowed items-center gap-3 rounded-lg px-3 text-[13px] font-semibold text-app-faint">
                          <span>{item.icon(false)}</span>
                          <span><T>{item.label}</T></span>
                          <span className="ms-auto rounded-full bg-fg/5 px-2 py-0.5 text-[9px] font-bold text-app-faint"><T>Bientôt</T></span>
                        </span>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          aria-current={isItemActive(item.href) ? "page" : undefined}
                          className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-[13px] font-semibold ${
                            isItemActive(item.href) ? `bg-fg/[0.07] ${accent.text}` : "text-app-muted hover:bg-fg/[0.04] hover:text-app-text"
                          }`}
                        >
                          <span>{item.icon(false)}</span>
                          <span><T>{item.label}</T></span>
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            <div className="mt-6 border-t border-app-line pt-4">
              <div className="mb-3 flex items-center gap-2.5">
                <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-full bg-app-track text-xs font-bold text-app-text">
                  {initial}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-app-text">{displayName}</p>
                  <p className="truncate text-[11px] text-app-muted"><T>{roleLabel}</T></p>
                </div>
              </div>
              <form action={logout}>
                <button type="submit" className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-[13px] font-semibold text-app-bad hover:bg-fg/[0.04]">
                  <LogoutIcon />
                  <span><T>Déconnexion</T></span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===================== CONTENU ===================== */}
      <main className="min-h-screen bg-surface pb-[calc(4rem+env(safe-area-inset-bottom))] pt-14 text-fg lg:pb-0 lg:pl-[248px] lg:pt-[60px]">
        {subscriptionExpired && pathname !== "/abonnement" && !pathname.startsWith("/abonnement/") ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-b border-danger/30 bg-danger-bg px-4 py-3 text-sm font-semibold text-danger sm:px-6">
            <span>
              <T>Votre abonnement a expiré. Vos données sont conservées, mais les nouvelles créations sont bloquées jusqu&apos;au renouvellement.</T>
            </span>
            <Link href="/abonnement" className="rounded-xl bg-brand-orange px-3.5 py-1.5 text-xs font-extrabold text-ink">
              <T>Renouveler maintenant</T>
            </Link>
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
