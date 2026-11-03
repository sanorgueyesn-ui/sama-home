"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/dal";
import { hashPassword } from "@/lib/password";
import { getSessionCookiePayload } from "@/lib/session-token";
import { hasPlatformCapability } from "@/lib/permissions";
import { canGrant, isFullPlatformAccess, parseCapabilitySelection, roleLabel } from "@/lib/platform-access";
import { PricingSettingsSchema, type PricingSettingsFormState } from "@/lib/definitions";
import { DEFAULT_TRIAL_DURATION_MONTHS, DEFAULT_PERIOD_MONTHS, DEFAULT_PERIOD_PRICE_FCFA } from "@/lib/subscription-data";
import { getT } from "@/lib/i18n/server";

/**
 * Phase 3G / Lot D12-P88 — bascule du mode d'approbation automatique des
 * inscriptions. Autorisation stricte via `requirePlatformAdmin()` — seul un
 * administrateur de PLATEFORME peut modifier ce réglage, jamais un
 * `role === "ADMIN"` d'établissement. Le seul paramètre reçu du client est
 * `enabled` (un booléen) — aucune autre valeur d'autorité (identité de
 * l'auteur, horodatage) n'est jamais acceptée depuis l'appelant.
 *
 * Écriture inutile évitée : si la valeur demandée est déjà la valeur
 * actuelle, rien n'est écrit ni journalisé — lu et comparé à l'intérieur de
 * la même transaction que l'écriture éventuelle, jamais une lecture mise en
 * cache séparément.
 *
 * Traçabilité : `AuditLog` avec l'identité RÉELLE de l'administrateur de
 * plateforme qui bascule le réglage (jamais `null` ici — contrairement à
 * `ESTABLISHMENT_AUTO_APPROVED`, cette action est toujours déclenchée par un
 * humain authentifié réel).
 *
 * Basculer ce réglage ne modifie JAMAIS un établissement déjà existant —
 * cette fonction n'écrit que `PlatformSettings`, jamais `Establishment` ni
 * `Subscription`.
 */
export async function setAutoApprovalEnabled(enabled: boolean): Promise<{ error?: string }> {
  const t = await getT();
  const user = await requirePlatformAdmin();
  if (!hasPlatformCapability(user, "SETTINGS_EDIT")) {
    return { error: t("Action refusée : vous n'avez pas l'autorisation de modifier les réglages de la plateforme.") };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.platformSettings.findUnique({ where: { id: "singleton" } });
      const currentValue = existing?.autoApproveEstablishments ?? false;

      if (currentValue === enabled) {
        // Valeur inchangée — aucune écriture, aucun journal, par conception.
        return;
      }

      await tx.platformSettings.upsert({
        where: { id: "singleton" },
        create: { id: "singleton", autoApproveEstablishments: enabled },
        update: { autoApproveEstablishments: enabled },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: enabled ? "PLATFORM_AUTO_APPROVAL_ENABLED" : "PLATFORM_AUTO_APPROVAL_DISABLED",
          entityType: "PlatformSettings",
          entityId: "singleton",
          reason: null,
          oldValue: { autoApproveEstablishments: currentValue },
          newValue: { autoApproveEstablishments: enabled },
          establishmentId: null,
        },
      });
    });
  } catch (error) {
    console.error("setAutoApprovalEnabled() — échec inattendu de la mise à jour du réglage :", error);
    return { error: t("Une erreur est survenue pendant la mise à jour du réglage. Veuillez réessayer.") };
  }

  return {};
}

/**
 * Phase 3G / Lot D12-P103 — modification des réglages tarifaires globaux
 * (`PricingSettings`), SÉPARÉE de setAutoApprovalEnabled() ci-dessus (deux
 * tables distinctes, jamais mélangées — voir le commentaire de
 * getPricingSettings(), src/lib/platform-settings-data.ts). Autorisation
 * stricte via `requirePlatformAdmin()`, dès la première ligne exécutable.
 *
 * Validation côté serveur avec `PricingSettingsSchema` (bornes retenues pour
 * ce lot : 1-12 mois, 500-1 000 000 FCFA) — jamais uniquement la validation
 * côté interface, qui reste un confort, jamais l'autorité.
 *
 * Écriture inutile évitée : si une ligne existe déjà et que les 3 valeurs demandées
 * lui sont STRICTEMENT identiques, rien n'est écrit ni journalisé — sans ligne en
 * base, la première sauvegarde crée toujours la ligne, même avec les valeurs par
 * défaut (audit avec `reason` explicite, Lot 3A) — lu et
 * comparé à l'intérieur de la même transaction que l'écriture éventuelle,
 * même principe que setAutoApprovalEnabled().
 *
 * Traçabilité : `AuditLog` avec l'identité RÉELLE de l'administrateur de
 * plateforme qui modifie le tarif — JAMAIS `userId: null` ici (contrairement
 * à `ESTABLISHMENT_AUTO_APPROVED`) : cette action est toujours déclenchée
 * par un humain authentifié réel, jamais par le système lui-même.
 *
 * Ne modifie JAMAIS un `Subscription` ou un `SubscriptionPayment` déjà
 * créé — cette fonction n'écrit que `PricingSettings` ; voir l'audit D12-P102
 * confirmant que `createSubscriptionPaymentRequest()`/
 * `createTrialSubscriptionAndAudit()` gèlent déjà leurs valeurs au moment de
 * leur propre création, sans jamais relire `PricingSettings` après coup.
 */
