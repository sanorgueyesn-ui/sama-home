"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { isNavItemActive, visibleGroups } from "./settings-nav-config";

/**
 * Barre de navigation des paramètres, en haut de page (ordinateur uniquement). Sur téléphone, c'est
 * la vue d'ensemble qui joue ce rôle : une liste de sections, puis une page par section avec un
 * retour. Les groupes (Général, Activité, Équipe…) sont séparés par un trait fin ; l'entrée active
 * est une pastille pleine. Reçoit seulement `isAdmin` : les icônes sont des composants, qui ne
 * traversent pas la frontière serveur/client, et la barre n'en a pas besoin.
 */
export function SettingsNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const groups = visibleGroups(isAdmin);
  return (
    <nav aria-label="Sections des paramètres" className="hidden lg:block">
      <ul className="flex items-center gap-0.5 overflow-x-auto rounded-full border border-border/15 bg-surface-raised p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((group, index) => (
          <Fragment key={group.title}>
            {index > 0 ? <li aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border/30" /> : null}
            {group.items.map((item) => {
              const active = isNavItemActive(pathname, item.href);
              return (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    title={item.label}
                    className={`flex h-10 items-center whitespace-nowrap rounded-full px-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${
                      active ? "bg-fg text-surface" : "text-fg/65 hover:bg-fg/[0.06] hover:text-fg"
                    }`}
                  >
                    {item.shortLabel ?? item.label}
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
