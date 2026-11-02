import type { ComponentType } from "react";
import { DocumentIcon, DomainIcon, GridIcon, InfoIcon, LockIcon, PaletteIcon, PeopleIcon, ReceiptIcon, TransferIcon, WalletIcon } from "./settings-icons";

// Source unique de l'organisation des paramètres : la barre de navigation du haut ET la vue
// d'ensemble la lisent. `adminOnly` ne fait que masquer l'entrée ; la vraie protection reste
// `requireAdmin()` dans chaque page et chaque action (jamais le seul masquage de l'interface).

export type SettingsNavItem = {
  href: string;
  label: string;
  /** Libellé court de la barre du haut, où la place est comptée. Par défaut : `label`. */
  shortLabel?: string;
  icon: ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

export type SettingsNavGroup = { title: string; items: SettingsNavItem[] };

export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    title: "Général",
    items: [
      { href: "/settings", label: "Vue d'ensemble", shortLabel: "Général", icon: GridIcon },
      { href: "/settings/etablissement", label: "Établissement", icon: DomainIcon },
      { href: "/settings/apparence", label: "Apparence", icon: PaletteIcon },
    ],
  },
  {
    title: "Activité",
    items: [
      { href: "/settings/expense-categories", label: "Catégories de dépenses", shortLabel: "Dépenses", icon: ReceiptIcon, adminOnly: true },
      { href: "/settings/documents", label: "Documents", icon: DocumentIcon, adminOnly: true },
    ],
  },
  {
    title: "Équipe",
    items: [{ href: "/settings/users", label: "Utilisateurs", shortLabel: "Équipe", icon: PeopleIcon, adminOnly: true }],
  },
  {
    title: "Finances",
    items: [
      { href: "/settings/bank-accounts", label: "Comptes bancaires", shortLabel: "Banque", icon: WalletIcon, adminOnly: true },
      { href: "/settings/transfer-schedules", label: "Virements programmés", shortLabel: "Virements", icon: TransferIcon, adminOnly: true },
    ],
  },
  {
    title: "Mon compte",
    items: [{ href: "/settings/password", label: "Mot de passe", shortLabel: "Compte", icon: LockIcon }],
  },
  {
    title: "Informations",
    items: [{ href: "/settings/a-propos", label: "À propos", icon: InfoIcon }],
  },
];

export function visibleGroups(isAdmin: boolean): SettingsNavGroup[] {
  return SETTINGS_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => isAdmin || !item.adminOnly),
  })).filter((group) => group.items.length > 0);
}

/** Une entrée est active sur sa page et ses pages enfants (« /settings » seul : exactement). */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/settings") return pathname === "/settings";
  return pathname === href || pathname.startsWith(`${href}/`);
}
