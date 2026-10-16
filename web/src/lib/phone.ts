/**
 * Règle de téléphone UNIQUE du projet (Phase 3, ClientSchema à l'origine) :
 * après suppression des espaces/points/tirets, 8 à 15 chiffres, avec un "+"
 * initial optionnel. Volontairement pas restreint à un indicatif précis
 * (+221) : un client peut être étranger.
 *
 * Centralisé ici (audit "Correction globale" — le brief demande
 * explicitement d'éviter de dupliquer une règle de formatage dans plusieurs
 * fichiers) : `src/lib/definitions.ts` (ClientSchema, SettingsSchema) et
 * `src/lib/whatsapp.ts` important désormais cette seule définition, au lieu
 * de deux copies littérales du même regex.
 */
export const PHONE_REGEX = /^\+?[0-9]{8,15}$/;
