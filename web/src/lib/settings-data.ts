import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";

/**
 * Ancien identifiant fixe du singleton historique (voir le commentaire sur
 * `model Settings` dans schema.prisma) — conservé UNIQUEMENT pour les
 * consommateurs non encore migrés vers `establishmentId`
 * (`src/app/layout.tsx`, `src/lib/contract-data.ts` — hors périmètre du Lot
 * D12-D, prévus pour des lots distincts). `getSettings()` ci-dessous ne
 * l'utilise plus.
 */
export const SETTINGS_ID = "singleton";

/**
 * Phase 3F / Lot D12-D — `establishmentId` désormais obligatoire sur
 * `Settings` (migration Lot D12-C). Résout l'établissement exclusivement
 * depuis `getCurrentUser()`, jamais depuis une donnée transmise par le
 * navigateur. Un utilisateur sans établissement reçoit `null` — jamais les
 * paramètres d'un autre établissement, jamais une valeur inventée. Un
 * établissement qui n'a pas encore enregistré ses paramètres reçoit
 * également `null` (comportement de repli déjà géré par tous les
 * appelants existants : `DEFAULT_BRAND_COLORS`, "notre établissement",
 * logo absent).
 */
export async function getSettings() {
  const user = await getCurrentUser();
  if (!user.establishmentId) {
    return null;
  }
  return prisma.settings.findUnique({ where: { establishmentId: user.establishmentId } });
}
