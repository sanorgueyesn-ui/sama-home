"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession, requireActiveEstablishment } from "@/lib/dal";
import { getSessionCookiePayload } from "@/lib/session-token";
import { hashPassword, verifyPassword } from "@/lib/password";
import { SettingsSchema, ChangePasswordSchema, type SettingsFormState, type ChangePasswordFormState } from "@/lib/definitions";

/**
 * Bloc 4/5/16 — server-validated, upserted against the establishment's own
 * `Settings` row. Phase 3F / Lot D12-D — résolu par `establishmentId`
 * (jamais depuis le navigateur) plutôt que par l'ancien identifiant fixe
 * `SETTINGS_ID`.
 *
 * D12-P162 — le téléversement de logo (Bucket S3) est volontairement HORS
 * PÉRIMÈTRE de ce correctif multi-tenant : cette fonction ne touche plus du
 * tout `logoUrl`. Le code S3 correspondant reste présent ailleurs dans
 * l'arbre de travail (`src/lib/image-upload.ts`, `src/lib/object-storage.ts`,
 * `src/lib/s3-client.ts`), non modifié, en attente d'un lot dédié et audité
 * séparément.
 */
export async function updateSettings(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  // Phase 3G / Lot D12-P110 — faille confirmée en D12-P109 : modifier les
  // paramètres de l'établissement est une mutation de ses données métier,
  // gardée au même titre que updateProperty()/updateClient().
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { message: "Votre compte n'est rattaché à aucun établissement — impossible d'enregistrer les paramètres." };
      case "INACTIVE":
        return { message: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { message: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { message: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const { user } = access;
  if (!user.establishmentId) {
    return { message: "Votre compte n'est rattaché à aucun établissement — impossible d'enregistrer les paramètres." };
  }

  const parsed = SettingsSchema.safeParse({
    establishmentName: formData.get("establishmentName"),
    phone: formData.get("phone"),
    secondaryPhone: formData.get("secondaryPhone"),
    address: formData.get("address"),
    email: formData.get("email"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await prisma.settings.upsert({
      where: { establishmentId: user.establishmentId },
      update: parsed.data,
      create: { establishmentId: user.establishmentId, ...parsed.data },
    });
  } catch (error) {
    console.error("updateSettings() — échec inattendu de l'enregistrement :", error);
    return { message: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
  }

  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

/**
 * Bloc 10 — "Modifier mon mot de passe" (self-service). The CURRENT password
 * is re-verified server-side via the exact same verifyPassword used by
 * login (Bloc 10: "ne jamais faire confiance à une validation uniquement
 * côté navigateur") before any hash is written.
 */
export async function changePassword(
  _prevState: ChangePasswordFormState,
  formData: FormData,
): Promise<ChangePasswordFormState> {
  // Phase 3G / Lot D12-P110 — décision explicite prise en D12-P109/P110 :
  // volontairement JAMAIS gardée par requireActiveEstablishment() — une
  // action d'hygiène de sécurité du compte (changer son propre mot de passe)
  // ne doit jamais dépendre du statut métier de l'établissement, exactement
  // comme resetUserPassword() (users.ts). Cette fonction ne touche d'ailleurs
  // à aucune donnée d'établissement (`establishmentId` n'intervient nulle
  // part ci-dessous).
  const { userId } = await verifySession();

  const parsed = ChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) {
    return { errors: { currentPassword: ["Mot de passe actuel incorrect."] } };
  }

  const passwordHash = await hashPassword(newPassword);
  // Phase 3G / Lot D12-P28 — même faille que resetUserPassword (D12-P26/27) :
  // un changement de mot de passe ne révoquait jusqu'ici aucune autre
  // session active de ce compte. `verifySession()` ne retourne que `userId`,
  // jamais le `sessionId` courant — relecture directe du cookie signé via
  // `getSessionCookiePayload()` (même mécanisme déjà utilisé par dal.ts en
  // interne, aucun champ ni mécanisme inventé) pour identifier sans
  // ambiguïté la session courante et la préserver : l'utilisateur ne doit
  // pas être déconnecté par sa propre action de changement de mot de passe.
  // Phase 3G / Lot D12-P30 — cas limite confirmé en D12-P29 : si le cookie
  // expire pile entre l'appel à verifySession() plus haut et cette relecture
  // (fenêtre de quelques millisecondes), `currentSessionPayload` peut être
  // `null` alors que la session courante est toujours valide en base à cet
  // instant précis. Dans ce cas, ne supprimer AUCUNE session plutôt que de
  // toutes les supprimer sans exclusion — jamais déconnecter l'utilisateur
  // par surprise suite à son propre changement de mot de passe.
  const currentSessionPayload = await getSessionCookiePayload();
  if (currentSessionPayload?.sessionId) {
    const sessionId = currentSessionPayload.sessionId;
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      prisma.session.deleteMany({
        where: { userId, id: { not: sessionId } },
      }),
    ]);
  } else {
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  redirect("/settings?passwordChanged=1");
}
