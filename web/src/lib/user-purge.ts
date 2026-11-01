import type { Prisma } from "@/generated/prisma/client";

/**
 * Purge complète, définitive et irréversible d'un compte utilisateur de la base de données.
 *
 * Déroulement :
 * 1. Délie toutes les clés étrangères optionnelles (Rental.registeredByUserId, CashSession.closedByUserId, etc.).
 * 2. Réassigne les clés étrangères NOT NULL vers un autre compte administrateur si applicable.
 * 3. Supprime les sessions actives et lectures de notifications de l'utilisateur, et DÉTACHE
 *    l'auteur de ses entrées d'audit (`AuditLog.userId` -> NULL). Les entrées d'audit ne sont
 *    JAMAIS supprimées (document de référence v1.0, §3) : seul le lien vers la personne est
 *    retiré. Limite connue : les champs libres (`reason`, `oldValue`, `newValue`) d'anciennes
 *    entrées peuvent encore contenir des identités ; ils ne sont pas réécrits ici.
 * 4. Supprime TOUS les jetons de mot de passe oublié (PasswordResetToken) et codes OTP (OtpVerification)
 *    associés à l'adresse e-mail et à l'identifiant.
 * 5. Supprime définitivement la ligne `User`.
 *
 * Résultat : L'adresse e-mail n'a plus AUCUNE existence sur la plateforme.
 * Toute tentative de mot de passe oublié ou de connexion échouera immédiatement.
 */
export async function purgeUserFromDatabase(
  tx: Prisma.TransactionClient,
  targetUserId: string
): Promise<{ id: string; email: string | null; username: string; name: string }> {
  const target = await tx.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      isPlatformAdmin: true,
      establishmentId: true,
    },
  });

  if (!target) {
    throw new Error("Utilisateur introuvable.");
  }

  // Socle multi-espaces : un compte qui sert plusieurs espaces ne se purge pas d'un seul coup.
  // Le remplaçant des clés NOT NULL ci-dessous est choisi dans UN espace ; il réattribuerait à
  // un administrateur d'un autre espace les caisses et virements créés dans les autres. Refus
  // explicite (transaction annulée, rien n'est modifié) tant que le détachement par espace
  // n'est pas conçu (lot « création d'espace »).
  const membershipCount = await tx.membership.count({ where: { userId: targetUserId } });
  if (membershipCount > 1) {
    throw new Error("Suppression impossible : ce compte appartient à plusieurs espaces professionnels.");
  }

  const emailsToPurge = Array.from(
    new Set([target.email?.toLowerCase(), target.username?.toLowerCase()].filter(Boolean) as string[])
  );

  // 1. Délier les clés étrangères optionnelles (SetNull)
  await tx.rental.updateMany({
    where: { registeredByUserId: targetUserId },
    data: { registeredByUserId: null },
  });

  await tx.cashSession.updateMany({
    where: { closedByUserId: targetUserId },
    data: { closedByUserId: null },
  });

  await tx.bankTransfer.updateMany({
    where: { effectedByUserId: targetUserId },
    data: { effectedByUserId: null },
  });

  await tx.subscriptionPayment.updateMany({
    where: { confirmedByUserId: targetUserId },
    data: { confirmedByUserId: null },
  });

  // 2. Traiter les clés étrangères obligatoires (NOT NULL)
  const substituteUser = await tx.user.findFirst({
    where: {
      id: { not: targetUserId },
      OR: [
        ...(target.establishmentId
          ? [
              { establishmentId: target.establishmentId, role: "ADMIN" as const },
              // Socle multi-espaces : un ADMIN de l'espace par appartenance (même tenant).
              { memberships: { some: { establishmentId: target.establishmentId, role: "ADMIN" as const } } },
            ]
          : []),
        { isPlatformAdmin: true },
      ],
    },
    select: { id: true },
    // Déterministe : toujours le plus ancien compte qualifié (sinon le choix variait d'un appel à l'autre).
    orderBy: { createdAt: "asc" },
  });

  if (substituteUser) {
    await tx.cashSession.updateMany({
      where: { openedByUserId: targetUserId },
      data: { openedByUserId: substituteUser.id },
    });
    await tx.cashCorrection.updateMany({
      where: { userId: targetUserId },
      data: { userId: substituteUser.id },
    });
    await tx.bankAccount.updateMany({
      where: { createdByUserId: targetUserId },
      data: { createdByUserId: substituteUser.id },
    });
    await tx.bankTransfer.updateMany({
      where: { createdByUserId: targetUserId },
      data: { createdByUserId: substituteUser.id },
    });
    await tx.transferSchedule.updateMany({
      where: { createdByUserId: targetUserId },
      data: { createdByUserId: substituteUser.id },
    });
  }

  // 3. Supprimer les éléments directement rattachés à l'utilisateur
  await tx.session.deleteMany({ where: { userId: targetUserId } });
  await tx.notificationRead.deleteMany({ where: { userId: targetUserId } });
  // Conservation de l'audit : `AuditLog.userId` est nullable (migration 20261014150000), aucune
  // migration requise. Doit précéder `user.delete` (clé étrangère Restrict).
  await tx.auditLog.updateMany({ where: { userId: targetUserId }, data: { userId: null } });

  // Lot 3B — demandes de paiement manuel / prolongation encore en attente du demandeur supprimé :
  // elles ne pourraient plus être approuvées (`requestedByUserId` passe à NULL, clé étrangère
  // `SET NULL`) ni annulées par personne. On les annule explicitement, en UNE SEULE instruction :
  // `status_fields_check` exige `decidedAt` dès que le statut quitte l'attente. Aucune demande
  // n'est supprimée ; les demandes déjà approuvées, rejetées ou annulées sont préservées, et
  // `decidedByUserId` reste NULL (annulation par le système). Les références restantes à
  // l'utilisateur (demandeur ou décideur d'une demande close) sont mises à NULL par la base.
  await tx.subscriptionChangeRequest.updateMany({
    where: { requestedByUserId: targetUserId, status: "PENDING_SECOND_APPROVAL" },
    data: { status: "CANCELLED", decidedAt: new Date(), decisionReason: "Demandeur supprimé" },
  });

  // 4. Purge TOTALE des jetons de mot de passe oublié et d'OTP pour cet e-mail / identifiant
  for (const email of emailsToPurge) {
    await tx.passwordResetToken.deleteMany({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    await tx.otpVerification.deleteMany({
      where: { email: { equals: email, mode: "insensitive" } },
    });
  }

  // 5. Suppression définitive du compte utilisateur
  await tx.user.delete({ where: { id: targetUserId } });

  return target;
}
