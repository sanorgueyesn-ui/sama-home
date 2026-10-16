import "server-only";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/dal";

// Même plafond que listClients()/listEstablishments() — convention déjà
// établie dans ce projet : capper la liste plutôt que charger toute la
// table, aucune pagination dédiée n'est justifiée à cette échelle.
const AUDIT_LOG_LIST_LIMIT = 50;

/**
 * Phase 3G / Lot D12-P95 — liste blanche FIXE des seules actions de niveau
 * PLATEFORME exposées dans "Historique des décisions" (voir l'audit D12-P94
 * exhaustif de tous les `tx.auditLog.create(...)` du projet). Volontairement
 * jamais un filtre négatif/dynamique ("tout sauf les actions métier
 * connues") : une future action métier ajoutée ailleurs dans le projet ne
 * doit jamais apparaître ici par oubli — seule une action explicitement
 * ajoutée à cette liste peut y figurer.
 */
export const PLATFORM_DECISION_ACTIONS = [
  "ESTABLISHMENT_APPROVED",
  "ESTABLISHMENT_AUTO_APPROVED",
  "ESTABLISHMENT_REJECTED",
  "ESTABLISHMENT_SUSPENDED",
  "ESTABLISHMENT_REACTIVATED",
  "PLATFORM_AUTO_APPROVAL_ENABLED",
  "PLATFORM_AUTO_APPROVAL_DISABLED",
  "SUBSCRIPTION_PAYMENT_CONFIRMED",
  // Phase 3G / Lot D12-P103 — ajoutée ici UNIQUEMENT (jamais une action
  // métier) : setPricingSettings() (src/app/actions/platform-settings.ts)
  // est une décision de plateforme humaine, jamais `userId: null`.
  "PRICING_SETTINGS_UPDATED",
] as const;

export type PlatformDecisionAction = (typeof PLATFORM_DECISION_ACTIONS)[number];

export type PlatformDecisionView = {
  id: string;
  action: PlatformDecisionAction;
  createdAt: Date;
  establishmentName: string | null;
  actorName: string | null;
  isSystemAction: boolean;
  reason: string | null;
  /**
   * Phase 3G / Lot D12-P103 — snapshots bruts déjà écrits par chaque action
   * (`Json` générique, forme différente selon l'action — jamais une donnée
   * sensible : confirmé par l'audit exhaustif D12-P94/P95 de chaque site
   * d'écriture réel de `AuditLog` pour les actions de cette liste blanche,
   * uniquement des états métier simples : statuts, dates, montants, booléen
   * de réglage). `oldValue`/`newValue` restent `Json?` nullable dans le
   * schéma — jamais supposés toujours présents, affichés tels quels sans
   * mise en forme par action (générique, voir la page de l'historique).
   */
  oldValue: unknown;
  newValue: unknown;
};

/**
 * Phase 3G / Lot D12-P95 — lecture de l'historique des décisions de
 * PLATEFORME, strictement limitée à `PLATFORM_DECISION_ACTIONS` ci-dessus.
 * Re-garde elle-même via requirePlatformAdmin(), même défense en profondeur
 * que les autres lectures de la console.
 *
 * `actionFilter` validé ici contre les valeurs réelles de `PLATFORM_DECISION_ACTIONS` (jamais une chaîne
 * de `searchParams` transmise telle quelle à Prisma) — toute valeur absente
 * ou invalide retombe silencieusement sur "aucun filtre", jamais une erreur
 * jetée pour une simple URL mal formée (même convention que
 * `listEstablishments()`, src/lib/establishment-data.ts).
 *
 * `query` filtre par nom d'établissement uniquement (voir le périmètre de ce
 * lot) — `contains`/`mode: "insensitive"`, même convention que
 * listClients()/listEstablishments(). Un journal sans établissement
 * (`establishmentId: null`, ex. `PLATFORM_AUTO_APPROVAL_*`) ne correspond à
 * aucune recherche textuelle mais reste normalement listé quand `query` est
 * vide — jamais exclu silencieusement.
 *
 * `isSystemAction` reflète exactement `userId === null` (jamais déduit
 * autrement) — seul `ESTABLISHMENT_AUTO_APPROVED` peut aujourd'hui produire
 * cette valeur (voir l'audit D12-P94). `actorName` n'est jamais un nom
 * inventé en son absence : `null` si `userId` est `null` ou si le compte
 * référencé n'existe plus (ne devrait jamais arriver, aucune suppression
 * physique de `User` dans ce projet).
 *
 * Jamais `passwordHash`, jamais de session, jamais sélectionnés ici — seuls
 * `user.name` et `establishment.name` sont joints.
 */
export async function listPlatformDecisions(options?: {
  actionFilter?: string;
  query?: string;
}): Promise<{ items: PlatformDecisionView[]; total: number; truncated: boolean }> {
  await requirePlatformAdmin();

  const actionFilter =
    options?.actionFilter && (PLATFORM_DECISION_ACTIONS as readonly string[]).includes(options.actionFilter)
      ? (options.actionFilter as PlatformDecisionAction)
      : null;
  const trimmedQuery = options?.query?.trim();

  const where = {
    action: actionFilter ? actionFilter : { in: PLATFORM_DECISION_ACTIONS as unknown as string[] },
    ...(trimmedQuery
      ? { establishment: { name: { contains: trimmedQuery, mode: "insensitive" as const } } }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        createdAt: true,
        reason: true,
        userId: true,
        oldValue: true,
        newValue: true,
        user: { select: { name: true } },
        establishment: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: AUDIT_LOG_LIST_LIMIT,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: logs.map((log) => ({
      id: log.id,
      action: log.action as PlatformDecisionAction,
      createdAt: log.createdAt,
      establishmentName: log.establishment?.name ?? null,
      actorName: log.user?.name ?? null,
      isSystemAction: log.userId === null,
      reason: log.reason,
      oldValue: log.oldValue,
      newValue: log.newValue,
    })),
    total,
    truncated: total > logs.length,
  };
}
