"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireActiveEstablishment } from "@/lib/dal";
import { PropertySchema, type PropertyFormState } from "@/lib/definitions";
import { readImageUploadFromFormData } from "@/lib/image-upload";
import { uploadImageObject, deleteImageObject } from "@/lib/object-storage";
import { getS3Client, getBucketName } from "@/lib/s3-client";

const PHOTO_KEY_PREFIX = "logements";

function parsePropertyForm(formData: FormData, active: boolean) {
  return PropertySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    description: formData.get("description"),
    capacity: formData.get("capacity"),
    active,
  });
}

// Phase 3D / Lot D11a — `establishmentId` requis et transmis par chaque
// appelant (jamais recalculé ici), pour que chaque nouvelle photo de
// logement reçoive une clé tenant-aware (logements/<establishmentId>/<uuid>.
// ext). Changement additif côté image-upload.ts — n'affecte ni les clés déjà
// enregistrées, ni le flux des logos (settings.ts, non touché).
function readPhotoUpload(formData: FormData, establishmentId: string) {
  return readImageUploadFromFormData(formData, "photo", PHOTO_KEY_PREFIX, establishmentId);
}

export async function createProperty(
  _prevState: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  // Phase 3G / Lot D12-P110 — faille confirmée en D12-P109 : createProperty()
  // n'était gardée que par getCurrentUser(), jamais par
  // requireActiveEstablishment(), contrairement à updateProperty()/
  // toggleActive() dans ce même fichier — un établissement PENDING/SUSPENDED
  // ou à l'abonnement expiré pouvait donc créer de nouveaux logements. Même
  // emplacement et mêmes messages que les fonctions voisines déjà gardées
  // (D12-O5), jamais reformulés.
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { message: "Votre compte n'est rattaché à aucun établissement — impossible de créer un logement." };
      case "INACTIVE":
        return { message: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { message: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { message: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const { user } = access;
  // Narrowing explicite requis par le compilateur — même raison et même
  // style que dans updateProperty() ci-dessous : `establishmentId` reste
  // typé `string | null` ici bien que requireActiveEstablishment() garantisse
  // déjà cette valeur non nulle en pratique pour atteindre cette ligne
  // (NO_ESTABLISHMENT exclu ci-dessus). Message repris à l'identique de la
  // branche NO_ESTABLISHMENT ci-dessus.
  if (!user.establishmentId) {
    return { message: "Votre compte n'est rattaché à aucun établissement — impossible de créer un logement." };
  }

  // New listings always start active — there's no reason to ask, and no
  // "active" control is rendered on the create form.
  const parsed = parsePropertyForm(formData, true);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const upload = await readPhotoUpload(formData, user.establishmentId);
  if (upload && "error" in upload) {
    return { errors: { photo: [upload.error] } };
  }

  // Envoi dans le bucket AVANT toute écriture en base : si l'envoi échoue,
  // rien n'est créé (exigence explicite — jamais enregistrer une référence
  // vers un objet qui n'a pas réellement été envoyé).
  if (upload) {
    try {
      await uploadImageObject(getS3Client(), getBucketName(), upload.key, upload.bytes, upload.contentType);
    } catch (error) {
      console.error("createProperty() — échec du téléversement de la photo :", error);
      return { errors: { photo: ["Échec de l'envoi de la photo. Veuillez réessayer."] } };
    }
  }

  let propertyId: string;
  try {
    const property = await prisma.property.create({
      data: { ...parsed.data, photo: upload ? upload.key : null, establishmentId: user.establishmentId },
    });
    propertyId = property.id;
  } catch (error) {
    console.error("createProperty() — échec inattendu de la création du logement :", error);
    // La photo a été envoyée mais la ligne n'a pas pu être créée : objet
    // orphelin nettoyé immédiatement plutôt que laissé sans référence.
    if (upload) await deleteImageObject(getS3Client(), getBucketName(), upload.key);
    return { message: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
  }

  revalidatePath("/logements");
  redirect(`/logements/${propertyId}?created=1`);
}

export async function updateProperty(
  id: string,
  _prevState: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  // Phase 3G / Lot D12-O5 — requireActiveEstablishment() placé en tout
  // premier, avant le parsing du formulaire, la lecture du fichier image,
  // tout upload S3 et toute écriture Prisma : un établissement inactif/sans
  // abonnement/expiré ne doit jamais déclencher le moindre traitement
  // d'image ni la moindre écriture avant d'être refusé. Remplace l'ancien
  // contrôle `!user.establishmentId` seul : couvre désormais aussi le
  // statut de l'établissement et celui de l'abonnement, strictement séparés
  // (voir dal.ts).
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { message: "Votre compte n'est rattaché à aucun établissement — impossible de modifier ce logement." };
      case "INACTIVE":
        return { message: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { message: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { message: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const { user } = access;
  // Narrowing explicite requis par le compilateur : le type de `user` ici
  // reste `establishmentId: string | null` (celui de getCurrentUser()), bien
  // que requireActiveEstablishment() garantisse déjà cette valeur non nulle
  // en pratique pour atteindre cette branche (NO_ESTABLISHMENT exclu
  // ci-dessus) — jamais un `!` non-null, jamais une valeur supposée sans
  // vérification (même principe que partout ailleurs dans ce fichier).
  if (!user.establishmentId) {
    return { message: "Votre compte n'est rattaché à aucun établissement — impossible de modifier ce logement." };
  }

  const parsed = parsePropertyForm(formData, formData.get("active") === "on");
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const upload = await readPhotoUpload(formData, user.establishmentId);
  if (upload && "error" in upload) {
    return { errors: { photo: [upload.error] } };
  }
  // Retrait volontaire — n'a d'effet que si aucun nouveau fichier n'a été
  // fourni (un nouveau fichier valide remplace toujours, sans ambiguïté).
  const removePhoto = formData.get("removePhoto") === "on";

  // `updatedAt` lu ici et revérifié dans le updateMany ci-dessous
  // (verrou optimiste — correction M1, audit "Téléversement durable des
  // images") : aucune migration nécessaire, ce champ existe déjà sur
  // `Property` (@updatedAt). Phase 3D / Lot D3 — `establishmentId` ajouté
  // au même `where` : un logement d'un autre établissement est désormais
  // indistinguable d'un id inexistant (même message, même chemin de code),
  // et surtout AUCUN envoi S3 n'est tenté avant cette vérification — l'image
  // d'un bien d'un autre établissement ne peut donc jamais être touchée.
  const existing = await prisma.property.findFirst({
    where: { id, establishmentId: user.establishmentId },
    select: { photo: true, updatedAt: true },
  });
  if (!existing) {
    return { message: "Logement introuvable." };
  }

  let nextPhoto = existing.photo; // par défaut : inchangé
  if (upload) {
    try {
      await uploadImageObject(getS3Client(), getBucketName(), upload.key, upload.bytes, upload.contentType);
    } catch (error) {
      console.error(`updateProperty(${id}) — échec du téléversement de la photo :`, error);
      // L'ancienne photo et sa référence en base restent intactes.
      return { errors: { photo: ["Échec de l'envoi de la photo. L'ancienne photo est conservée."] } };
    }
    nextPhoto = upload.key;
  } else if (removePhoto) {
    nextPhoto = null;
  }

  let result: { count: number };
  try {
    // `updateMany` (pas `update`) : seule méthode Prisma acceptant un filtre
    // supplémentaire (`updatedAt`) au-delà de la clé unique dans son `where`.
    // Si une autre requête a modifié ce logement entre notre lecture
    // ci-dessus et cette écriture, `updatedAt` ne correspond plus : 0 ligne
    // affectée, détecté explicitement ci-dessous — jamais un écrasement
    // silencieux de la modification concurrente.
    result = await prisma.property.updateMany({
      where: { id, updatedAt: existing.updatedAt, establishmentId: user.establishmentId },
      data: { ...parsed.data, photo: nextPhoto },
    });
  } catch (error) {
    console.error(`updateProperty(${id}) — échec inattendu de la mise à jour du logement :`, error);
    // La base n'a pas été mise à jour : le nouvel objet envoyé (s'il y en a
    // un) devient orphelin, nettoyé immédiatement.
    if (upload) await deleteImageObject(getS3Client(), getBucketName(), upload.key);
    return { message: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
  }

  if (result.count === 0) {
    // Modifié par quelqu'un d'autre entre notre lecture et notre écriture.
    // Notre éventuel nouvel objet téléversé n'est référencé par AUCUNE
    // ligne : orphelin, nettoyé immédiatement. L'ancienne photo n'est
    // JAMAIS supprimée ici — on ne sait plus quelle est la valeur actuelle,
    // celle-ci appartient désormais à la modification concurrente qui a
    // gagné la course.
    if (upload) await deleteImageObject(getS3Client(), getBucketName(), upload.key);
    return {
      message: "Ce logement a été modifié entre-temps par quelqu'un d'autre. Rechargez la page et réessayez.",
    };
  }

  // Suppression de l'ANCIENNE photo seulement APRÈS confirmation que NOTRE
  // écriture a réellement été appliquée (result.count === 1) — jamais avant
  // (exigence explicite du lot), et jamais en cas de conflit (ci-dessus).
  if (existing.photo && existing.photo !== nextPhoto) {
    await deleteImageObject(getS3Client(), getBucketName(), existing.photo);
  }

  revalidatePath("/logements");
  revalidatePath(`/logements/${id}`);
  redirect(`/logements/${id}?updated=1`);
}

export async function toggleActive(id: string, nextActive: boolean): Promise<{ error?: string }> {
  // Phase 3D / Lot D3 — même garde d'isolation multi-établissement que
  // updateProperty() ci-dessus : un id inexistant ou d'un autre établissement
  // suit le même chemin "introuvable" qu'un `update` qui ne trouve rien.
  //
  // Phase 3G / Lot D12-P52 — incohérence confirmée en D12-P50 : réactiver un
  // logement peut réexposer en une seule action TOUS ses tarifs déjà actifs à
  // de nouvelles réservations (effet strictement plus large qu'une
  // réactivation de tarif unique, déjà soumise au garde d'abonnement dans
  // toggleTariffActive()/D12-O9). Désactiver, à l'inverse, ne fait que
  // réduire ce risque et ne touche aucune réservation/location existante —
  // comme cancelReservation/cancelRental/deactivateBankAccount ailleurs dans
  // l'app, cette branche ne doit jamais être bloquée par le statut de
  // l'abonnement. Le garde ne s'applique donc qu'à `nextActive === true`.
  //
  // Phase 3G / Lot D12-P54 — jusqu'ici, un refus (garde d'abonnement ou
  // "introuvable") se terminait par un simple `return;` silencieux, car
  // l'appelant (ToggleActiveButton) ne lisait aucune valeur de retour.
  // Retour désormais `{ error?: string }` — même convention que
  // toggleTariffActive() (D12-O9/P53) — pour que l'appelant, mis à jour dans
  // ce même lot, puisse afficher la raison exacte d'un refus de
  // réactivation plutôt que de rester silencieux.
  let establishmentId: string;

  if (nextActive) {
    const access = await requireActiveEstablishment();
    if (!access.ok) {
      switch (access.reason) {
        case "NO_ESTABLISHMENT":
          return { error: "Votre compte n'est rattaché à aucun établissement — impossible de modifier ce logement." };
        case "INACTIVE":
          return { error: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
        case "NO_SUBSCRIPTION":
          return { error: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
        case "EXPIRED":
          return { error: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
      }
    }
    // Narrowing explicite requis par le compilateur — même raison et même
    // style qu'au-dessus dans updateProperty() : `establishmentId` reste
    // typé `string | null` ici bien que requireActiveEstablishment()
    // garantisse déjà cette valeur non nulle en pratique pour atteindre
    // cette ligne (NO_ESTABLISHMENT exclu ci-dessus). Message repris à
    // l'identique de la branche NO_ESTABLISHMENT ci-dessus.
    if (!access.user.establishmentId) {
      return { error: "Votre compte n'est rattaché à aucun établissement — impossible de modifier ce logement." };
    }
    establishmentId = access.user.establishmentId;
  } else {
    const user = await getCurrentUser();
    if (!user.establishmentId) {
      return { error: "Votre compte n'est rattaché à aucun établissement — impossible de modifier ce logement." };
    }
    establishmentId = user.establishmentId;
  }

  const result = await prisma.property.updateMany({
    where: { id, establishmentId },
    data: { active: nextActive },
  });
  if (result.count === 0) {
    // Message repris à l'identique de updateProperty() (`"Logement
    // introuvable."`) — jamais une formulation nouvelle.
    return { error: "Logement introuvable." };
  }

  revalidatePath("/logements");
  revalidatePath(`/logements/${id}`);
  return {};
}
