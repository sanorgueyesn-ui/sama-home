"use client";

import { useEffect } from "react";
import { useLocale, useT } from "./i18n-provider";

/**
 * Titre de l'onglet du navigateur dans la langue choisie. Les titres des pages sont écrits en
 * français dans le code (`metadata`) ; ce composant les traduit côté navigateur avec le même
 * dictionnaire que l'écran, à chaque changement de titre. En français il ne fait rien.
 */
export function TitleTranslator() {
  const locale = useLocale();
  const t = useT();

  useEffect(() => {
    if (locale === "fr") return;
    const title = document.querySelector("title");
    if (!title) return;
    const apply = () => {
      const current = document.title;
      const next = t(current);
      if (next !== current) document.title = next;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [locale, t]);

  return null;
}
