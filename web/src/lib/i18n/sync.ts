// Traduction SYNCHRONE pour un composant serveur de présentation (rendu sans `await`, testable avec
// `renderToStaticMarkup`). La langue est celle mémorisée par `getLocale()` au début de la requête (la
// page racine l'appelle toujours) ; sans elle, le français s'affiche : repli sûr, jamais une erreur.
import { currentLocale } from "./date-locale";
import { getPhraseBook } from "./phrases";
import { createT, type TFunction } from "./translate";

export function tSync(): TFunction {
  return createT(getPhraseBook(currentLocale()));
}
