"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { verifySession, requireActiveEstablishment } from "@/lib/dal";
import { getSessionCookiePayload } from "@/lib/session-token";
import { hashPassword, verifyPassword } from "@/lib/password";
import { SettingsSchema, ChangePasswordSchema, type SettingsFormState, type ChangePasswordFormState } from "@/lib/definitions";
import { readImageUploadFromFormData } from "@/lib/image-upload";
import { uploadImageObject, deleteImageObject } from "@/lib/object-storage";
import { getS3Client, getBucketName } from "@/lib/s3-client";

const LOGO_KEY_PREFIX = "logos";

/**
 * Bloc 4/5/16 — server-validated, upserted against the establishment's own
 * `Settings` row. Phase 3F / Lot D12-D — résolu par `establishmentId`
 * (jamais depuis le navigateur) plutôt que par l'ancien identifiant fixe
 * `SETTINGS_ID`.
 *
 * D12-P171 — gestion du logo (Bucket S3) réintégrée (retirée temporairement
 * en D12-P162 pour isoler le correctif multi-tenant du build Railway, sans
 * jamais supprimer le code S3 lui-même).
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

  // Lot "Téléversement durable des images" — `logoUrl` stocke désormais une
  // clé du Bucket Railway, jamais une URL collée. Le logo OFFICIEL SAMA HOME
  // (public/brand/, affiché plus haut sur cette page) reste distinct et non
  // modifiable depuis ce formulaire. `user.establishmentId` transmis pour
  // que chaque nouveau logo reçoive une clé tenant-aware
  // (logos/<establishmentId>/<uuid>.ext).
  const upload = await readImageUploadFromFormData(formData, "logo", LOGO_KEY_PREFIX, user.establishmentId);
  if (upload && "error" in upload) {
    return { errors: { logoUrl: [upload.error] } };
  }
  const removeLogo = formData.get("removeLogo") === "on";

  // `updatedAt` lu ici et revérifié ci-dessous (verrou optimiste —
  // correction M1, audit "Téléversement durable des images").
  const existing = await prisma.settings.findUnique({
    where: { establishmentId: user.establishmentId },
    select: { logoUrl: true, updatedAt: true },
  });

  let nextLogoUrl = existing?.logoUrl ?? null; // par défaut : inchangé
  if (upload) {
    try {
      await uploadImageObject(getS3Client(), getBucketName(), upload.key, upload.bytes, upload.contentType);
    } catch (error) {
      console.error("updateSettings() — échec du téléversement du logo :", error);
      // L'ancien logo et sa référence en base restent intacts.
      return { errors: { logoUrl: ["Échec de l'envoi du logo. L'ancien logo est conservé."] } };
    }
    nextLogoUrl = upload.key;
  } else if (removeLogo) {
    nextLogoUrl = null;
  }

  if (existing) {
    // `updateMany` (pas `upsert`/`update`) : seule méthode Prisma acceptant
    // un filtre supplémentaire (`updatedAt`) au-delà de la clé unique dans
    // son `where`. Si quelqu'un d'autre a modifié les paramètres entre
    // notre lecture ci-dessus et cette écriture, 0 ligne affectée.
    let result: { count: number };
    try {
      result = await prisma.settings.updateMany({
        where: { establishmentId: user.establishmentId, updatedAt: existing.updatedAt },
        data: { ...parsed.data, logoUrl: nextLogoUrl },
      });
    } catch (error) {
      console.error("updateSettings() — échec inattendu de l'enregistrement :", error);
      if (upload) await deleteImageObject(getS3Client(), getBucketName(), upload.key);
      return { message: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
    }
    if (result.count === 0) {
      // Modifiés par quelqu'un d'autre entre notre lecture et notre
      // écriture. Notre éventuel nouveau logo n'est référencé par aucune
      // ligne : orphelin, nettoyé immédiatement.
      if (upload) await deleteImageObject(getS3Client(), getBucketName(), upload.key);
      return {
        message: "Les paramètres ont été modifiés entre-temps par quelqu'un d'autre. Rechargez la page et réessayez.",
      };
    }
  } else {
    // Premier enregistrement des paramètres de CET établissement — `id`
    // généré normalement (`@default(cuid())`), jamais recopié d'un autre
    // établissement.
    try {
      await prisma.settings.create({
        data: { establishmentId: user.establishmentId, ...parsed.data, logoUrl: nextLogoUrl },
      });
    } catch (error) {
      // Phase 3G / Lot D12-P44 — collision de création concurrente :
      // `Settings_establishmentId_key` (migration 20261012000000).
      const isConcurrentCreation =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        typeof error.message === "string" &&
        error.message.includes("Settings_establishmentId_key");
      if (isConcurrentCreation) {
        if (upload) await deleteImageObject(getS3Client(), getBucketName(), upload.key);
        return {
          message: "Les paramètres ont été modifiés entre-temps par quelqu'un d'autre. Rechargez la page et réessayez.",
        };
      }
      console.error("updateSettings() — échec inattendu de la création des paramètres :", error);
      if (upload) await deleteImageObject(getS3Client(), getBucketName(), upload.key);
      return { message: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
    }
  }

  // Suppression de l'ANCIEN logo seulement APRÈS confirmation que NOTRE
  // écriture a réellement été appliquée — jamais avant, jamais en cas de
  // conflit (traité ci-dessus).
  if (existing?.logoUrl && existing.logoUrl !== nextLogoUrl) {
    await deleteImageObject(getS3Client(), getBucketName(), existing.logoUrl);
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
