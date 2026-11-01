import type { Prisma } from "@/generated/prisma/client";

/**
 * Socle multi-espaces — appartenances qui rendent la suppression d'un établissement dangereuse.
 * Fonction pure, partagée par `deleteEstablishment` (establishment-approval.ts) et par le script
 * de vérification SQL : une seule définition, pour qu'elles ne puissent pas diverger.
 *
 * Deux cas, tous deux refusés :
 *  1. une appartenance ICI d'un compte dont la colonne historique `User.establishmentId`
 *     pointe ailleurs ou est NULL : la clé `Restrict` bloquerait la suppression, et le compte
 *     sert un autre espace ;
 *  2. un compte de CET établissement (colonne historique) qui appartient aussi à un autre
 *     espace : le supprimer détruirait un compte encore utile ailleurs.
 *
 * Le `OR` explicite sur `null` est indispensable : en SQL, `establishmentId <> X` n'est jamais
 * vrai pour une valeur NULL, donc `{ not: X }` seul ignorerait ces comptes.
 */
export function sharedAccountsWhere(establishmentId: string): Prisma.MembershipWhereInput {
  return {
    OR: [
      {
        establishmentId,
        user: { OR: [{ establishmentId: null }, { establishmentId: { not: establishmentId } }] },
      },
      { establishmentId: { not: establishmentId }, user: { establishmentId } },
    ],
  };
}
