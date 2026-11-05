"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { isNavItemActive, visibleGroups } from "./settings-nav-config";
import { useT, T } from "@/components/i18n/i18n-provider";

/**
 * Barre de navigation des paramètres, en haut de page (ordinateur uniquement). Sur téléphone, c'est
 * la vue d'ensemble qui joue ce rôle : une liste de sections, puis une page par section avec un
 * retour. Les entrées passent à la ligne quand la place manque (rien ne dépasse jamais à droite) ;
 * l'entrée active est une pastille pleine. Reçoit seulement `isAdmin` : les icônes sont des composants, qui ne
 * traversent pas la frontière serveur/client, et la barre n'en a pas besoin.
 */
export function SettingsNav({ isAdmin }: { isAdmin: boolean }) {
  const t = useT();
  const pathname = usePathname();
  const groups = visibleGroups(isAdmin);
  return (
    <nav aria-label={t("Sections des paramètres")} className="hidden lg:block">
      <ul className="flex flex-wrap items-center gap-1 rounded-2xl border border-border/15 bg-surface-raised p-1.5">
        {groups.map((group) => (
          <Fragment key={group.title}>
            {group.items.map((item) => {
              const active = isNavItemActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    title={t(item.label)}
                    className={`flex h-10 items-center whitespace-nowrap rounded-full px-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${
                      active ? "bg-fg text-surface" : "text-fg/65 hover:bg-fg/[0.06] hover:text-fg"
                    }`}
                  >
                    <T>{item.shortLabel ?? item.label}</T>
                  </Link>
                </li>
              );
            })}
          </Fragment>
        ))}
      </ul>
    </nav>
  );
}