export async function setPricingSettings(
  _prevState: PricingSettingsFormState,
  formData: FormData,
): Promise<PricingSettingsFormState> {
  const t = await getT();
  const user = await requirePlatformAdmin();
  if (!hasPlatformCapability(user, "SETTINGS_EDIT")) {
    return { message: t("Action refusée : vous n'avez pas l'autorisation de modifier les réglages tarifaires.") };
  }

  const parsed = PricingSettingsSchema.safeParse({
    trialDurationMonths: Number(formData.get("trialDurationMonths")),
    periodMonths: Number(formData.get("periodMonths")),
    periodPriceFcfa: Number(formData.get("periodPriceFcfa")),
  });
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const { trialDurationMonths, periodMonths, periodPriceFcfa } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.pricingSettings.findUnique({ where: { id: "singleton" } });
      const currentValue = {
        trialDurationMonths: existing?.trialDurationMonths ?? DEFAULT_TRIAL_DURATION_MONTHS,
        periodMonths: existing?.periodMonths ?? DEFAULT_PERIOD_MONTHS,
        periodPriceFcfa: existing?.periodPriceFcfa ?? DEFAULT_PERIOD_PRICE_FCFA,
      };

      const sameAsCurrent =
        currentValue.trialDurationMonths === trialDurationMonths &&
        currentValue.periodMonths === periodMonths &&
        currentValue.periodPriceFcfa === periodPriceFcfa;

      // Valeurs identiques à une ligne DÉJÀ enregistrée — aucune écriture, aucun journal.
      // Sans ligne en base, `currentValue` n'est que le repli du système : la première
      // sauvegarde crée la ligne même si les valeurs soumises sont les valeurs par défaut.
      if (existing && sameAsCurrent) {
        return;
      }
      const defaultsSavedExplicitly = !existing && sameAsCurrent;

      await tx.pricingSettings.upsert({
        where: { id: "singleton" },
        create: { id: "singleton", trialDurationMonths, periodMonths, periodPriceFcfa },
        update: { trialDurationMonths, periodMonths, periodPriceFcfa },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "PRICING_SETTINGS_UPDATED",
          entityType: "PricingSettings",
          entityId: "singleton",
          reason: defaultsSavedExplicitly ? "Valeurs par défaut enregistrées explicitement" : null,
          oldValue: currentValue,
          newValue: { trialDurationMonths, periodMonths, periodPriceFcfa },
          establishmentId: null,
        },
      });
    });
  } catch (error) {
    console.error("setPricingSettings() — échec inattendu de la mise à jour des réglages tarifaires :", error);
    return { message: t("Une erreur est survenue pendant la mise à jour des réglages. Veuillez réessayer.") };
  }

  revalidatePath("/register");
  revalidatePath("/plateforme/parametres");

  return { success: true };
}

export async function updateAdminPassword(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const t = await getT();
  const user = await requirePlatformAdmin();
  const newPassword = formData.get("newPassword")?.toString()?.trim();
  const confirmPassword = formData.get("confirmPassword")?.toString()?.trim();

  if (!newPassword || newPassword.length < 8) {
    return { error: t("Le mot de passe doit comporter au moins 8 caractères.") };
  }
  if (newPassword !== confirmPassword) {
    return { error: t("Les deux mots de passe ne correspondent pas.") };
  }

  try {
    const passwordHash = await hashPassword(newPassword);
    const sessionPayload = await getSessionCookiePayload();

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      // Invalider toutes les autres sessions de cet admin pour protéger le compte
      if (sessionPayload?.sessionId) {
        await tx.session.deleteMany({
          where: { userId: user.id, id: { not: sessionPayload.sessionId } },
        });
      }
    });

    revalidatePath("/plateforme/parametres");
    return { success: true };
  } catch (error) {
    console.error("updateAdminPassword() error:", error);
    return { error: t("Une erreur est survenue lors de la mise à jour du mot de passe.") };
  }
}

