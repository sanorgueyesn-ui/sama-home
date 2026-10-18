"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireActiveEstablishment } from "@/lib/dal";
import { hashPassword } from "@/lib/password";
import {
  CreateUserSchema,
  UpdateUserSchema,
  ResetPasswordSchema,
  type CreateUserFormState,
  type UpdateUserFormState,
  type ResetPasswordFormState,
} from "@/lib/definitions";

/**
 * Bloc 9/11 — every function here re-checks ADMIN server-side via
 * requireAdmin(), independently of whatever the UI shows or hides. A
 * GESTIONNAIRE calling one of these directly (e.g. by replaying a request)
 * is redirected home exactly like an unauthenticated user is redirected to
 * /login — never a silent no-op, never trusted client-side gating alone.
 */

class UserActionError extends Error {}

const LAST_ADMIN_MESSAGE =
  "Impossible de rétrograder ce compte : c'est le dernier administrateur du système. Promouvez d'abord un autre utilisateur en administrateur.";

export async function createUser(
  _prevState: CreateUserFormState,
  formData: FormData,
): Promise<CreateUserFormState> {
  // Phase 3G / Lot D12-P110 — faille confirmée en D12-P109 : ajouter un
  // nouveau compte d'équipe est une action métier d'expansion, gardée comme
  // toute autre création — contrairement à resetUserPassword() ci-dessous
  // (réponse à incident de sécurité, jamais bloquée). Placée avant
  // requireAdmin() (conservé tel quel, redirection inchangée).
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { message: "Votre compte n'est rattaché à aucun établissement — impossible de créer un utilisateur." };
      case "INACTIVE":
        return { message: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { message: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { message: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const admin = await requireAdmin();
  // Phase 3B / Lot B — l'établissement du nouvel utilisateur est TOUJOURS
  // celui de l'administrateur qui le crée, résolu côté serveur depuis sa
  // propre session (jamais transmis par le formulaire, qui ne contient
  // d'ailleurs aucun champ de ce nom). Un administrateur de plateforme sans
  // établissement (isPlatformAdmin) ne peut pas créer implicitement un
  // utilisateur pour un établissement qu'il ne gère pas.
  if (!admin.establishmentId) {
    return { message: "Votre compte n'est rattaché à aucun établissement — impossible de créer un utilisateur." };
  }

  const parsed = CreateUserSchema.safeParse({
    username: formData.get("username"),
    name: formData.get("name"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { username, name, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return { errors: { username: ["Cet identifiant est déjà utilisé."] } };
  }

  const passwordHash = await hashPassword(password);
  try {
    await prisma.user.create({
      data: { username, name, passwordHash, role, establishmentId: admin.establishmentId },
    });
  } catch (error) {
    console.error("createUser() — échec inattendu de la création de l'utilisateur :", error);
    return { message: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
  }

  revalidatePath("/settings/users");
  redirect("/settings/users?created=1");
}

export async function updateUser(
  id: string,
  _prevState: UpdateUserFormState,
  formData: FormData,
): Promise<UpdateUserFormState> {
  // Phase 3D / Lot D2 — l'établissement de l'ADMIN appelant est résolu ici,
  // avant toute lecture ou écriture métier, et sert de filtre pour tout le
  // reste de la fonction. Jamais transmis par le formulaire (aucun champ de
  // ce nom n'est lu). `isPlatformAdmin` n'intervient pas : requireAdmin() ne
  // vérifie que le rôle métier `role === "ADMIN"`.
  // Phase 3G / Lot D12-P110 — faille confirmée en D12-P109, même correction
  // que createUser() ci-dessus.
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { message: "Votre compte n'est rattaché à aucun établissement — impossible de modifier un utilisateur." };
      case "INACTIVE":
        return { message: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { message: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { message: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const admin = await requireAdmin();
  if (!admin.establishmentId) {
    return { message: "Votre compte n'est rattaché à aucun établissement — impossible de modifier un utilisateur." };
  }

  // Un utilisateur d'un autre établissement doit être indistinguable d'un
  // id inexistant — même message, même chemin de code, aucune confirmation
  // de l'existence d'un compte extérieur.
  const existing = await prisma.user.findFirst({ where: { id, establishmentId: admin.establishmentId } });
  if (!existing) {
    return { message: "Utilisateur introuvable." };
  }

  const parsed = UpdateUserSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  // Correction ciblée (audit indépendant Phase 11) : le système doit
  // toujours conserver au moins un ADMIN. Vérifié ici, côté serveur, dans
  // une transaction Serializable (même idiome que findAvailabilityConflict/
  // les encaissements — un COUNT lu puis agi dessus est exactement le genre
  // de vérification qu'une écriture concurrente peut invalider entre la
  // lecture et l'écriture, voir les tests de concurrence du rapport de
  // correction). S'applique à toute rétrogradation ADMIN -> GESTIONNAIRE,
  // que la cible soit l'admin connecté ou un autre — pas seulement
  // l'auto-rétrogradation, puisque l'invariant réel ("au moins un ADMIN")
  // est le même dans les deux cas.
  // Phase 3D / Lot D2 — ce comptage est désormais explicitement limité à
  // `admin.establishmentId` : l'invariant réel est "au moins un ADMIN PAR
  // ÉTABLISSEMENT", jamais un ADMIN quelque part dans le système tout
  // entier (sans ce filtre, rétrograder le dernier ADMIN d'un établissement
  // réussirait à tort tant qu'un autre établissement a son propre ADMIN).
  const isDemotingFromAdmin = existing.role === "ADMIN" && parsed.data.role !== "ADMIN";
  try {
    await prisma.$transaction(
      async (tx) => {
        if (isDemotingFromAdmin) {
          const otherAdmins = await tx.user.count({
            where: { role: "ADMIN", id: { not: id }, establishmentId: admin.establishmentId },
          });
          if (otherAdmins === 0) {
            throw new UserActionError(LAST_ADMIN_MESSAGE);
          }
        }
        // Phase 3D / Lot D2 — `updateMany` (pas `update`) : seule méthode
        // Prisma acceptant un filtre supplémentaire (`establishmentId`) au-
        // delà de la clé unique dans son `where`. `count !== 1` couvre à la
        // fois l'id disparu entre la lecture et l'écriture ET, en défense en
        // profondeur, un établissement qui ne correspondrait plus — jamais
        // modifier le compte cible si son établissement ne correspond pas.
        const result = await tx.user.updateMany({
          where: { id, establishmentId: admin.establishmentId },
          data: parsed.data,
        });
        if (result.count !== 1) {
          throw new UserActionError("Utilisateur introuvable.");
        }
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof UserActionError) {
      return { message: error.message };
    }
    console.error(`updateUser(${id}) — échec inattendu de la mise à jour :`, error);
    return {
      message: isDemotingFromAdmin
        ? "Le statut administrateur vient peut-être de changer à l'instant. Veuillez vérifier et réessayer."
        : "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer.",
    };
  }

  revalidatePath("/settings/users");
  redirect("/settings/users?updated=1");
}

/** Bloc 9 — admin sets a new password directly; the old one is never needed (that's the point of a reset, unlike Bloc 10's self-service flow). */
export async function resetUserPassword(
  id: string,
  _prevState: ResetPasswordFormState,
  formData: FormData,
): Promise<ResetPasswordFormState> {
  // Phase 3G / Lot D12-P110 — décision explicite prise en D12-P109/P110 :
  // volontairement JAMAIS gardée par requireActiveEstablishment() — c'est une
  // réponse à incident de sécurité (compte compromis, employé licencié), même
  // principe que changePassword() (settings.ts) : un établissement suspendu
  // doit rester capable de neutraliser immédiatement un compte problématique,
  // jamais empêché de le faire par son propre statut.
  const admin = await requireAdmin();
  if (!admin.establishmentId) {
    return { message: "Votre compte n'est rattaché à aucun établissement — impossible de réinitialiser ce mot de passe." };
  }

  const existing = await prisma.user.findFirst({ where: { id, establishmentId: admin.establishmentId } });
  if (!existing) {
    return { message: "Utilisateur introuvable." };
  }

  const parsed = ResetPasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  // Phase 3G / Lot D12-P27 — faille confirmée en D12-P26 : une réinitialisation
  // ne révoquait jusqu'ici aucune session existante de l'utilisateur ciblé
  // (sessions valables jusqu'à 30 jours, "se souvenir de moi" — voir
  // src/lib/session.ts), contournant silencieusement l'objectif de sécurité
  // d'une réinitialisation (compte compromis, employé licencié). Transaction
  // interactive (pas la forme en tableau) : seule forme permettant de
  // vérifier `count` avant de décider de supprimer les sessions — jamais une
  // suppression si l'écriture du mot de passe n'a pas réellement eu lieu.
  // Phase 3D / Lot D2 — `updateMany` + vérification du `count` : le compte
  // cible n'est jamais modifié si son établissement ne correspond plus
  // (défense en profondeur au-delà de la vérification déjà faite ci-dessus).
  try {
    await prisma.$transaction(async (tx) => {
      const result = await tx.user.updateMany({
        where: { id, establishmentId: admin.establishmentId },
        data: { passwordHash },
      });
      if (result.count !== 1) {
        throw new UserActionError("Utilisateur introuvable.");
      }
      // Révoque uniquement les sessions de l'utilisateur ciblé — jamais
      // celle de l'administrateur appelant, qui n'est pas la cible de cette
      // action.
      await tx.session.deleteMany({ where: { userId: id } });
    });
  } catch (error) {
    if (error instanceof UserActionError) {
      return { message: error.message };
    }
    console.error(`resetUserPassword(${id}) — échec inattendu de la réinitialisation :`, error);
    return { message: "Une erreur est survenue pendant la réinitialisation. Veuillez réessayer." };
  }

  revalidatePath("/settings/users");
  redirect(`/settings/users?passwordReset=1`);
}
