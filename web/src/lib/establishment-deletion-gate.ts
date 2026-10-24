/**
 * Lot 0 (sécurisation) — gel TEMPORAIRE de la suppression définitive d'un
 * établissement. Module pur : source unique partagée par l'action serveur
 * (`deleteEstablishment`, garde réelle) et l'interface (masquage du bouton).
 *
 * Pourquoi : la suppression actuelle efface en un seul geste les finances,
 * les abonnements et les journaux d'audit, ce que le document de référence
 * v1.0 (§3, §4, §5) ne permet pas ; elle ne prévoit ni export, ni délai, ni
 * approbation indépendante. Le cycle de fermeture contrôlée sera conçu dans un
 * lot ultérieur, après décisions juridiques et métier.
 *
 * Aucune donnée n'est touchée : la suspension et la réactivation restent
 * disponibles. Le code de suppression d'origine est conservé tel quel,
 * inatteignable tant que ce drapeau vaut `false`.
 */
export const ESTABLISHMENT_DELETION_ENABLED: boolean = false;

export const ESTABLISHMENT_DELETION_DISABLED_MESSAGE =
  "La suppression définitive d'un établissement est temporairement désactivée. Utilisez la suspension ; la fermeture contrôlée sera mise en place ultérieurement.";
