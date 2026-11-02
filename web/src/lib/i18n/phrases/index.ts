// Recueils de phrases par langue. Le français est la langue source : son recueil est vide (le texte du
// code EST le français). Chaque autre langue est la fusion de ses fichiers par domaine.
import type { Locale } from "../config";
import type { PhraseBook } from "../translate";
import { enShell } from "./en/shell";
import { enApp } from "./en/app";
import { enApp2 } from "./en/app2";
import { enApp3 } from "./en/app3";
import { enDocuments } from "./en/documents";
import { enLanding } from "./en/landing";
import { enPricing } from "./en/pricing";
import { enPayments } from "./en/payments";
import { enPatterns } from "./en/patterns";
import { enVocab } from "./en/vocab";

// `enShell` (menu) passe en dernier : ses libellés courts (« Clients », « Planning ») priment sur les phrases générées.
const EN: PhraseBook = { ...enApp, ...enApp2, ...enApp3, ...enDocuments, ...enLanding, ...enPricing, ...enPayments, ...enPatterns, ...enVocab, ...enShell };

const BY_LOCALE: Record<Locale, PhraseBook> = {
  fr: {},
  en: EN,
  ar: {},
};

export function getPhraseBook(locale: Locale): PhraseBook {
  return BY_LOCALE[locale];
}
