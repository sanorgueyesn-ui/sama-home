"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifySession } from "@/lib/dal";
import { checkRateLimit } from "@/lib/rate-limit";
import { createTrialSubscriptionAndAudit } from "@/lib/establishment-activation";
import { canCreateSpace, parseSpaceCreation } from "@/lib/space-creation";
import { getT } from "@/lib/i18n/server";

export type CreateSpaceState =
  | {
      message?: string;
      errors?: { name?: string[]; businessMode?: string[] };
      /** Espace créé mais en attente d'approbation par la plateforme (modération manuelle). */
      pendingName?: string;
    }
  | undefined;

class SpaceCreationError extends Error {}

/**
 * Changement d'espace actif (sélecteur du menu du compte et page /espaces).
 *
 * L'identifiant d'espace vient d'un formulaire, donc du navigateur : ce n'est qu'un CANDIDAT.
 * Il n'est retenu que si le compte de la SESSION y a une appartenance ET que l'espace est actif ;
 * sinon rien n'est écrit, et la réponse est la même (aucune indication sur l'existence d'un
 * espace étranger). L'écriture cible UNIQUEMENT la session courante (`id` + `userId`).
 *
 * Après l'écriture, aucun appel au DAL : `getCurrentUser()` est mémoïsé pour la requête et
 * rendrait l'ANCIEN espace. On redirige simplement ; la requête suivante relit tout.
 */
export async function switchSpace(formData: FormData): Promise<void> {
  const { userId, sessionId } = await verifySession();
  const candidate = formData.get("establishmentId");

  if (sessionId && typeof candidate === "string" && candidate !== "") {
    const membership = await prisma.membership.findUnique({
      where: { userId_establishmentId: { userId, establishmentId: candidate } },
      select: { establishment: { select: { status: true } } },
    });
    if (membership?.establishment.status === "ACTIVE") {
      await prisma.session.updateMany({
        where: { id: sessionId, userId },
        data: { activeEstablishmentId: candidate },
      });
    }
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Création d'un espace professionnel supplémentaire pour le compte connecté (lot D).
 *
 * Droits et plafond : `canCreateSpace`, avec le rôle de l'espace ACTIF de la session et le nombre
 * d'appartenances relu en base DANS la transaction. Rien du compte ni de l'espace courant ne vient
 * du formulaire : seuls le nom et le type d'activité (liste blanche) en viennent. Le nouvel espace
 * a son propre abonnement ; il suit la modération de la plateforme comme l'inscription (PENDING
 * ou ACTIVE avec essai). Les données de l'espace actuel ne sont ni copiées ni modifiées.
 */
export async function createSpace(_previous: CreateSpaceState, formData: FormData): Promise<CreateSpaceState> {
  const t = await getT();
  const { sessionId } = await verifySession();
  const user = await getCurrentUser();

  const parsed = parseSpaceCreation({ name: formData.get("name"), businessMode: formData.get("businessMode") });
  if (!parsed.ok) return { errors: { [parsed.field]: [parsed.message] } };

  const rate = checkRateLimit(`create-space:${user.id}`, 5, 3600);
  if (!rate.allowed) return { message: t("Trop de tentatives. Réessayez plus tard.") };

  let created: { id: string; active: boolean };
  try {
    created = await prisma.$transaction(async (tx) => {
      const spaceCount = await tx.membership.count({ where: { userId: user.id } });
      const check = canCreateSpace({ isPlatformAdmin: user.isPlatformAdmin, role: user.role, currentSpaceCount: spaceCount });
      if (!check.allowed) throw new SpaceCreationError(check.message);

      const platformSettings = await tx.platformSettings.findUnique({ where: { id: "singleton" } });
      const autoApprove = platformSettings?.autoApproveEstablishments ?? false;

      const establishment = await tx.establishment.create({
        data: { name: parsed.name, businessMode: parsed.businessMode, status: autoApprove ? "ACTIVE" : "PENDING" },
        select: { id: true },
      });
      await tx.membership.create({
        data: { userId: user.id, establishmentId: establishment.id, role: "ADMIN" },
      });

      if (autoApprove) {
        await createTrialSubscriptionAndAudit(tx, establishment.id, user.id, "ESTABLISHMENT_AUTO_APPROVED");
      } else {
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "ESTABLISHMENT_REGISTERED",
            entityType: "Establishment",
            entityId: establishment.id,
            newValue: { name: parsed.name, status: "PENDING", businessMode: parsed.businessMode, additionalSpace: true },
            establishmentId: establishment.id,
          },
        });
      }
      return { id: establishment.id, active: autoApprove };
    });
  } catch (error) {
    if (error instanceof SpaceCreationError) return { message: error.message };
    console.error("createSpace() — échec inattendu :", error);
    return { message: t("Une erreur est survenue. Veuillez réessayer.") };
  }

  if (!created.active) return { pendingName: parsed.name };

  // Espace actif d'emblée : on y bascule (écriture limitée à la session courante).
  if (sessionId) {
    await prisma.session.updateMany({
      where: { id: sessionId, userId: user.id },
      data: { activeEstablishmentId: created.id },
    });
  }
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
