import "server-only";
import { cache } from "react";
import { getLocale } from "./locale";
import { getPhraseBook } from "./phrases";
import { createT, type TFunction } from "./translate";

/**
 * Fonction de traduction pour un composant serveur ASYNCHRONE ou une action serveur :
 * `const t = await getT(); t("Enregistré.")`. La langue vient du cookie de la personne qui fait la
 * requête, jamais d'une valeur envoyée par un formulaire.
 */
export const getT = cache(async (): Promise<TFunction> => createT(getPhraseBook(await getLocale())));
