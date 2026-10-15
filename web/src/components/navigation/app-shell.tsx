"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { logout } from "@/app/actions/auth";

// Navigation persistante présente sur TOUTE page authentifiée, pour
// qu'aucun écran ne soit un cul-de-sac : barre d'onglets fixe en mobile ET
// tablette, barre latérale fixe à partir du breakpoint desktop (lg,
// 1024px) uniquement — en dessous, réserver 240px à une sidebar en flux
// décentrait visuellement le contenu par rapport au viewport.
//
// Reconstruction UI (maquettes Stitch validées, design system Nocturne
// Opulence) — barre principale réduite à Accueil/Séjour/Dépenses (règle
// stricte des 3 éléments, PRD section 2.3). "Séjour" pointe vers /sejour
// (Lot 2) — hub Louer/Réserver, voir app/sejour/page.tsx ; /reservations et
// /locations restent des routes métier à part entière, jamais supprimées.
// "Locataires" n'est plus un item principal (absent
// de la bottom nav des maquettes) mais reste joignable depuis Menu/sidebar,
// jamais retiré de l'app. « Finances » et « Sécurité » restent `disabled:
// true` : aucune route réelle derrière (vérifié).
//
// Le logo/texte "SAMA HOME" remplace le placeholder "Résidence Atlantique"
// visible sur l'ancienne maquette (nom de marque incohérent, signalé dans
// le rapport d'audit — non repris ici).

type NavItem = {
  href?: string;
  label: string;
  icon: (active: boolean) => ReactNode;
  /** Élément de la MAQUETTE AT sans page fonctionnelle réelle derrière —
   * affiché mais non cliquable, jamais une fausse destination. */
  disabled?: boolean;
};

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

// Phase 3G / Lot D12-P61 — jamais ajouté à MENU_ITEMS/PRIMARY_ITEMS
// ci-dessus : ces tableaux sont statiques et leur longueur/ordre conditionne
// le découpage PC_GROUP_OPERATIONS/PC_GROUP_ADMIN (slice(0,6)/slice(6)) et la
// règle stricte des 3 éléments de la barre principale — y insérer un élément
// conditionnel aurait décalé ces index. Rendu séparément, conditionné par
// `isPlatformAdmin`, après les groupes existants.
const PLATFORM_NAV_ITEM: NavItem = {
  href: "/plateforme",
  label: "Espace plateforme",
  icon: (a) => <PlatformIcon active={a} />,
};

// Toujours visibles : barre principale mobile ET premier groupe de la
// sidebar PC. Exactement 3 éléments (PRD section 2.3) — jamais
// Locataires/Réservations/Locations/Paramètres ici.
const PRIMARY_ITEMS: NavItem[] = [
  { href: "/", label: "Accueil", icon: (a) => <HomeIcon active={a} /> },
  { href: "/sejour", label: "Séjour", icon: (a) => <KeyIcon active={a} /> },
  { href: "/depenses", label: "Dépenses", icon: (a) => <WalletIcon active={a} /> },
];

// Fonctions secondaires/admin : Menu mobile/tablette ET reste de la sidebar
// PC. Ordre demandé : Logements, Réservations, Locations, Locataires,
// Finances, Caisse, Paramètres, Utilisateurs, Sécurité. Finances et
// Sécurité désactivées — voir le commentaire d'en-tête.
const MENU_ITEMS: NavItem[] = [
  { href: "/logements", label: "Logements", icon: (a) => <BuildingIcon active={a} /> },
  { href: "/reservations", label: "Réservations", icon: (a) => <CalendarIcon active={a} /> },
  { href: "/locations", label: "Locations", icon: (a) => <KeyIcon active={a} /> },
  { href: "/clients", label: "Locataires", icon: (a) => <PeopleIcon active={a} /> },
  { label: "Finances", icon: (a) => <FinanceIcon active={a} />, disabled: true },
  { href: "/caisse", label: "Caisse", icon: (a) => <CashIcon active={a} /> },
  { href: "/settings", label: "Paramètres", icon: (a) => <GearIcon active={a} /> },
  { href: "/settings/users", label: "Utilisateurs", icon: (a) => <UserIcon active={a} /> },
  { label: "Sécurité", icon: (a) => <SecurityIcon active={a} />, disabled: true },
];
// La sidebar PC groupe Logements→Caisse puis Paramètres→Sécurité ; dérivé
// de MENU_ITEMS plutôt que dupliqué.
const PC_GROUP_OPERATIONS = MENU_ITEMS.slice(0, 6);
const PC_GROUP_ADMIN = MENU_ITEMS.slice(6);

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Audit 11A — éléments réellement focalisables à l'intérieur du dialogue
 * (menu mobile/tablette), recalculés à chaque pression de touche plutôt que
 * mis en cache, pour rester corrects même si la liste change (ex. items
 * `disabled`, déjà exclus car rendus en `<span>` non focalisable). */
function getFocusable(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
  );
}