export async function createPlatformAdminUser(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const t = await getT();
  const admin = await requirePlatformAdmin();

  if (!hasPlatformCapability(admin, "USERS_MANAGE")) {
    return { error: t("Action refusée : vous n'avez pas l'autorisation de créer des utilisateurs sur la plateforme.") };
  }

  const name = formData.get("name")?.toString()?.trim();
  const username = formData.get("username")?.toString()?.trim().toLowerCase();
  const email = formData.get("email")?.toString()?.trim().toLowerCase();
  const password = formData.get("password")?.toString()?.trim();
  const confirmPassword = formData.get("confirmPassword")?.toString()?.trim();
  const permissionsMode = formData.get("permissionsMode")?.toString(); // "ALL" ou "CUSTOM"

  if (!name || name.length < 2) {
    return { error: t("Veuillez renseigner un nom complet valide (2 caractères min).") };
  }
  if (!username || username.length < 3) {
    return { error: t("L'identifiant de connexion doit comporter au moins 3 caractères.") };
  }
  if (!password || password.length < 8) {
    return { error: t("Le mot de passe doit comporter au moins 8 caractères.") };
  }
  if (password !== confirmPassword) {
    return { error: t("Les deux mots de passe ne correspondent pas.") };
  }

  // Droits : validés (aucun droit inconnu) et jamais supérieurs aux siens (anti-escalade).
  const selection = parseCapabilitySelection(permissionsMode, formData.getAll("permissions").map(String));
  if (!selection.ok) return { error: t(selection.error) };
  if (!canGrant(admin.permissions, selection.stored)) {
    return { error: t("Action refusée : vous ne pouvez accorder que des droits que vous possédez vous-même.") };
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ username }, ...(email ? [{ email }] : [])],
    },
  });
  if (existing) {
    return { error: `Un compte existe déjà avec cet identifiant ou cet email (${username}).` };
  }

  const permissionsJson = selection.stored;

  try {
    const passwordHash = await hashPassword(password);
    await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          username,
          email: email || null,
          passwordHash,
          isPlatformAdmin: true,
          role: "ADMIN",
          permissions: permissionsJson,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: "PLATFORM_ADMIN_CREATED",
          entityType: "User",
          entityId: newUser.id,
          reason: `Création du compte administrateur plateforme ${username} par ${admin.name} (rôle : ${roleLabel(permissionsJson)})`,
          newValue: { role: roleLabel(permissionsJson), permissions: permissionsJson },
          establishmentId: null,
        },
      });
    });

    revalidatePath("/plateforme/utilisateurs");
    return { success: true };
  } catch (error) {
    console.error("createPlatformAdminUser() error:", error);
    return { error: t("Une erreur est survenue lors de la création du compte administrateur.") };
  }
}

export async function updatePlatformUserPermissions(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const t = await getT();
  const admin = await requirePlatformAdmin();

  if (!hasPlatformCapability(admin, "USERS_MANAGE")) {
    return { error: t("Action refusée : vous n'avez pas l'autorisation de modifier les accès.") };
  }

  const userId = formData.get("userId")?.toString()?.trim();
  if (!userId) {
    return { error: t("Identifiant utilisateur manquant.") };
  }

  // Anti-escalade : impossible de modifier ses propres droits.
  if (userId === admin.id) {
    return { error: t("Action refusée : vous ne pouvez pas modifier vos propres permissions.") };
  }

  const selection = parseCapabilitySelection(
    formData.get("permissionsMode")?.toString(),
    formData.getAll("permissions").map(String),
  );
  if (!selection.ok) return { error: t(selection.error) };

  // Anti-escalade : on ne peut accorder que des droits que l'on possède soi-même.
  if (!canGrant(admin.permissions, selection.stored)) {
    return { error: t("Action refusée : vous ne pouvez accorder que des droits que vous possédez vous-même.") };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, isPlatformAdmin: true, permissions: true },
  });

  if (!targetUser || !targetUser.isPlatformAdmin) {
    return { error: t("Cet utilisateur n'est pas un compte de plateforme.") };
  }

  // On ne modifie pas quelqu'un qui a plus de droits que soi (par exemple un super-administrateur).
  if (!canGrant(admin.permissions, targetUser.permissions)) {
    return { error: t("Action refusée : cet administrateur a des droits que vous ne possédez pas.") };
  }

  // Protection du dernier super-administrateur : il en faut toujours au moins un.
  if (isFullPlatformAccess(targetUser.permissions) && !isFullPlatformAccess(selection.stored)) {
    const admins = await prisma.user.findMany({
      where: { isPlatformAdmin: true },
      select: { id: true, permissions: true },
    });
    const otherSuperAdmins = admins.filter((a) => a.id !== userId && isFullPlatformAccess(a.permissions));
    if (otherSuperAdmins.length === 0) {
      return { error: t("Action refusée : il doit toujours rester au moins un super-administrateur.") };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { permissions: selection.stored },
      });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: "PLATFORM_PERMISSIONS_UPDATED",
          entityType: "User",
          entityId: userId,
          reason: `Droits de ${targetUser.username} modifiés par ${admin.name} : ${roleLabel(targetUser.permissions)} → ${roleLabel(selection.stored)}`,
          oldValue: { role: roleLabel(targetUser.permissions), permissions: targetUser.permissions },
          newValue: { role: roleLabel(selection.stored), permissions: selection.stored },
          establishmentId: null,
        },
      });
    });

    revalidatePath("/plateforme/utilisateurs");
    return { success: true };
  } catch (error) {
    console.error("updatePlatformUserPermissions() error:", error);
    return { error: t("Une erreur est survenue lors de la mise à jour des accès.") };
  }
}
