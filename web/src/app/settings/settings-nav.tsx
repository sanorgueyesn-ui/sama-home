"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive, visibleGroups } from "./settings-nav-config";

/**
 * Menu des sections (ordinateur uniquement). Sur téléphone, c'est la vue d'ensemble qui joue ce
 * rôle : une liste de sections, puis une page par section avec un retour. Reçoit seulement
 * `isAdmin` (les icônes sont des composants, qui ne traversent pas la frontière serveur/client).
 */
export function SettingsNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Sections des paramètres" className="hidden self-start lg:sticky lg:top-24 lg:block">
      <p className="px-3 text-lg font-extrabold text-fg">Paramètres</p>
      <div className="mt-4 flex flex-col gap-5">
        {visibleGroups(isAdmin).map((group) => (
          <div key={group.title}>
            <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-fg/45">{group.title}</p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isNavItemActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-orange ${
                        active ? "bg-fg/8 text-fg" : "text-fg/65 hover:bg-fg/5 hover:text-fg"
                      }`}
                    >
                      {active ? <span aria-hidden className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-brand-orange" /> : null}
                      <span className={active ? "text-brand-orange" : "text-fg/50"}>
                        <Icon />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