/** Une entrée de nav (sidebar PC ou feuille Menu) — gère le cas `disabled`
 * en rendu non interactif, jamais un lien mort. */
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
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-fg/30"
      >
        {item.icon(false)}
        {item.label}
        <span className="ml-auto rounded-full bg-fg/10 px-2 py-0.5 text-[10px] font-bold text-fg/45">
          Bientôt
        </span>
      </span>
    );
  }
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
        active ? "bg-navy text-white" : "text-fg/70 hover:bg-surface-sunken"
      }`}
    >
      {item.icon(active)}
      {item.label}
    </Link>
  );
}

export function AppShell({
  children,
  isPlatformAdmin = false,
}: {
  children: ReactNode;
  /**
   * Phase 3G / Lot D12-P61 — reçu depuis layout.tsx, déjà résolu via
   * getCurrentUserOrNull() (jamais recalculé ici, jamais une nouvelle
   * requête). Contrôle UNIQUEMENT l'affichage du lien "Espace plateforme" —
   * ne constitue jamais une protection : `requirePlatformAdmin()` (dal.ts)
   * reste le seul contrôle d'autorisation réel sur /plateforme. Jamais
   * déduit de `role === "ADMIN"`/`"GESTIONNAIRE"`.
   */
  isPlatformAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Audit 11A — tant que le dialogue est ouvert : focus déplacé vers son
  // premier élément, Échap le ferme, Tab/Maj+Tab restent bornés à son
  // contenu (le reste de la page est déjà rendu `inert`, donc inatteignable
  // au clavier — cette boucle ne fait que rendre la navigation cyclique
  // plutôt que de sortir vers le chrome du navigateur), et le focus revient
  // au bouton « Menu » à la fermeture, quelle que soit la façon dont elle a
  // été déclenchée (Fermer, overlay, Échap, clic sur un lien du menu).
  useEffect(() => {
    if (!menuOpen) return;
    const dialog = dialogRef.current;
    const menuButton = menuButtonRef.current;
    if (!dialog) return;

    // Le focus initial cible le premier lien du menu plutôt que le bouton
    // "Fermer" (lui aussi focalisable, en première position dans le DOM) :
    // "Fermer" est un calque plein écran invisible — un anneau de focus
    // dessus serait imperceptible (confirmé visuellement). Il reste
    // atteignable normalement via Maj+Tab depuis le premier lien.
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
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside
        inert={menuOpen}
        className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-border/10 lg:bg-surface-raised lg:px-3 lg:py-6"
      >
        <div className="mb-6 px-3 text-lg font-extrabold tracking-tight text-fg">SAMA HOME</div>
        <nav className="flex flex-1 flex-col gap-1">
          {PRIMARY_ITEMS.map((item) => (
            <NavRow key={item.label} item={item} active={isActive(pathname, item.href!)} />
          ))}

          <div className="my-3 border-t border-border/10" />

          {PC_GROUP_OPERATIONS.map((item) => (
            <NavRow
              key={item.label}
              item={item}
              active={!item.disabled && isActive(pathname, item.href!)}
            />
          ))}

          <div className="my-3 border-t border-border/10" />

          {PC_GROUP_ADMIN.map((item) => (
            <NavRow
              key={item.label}
              item={item}
              active={!item.disabled && isActive(pathname, item.href!)}
            />
          ))}

          {isPlatformAdmin ? (
            <>
              <div className="my-3 border-t border-border/10" />
              <NavRow item={PLATFORM_NAV_ITEM} active={isActive(pathname, PLATFORM_NAV_ITEM.href!)} />
            </>
          ) : null}
        </nav>
        <form action={logout}>
          <button
            type="submit"
            className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-fg/70 hover:bg-surface-sunken"
          >
            <LogoutIcon />
            Déconnexion
          </button>
        </form>
      </aside>

      {/* Header mobile/tablette — PRD section 5.1 : Paramètres | SAMA HOME |
          Menu. Absent en desktop (lg), où la sidebar porte déjà ces accès. */}
      <header
        inert={menuOpen}
        className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/10 bg-surface-raised px-4 lg:hidden"
      >
        <Link
          href="/settings"
          aria-label="Paramètres"
          className="flex h-9 w-9 items-center justify-center rounded-full text-fg/70 hover:bg-surface-sunken"
        >
          <GearIcon active={isActive(pathname, "/settings")} />
        </Link>
        <span className="text-sm font-extrabold tracking-tight text-fg">SAMA HOME</span>
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

      <div inert={menuOpen} className="min-w-0 flex-1 pb-28 lg:pb-0">
        {children}
      </div>

      {/* Barre flottante — maquette Stitch (Séjour responsive) : EXACTEMENT 3
          items (Accueil/Séjour/Dépenses), plus de 4e item "Menu" ici — le
          Menu reste accessible uniquement depuis le header (bouton ☰ à
          droite), jamais retiré de l'app. */}
      <nav
        inert={menuOpen}
        className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex h-16 items-stretch gap-1 rounded-[28px] border border-border/10 bg-surface-raised px-2 shadow-card lg:hidden"
      >
        {PRIMARY_ITEMS.map((item) => {
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
            className="absolute inset-0 bg-navy/40"
          />
          <div className="relative w-full rounded-t-2xl bg-surface-raised px-4 pt-4 [padding-bottom:calc(env(safe-area-inset-bottom)+1.5rem)]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-fg/15" />
            <nav className="flex flex-col gap-1">
              {MENU_ITEMS.map((item) => (
                <NavRow
                  key={item.label}
                  item={item}
                  active={!item.disabled && isActive(pathname, item.href!)}
                  onNavigate={() => setMenuOpen(false)}
                />
              ))}
              {isPlatformAdmin ? (
                <NavRow
                  item={PLATFORM_NAV_ITEM}
                  active={isActive(pathname, PLATFORM_NAV_ITEM.href!)}
                  onNavigate={() => setMenuOpen(false)}
                />
              ) : null}
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
