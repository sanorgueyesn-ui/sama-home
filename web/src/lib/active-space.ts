// Socle multi-espaces (lot B) — choix de l'espace actif d'un compte. Module PUR (aucune base,
// aucun cookie) pour pouvoir être testé seul ; src/lib/dal.ts l'appelle avec les appartenances
// lues en base. Voir NOUVEAUS GUIDE SAMA HOME/05-plan-socle-multi-espaces.md.

export type MembershipRole = "ADMIN" | "GESTIONNAIRE";

export type MembershipRow = {
  establishmentId: string;
  role: MembershipRole;
};

/**
 * Espace actif d'un compte, jamais déduit d'une donnée du navigateur :
 *  1. `activeEstablishmentId` (écrit par le serveur dans la session) n'est retenu que s'il
 *     correspond à une appartenance RÉELLE du compte. Un accès révoqué en cours de session
 *     laisse cette colonne périmée : elle est donc toujours revalidée ici.
 *  2. Sinon, l'unique appartenance du compte, s'il n'en a qu'une.
 *  3. Sinon `null` : aucun espace (compte sans appartenance, ou plusieurs appartenances sans
 *     choix valide — le sélecteur d'espace, lot C, décidera). Jamais de repli sur
 *     `User.establishmentId`, qui redonnerait un accès sans appartenance.
 */
export function pickActiveMembership(
  memberships: readonly MembershipRow[],
  activeEstablishmentId: string | null | undefined,
): MembershipRow | null {
  if (activeEstablishmentId) {
    const chosen = memberships.find((m) => m.establishmentId === activeEstablishmentId);
    if (chosen) return chosen;
  }
  return memberships.length === 1 ? memberships[0] : null;
}

/**
 * Identité d'établissement exposée par `getCurrentUser()`.
 *  - Compte d'établissement : espace et rôle viennent UNIQUEMENT de l'appartenance retenue.
 *    Sans appartenance, `establishmentId` et `role` valent `null` (aucun accès métier).
 *  - Compte de plateforme (`isPlatformAdmin`) sans appartenance : il n'a pas d'espace ; son rôle
 *    historique (`User.role`) est conservé tel quel, comme avant ce lot, pour ne rien changer
 *    aux accès de plateforme.
 */
export function resolveEstablishmentIdentity(input: {
  isPlatformAdmin: boolean;
  legacyRole: MembershipRole | null;
  memberships: readonly MembershipRow[];
  activeEstablishmentId: string | null | undefined;
}): { establishmentId: string | null; role: MembershipRole | null } {
  const active = pickActiveMembership(input.memberships, input.activeEstablishmentId);
  if (active) return { establishmentId: active.establishmentId, role: active.role };
  if (input.isPlatformAdmin && input.memberships.length === 0) {
    return { establishmentId: null, role: input.legacyRole };
  }
  return { establishmentId: null, role: null };
}

/**
 * Le compte doit CHOISIR un espace avant de voir la moindre donnée métier : plusieurs
 * appartenances et aucun espace actif valide. Un compte à un seul espace, ou sans appartenance,
 * n'est jamais concerné (il n'y a rien à choisir).
 */
export function needsSpaceSelection(
  memberships: readonly MembershipRow[],
  activeEstablishmentId: string | null | undefined,
): boolean {
  return memberships.length > 1 && pickActiveMembership(memberships, activeEstablishmentId) === null;
}
