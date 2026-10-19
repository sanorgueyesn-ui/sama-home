import type { Prisma } from "@/generated/prisma/client";

/**
 * Purge complète, définitive et irréversible d'un compte utilisateur de la base de données.
 *
 * Déroulement :
 * 1. Délie toutes les clés étrangères optionnelles (Rental.registeredByUserId, CashSession.closedByUserId, etc.).
 * 2. Réassigne les clés étrangères NOT NULL vers un autre compte administrateur si applicable.
 * 3. Supprime les sessions actives, lectures de notifications et entrées d'audit de l'utilisateur.
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
        ...(target.establishmentId ? [{ establishmentId: target.establishmentId, role: "ADMIN" as const }] : []),
        { isPlatformAdmin: true },
      ],
    },
    select: { id: true },
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
  await tx.auditLog.deleteMany({ where: { userId: targetUserId } });

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
