// Registre des messages et résolution avec repli sur le français — module PUR.
//
// Comment ajouter :
//  - un NOUVEAU DOMAINE (ex. `auth`, `dashboard`, `residence`, `hotel`, `agency`) : ajouter
//    l'espace de noms dans fr.ts (source de vérité). Les types se mettent à jour partout.
//  - une TRADUCTION : remplir l'espace de noms correspondant dans en.ts / ar.ts. Tant qu'une clé
//    manque, le français s'affiche. Quand une langue est entièrement relue, passer son statut à
//    « ready » dans config.ts (c'est ce qui la rend sélectionnable en production).

import type { Locale } from "../config";
import { fr, type Messages } from "./fr";
import { en } from "./en";
import { ar } from "./ar";

export type { Messages };

export type DeepPartial<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

const BY_LOCALE: Record<Locale, DeepPartial<Messages>> = { fr, en, ar };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Fusion profonde : les valeurs de `override` remplacent celles de `base` ; les tableaux sont remplacés en bloc. */
export function mergeMessages<T>(base: T, override: DeepPartial<T> | undefined): T {
  if (override === undefined) return base;
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return (override as T) ?? base;
  }
  const result: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    const value = (override as Record<string, unknown>)[key];
    if (value === undefined) continue;
    result[key] = mergeMessages((base as Record<string, unknown>)[key], value as never);
  }
  return result as T;
}

/** Messages complets d'une langue, avec repli sur le français pour tout ce qui manque. */
export function getMessages(locale: Locale): Messages {
  if (locale === "fr") return fr; // langue source : rien à fusionner
  return mergeMessages<Messages>(fr, BY_LOCALE[locale]);
}

/** Interpolation simple : « Bonjour {name} » + { name: "Awa" }. Les variables absentes restent visibles. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
