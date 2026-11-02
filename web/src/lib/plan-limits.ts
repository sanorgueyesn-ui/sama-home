// Plafonds de la formule d'abonnement (chambres/biens, utilisateurs). Seules les NOUVELLES créations
// sont bloquées : les données existantes ne sont jamais supprimées ni désactivées (promesse de la page
// tarifs). Un établissement sans formule choisie (essai, abonnement historique) n'a aucun plafond.
import "server-only";
import { prisma } from "@/lib/prisma";
import { isOverCap, planCaps } from "@/lib/subscription-plans";

export type PlanLimitKind = "units" | "users";

export type PlanLimitCheck = { ok: true } | { ok: false; message: string };

export async function checkPlanLimit(establishmentId: string, kind: PlanLimitKind): Promise<PlanLimitCheck> {
  const establishment = await prisma.establishment.findUnique({
    where: { id: establishmentId },
    select: { businessMode: true, subscription: { select: { planTier: true } } },
  });
  const tier = establishment?.subscription?.planTier;
  if (!establishment || !tier) return { ok: true };

  const caps = planCaps(establishment.businessMode, tier);
  if (!caps) return { ok: true };
  const cap = kind === "units" ? caps.units : caps.users;
  if (cap === null) return { ok: true };

  const existing =
    kind === "units"
      ? await prisma.property.count({ where: { establishmentId, active: true } })
      : await prisma.user.count({ where: { establishmentId } });
  if (!isOverCap(existing, cap)) return { ok: true };

  const what = kind === "units" ? "logements" : "utilisateurs";
  return {
    ok: false,
    message: `Votre formule est limitée à ${cap} ${what}. Passez à une formule supérieure depuis la page Abonnement pour en ajouter.`,
  };
}
