"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";
import { SESSION_IDLE_OPTIONS_MINUTES } from "@/lib/session-policy";
import { getT } from "@/lib/i18n/server";

export type SessionIdleState = { error?: string; ok?: boolean } | undefined;

/**
 * Règle le délai de déconnexion automatique de l'établissement (ADMIN uniquement). L'établissement vient de
 * la session ; la valeur est revalidée contre la liste autorisée (jamais un nombre libre). N'écrit que sur la
 * ligne de paramètres existante. S'applique dès la prochaine requête de chaque compte de l'établissement.
 */
export async function updateSessionIdleMinutes(_prev: SessionIdleState, formData: FormData): Promise<SessionIdleState> {
  const t = await getT();
  const user = await requireAdmin();
  if (!user.establishmentId) return { error: t("Votre compte n'est rattaché à aucun établissement.") };

  const minutes = Number(formData.get("minutes"));
  if (!(SESSION_IDLE_OPTIONS_MINUTES as readonly number[]).includes(minutes)) {
    return { error: t("Délai non valide.") };
  }

  const result = await prisma.settings.updateMany({ where: { establishmentId: user.establishmentId }, data: { sessionIdleMinutes: minutes } });
  if (result.count === 0) return { error: t("Renseignez d'abord les informations de l'établissement (Paramètres).") };

  revalidatePath("/settings/etablissement");
  return { ok: true };
}
