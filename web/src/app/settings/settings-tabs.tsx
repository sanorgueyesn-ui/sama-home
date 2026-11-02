"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

// Onglets des longs formulaires de paramètres. Tous les panneaux restent dans le DOM (seul l'attribut
// `hidden` change) : un champ d'un onglet masqué est donc toujours envoyé avec le formulaire, et rien
// de ce qui a été saisi ne se perd en changeant d'onglet.

export type SettingsTab = {
  id: string;
  label: string;
  /** Libellé court pour les écrans étroits : les onglets tiennent alors tous sans défilement. */
  shortLabel?: string;
  /** Un champ de cet onglet est en erreur : un point rouge et un texte pour les lecteurs d'écran. */
  flagged?: boolean;
};

const tabDomId = (id: string) => `settings-tab-${id}`;
const panelDomId = (id: string) => `settings-panel-${id}`;

/**
 * Liste d'onglets au clavier : flèches gauche/droite, Début, Fin (patron « tabs » de WAI-ARIA). Sur
 * téléphone elle défile horizontalement ; chaque onglet fait au moins 44 px de haut.
 */
export function SettingsTabs({
  label,
  tabs,
  active,
  onChange,
}: {
  label: string;
  tabs: SettingsTab[];
  active: string;
  onChange: (id: string) => void;
}) {
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});

  // L'onglet actif doit toujours être visible, même si la liste défile (changement au clavier, ou
  // ouverture automatique d'un onglet en erreur).
  useEffect(() => {
    buttons.current[active]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((tab) => tab.id === active);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    onChange(tabs[next].id);
    buttons.current[tabs[next].id]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className="-mx-4 flex gap-0.5 overflow-x-auto border-b border-border/15 px-4 [scrollbar-width:none] sm:mx-0 sm:gap-1 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              buttons.current[tab.id] = element;
            }}
            type="button"
            role="tab"
            id={tabDomId(tab.id)}
            aria-selected={selected}
            aria-controls={panelDomId(tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`relative flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap px-3 text-sm font-bold sm:px-4 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-orange ${
              selected ? "text-fg" : "text-fg/55 hover:text-fg"
            }`}
          >
            {tab.shortLabel ? (
              <>
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </>
            ) : (
              tab.label
            )}
            {tab.flagged ? (
              <>
                <span aria-hidden className="h-2 w-2 rounded-full bg-danger" />
                <span className="sr-only">, à corriger</span>
              </>
            ) : null}
            {selected ? <span aria-hidden className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-orange sm:inset-x-3" /> : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Panneau d'un onglet. Le panneau extérieur porte `hidden` (un `display` posé sur lui l'annulerait) ;
 * la mise en page va dans le conteneur intérieur. `data-tab-panel` permet de retrouver l'onglet d'un
 * champ invalide.
 */
export function SettingsTabPanel({
  id,
  active,
  className = "",
  children,
}: {
  id: string;
  active: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="tabpanel" id={panelDomId(id)} aria-labelledby={tabDomId(id)} hidden={id !== active} data-tab-panel={id}>
      <div className={className}>{children}</div>
    </div>
  );
}
