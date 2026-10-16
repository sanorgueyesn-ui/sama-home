import "server-only";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/dal";
import type { EstablishmentStatus } from "@/generated/prisma/client";

// Même plafond que listClients() (src/lib/clients-data.ts) — convention déjà
// établie dans ce projet : capper la liste plutôt que charger toute la
// table, une pagination dédiée n'est pas justifiée à cette échelle.
const ESTABLISHMENT_LIST_LIMIT = 50;

const ESTABLISHMENT_STATUS_VALUES: EstablishmentStatus[] = ["PENDING", "ACTIVE", "REJECTED", "SUSPENDED"];

export type EstablishmentStatusFilter = EstablishmentStatus | "ALL";

export type EstablishmentListView = {
  id: string;
  name: string;
  status: EstablishmentStatus;
  createdAt: Date;
  adminName: string | null;
  adminEmail: string | null;
  userCount: number;
  subscriptionCurrentPeriodEnd: Date | null;
};

/**
 * Phase 3G / Lot D12-P92 — liste globale des établissements, tous statuts
 * confondus par défaut (remplace `listPendingEstablishments()`, retirée
 * dans ce même lot : sa seule utilisatrice était la page
 * `/plateforme/etablissements`, réécrite ici pour appeler cette fonction).
 * Re-garde elle-même via requirePlatformAdmin(), même défense en profondeur
 * que les autres lectures de la console.
 *
 * `statusFilter` est validé ici contre les 4 valeurs réelles de l'enum
 * `EstablishmentStatus` (jamais une chaîne de `searchParams` transmise
 * telle quelle à Prisma) — toute valeur absente ou invalide retombe
 * silencieusement sur "ALL" (aucun filtre), jamais une erreur jetée pour une
 * simple URL mal formée.
 *
 * `query` filtre par nom d'établissement OU par e-mail du premier compte
 * `role: "ADMIN"` (même administrateur initial que `adminEmail` ci-dessous)
 * — `contains`/`mode: "insensitive"`, même convention que listClients().
 *
 * Une seule requête `findMany` avec `select` imbriqué (administrateur
 * initial + comptage d'utilisateurs + abonnement) : aucune requête N+1.
 * Jamais `passwordHash`, jamais de session, jamais sélectionnés ici.
 */
export async function listEstablishments(options?: {
  statusFilter?: string;
  query?: string;
}): Promise<{ items: EstablishmentListView[]; total: number; truncated: boolean }> {
  await requirePlatformAdmin();

  const statusFilter =
    options?.statusFilter && ESTABLISHMENT_STATUS_VALUES.includes(options.statusFilter as EstablishmentStatus)
      ? (options.statusFilter as EstablishmentStatus)
      : null;
  const trimmedQuery = options?.query?.trim();

  const where = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(trimmedQuery
      ? {
          OR: [
            { name: { contains: trimmedQuery, mode: "insensitive" as const } },
            {
              users: {
                some: { role: "ADMIN" as const, email: { contains: trimmedQuery, mode: "insensitive" as const } },
              },
            },
          ],
        }
      : {}),
  };

  const [establishments, total] = await Promise.all([
    prisma.establishment.findMany({
      where,
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        users: {
          where: { role: "ADMIN" },
          select: { name: true, email: true },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
        _count: { select: { users: true } },
        subscription: { select: { currentPeriodEnd: true } },
      },
      orderBy: { createdAt: "desc" },
      take: ESTABLISHMENT_LIST_LIMIT,
    }),
    prisma.establishment.count({ where }),
  ]);

  return {
    items: establishments.map((establishment) => ({
      id: establishment.id,
      name: establishment.name,
      status: establishment.status,
      createdAt: establishment.createdAt,
      adminName: establishment.users[0]?.name ?? null,
      adminEmail: establishment.users[0]?.email ?? null,
      userCount: establishment._count.users,
      subscriptionCurrentPeriodEnd: establishment.subscription?.currentPeriodEnd ?? null,
    })),
    total,
    truncated: total > establishments.length,
  };
}

export type AutoApprovedEstablishmentView = {
  id: string;
  name: string;
  approvedAt: Date;
};

/**
 * Phase 3G / Lot D12-P88 — lecture sécurisée des établissements créés par
 * le mode d'approbation automatique, à partir des journaux
 * `ESTABLISHMENT_AUTO_APPROVED` (jamais un nouveau champ sur
 * `Establishment` — réutilise l'infrastructure déjà existante, voir l'audit
 * D12-P87). Re-garde elle-même via requirePlatformAdmin(). Si un
 * établissement référencé par un journal n'existe plus (ne devrait jamais
 * arriver — aucune suppression physique dans ce projet, voir le
 * commentaire du modèle `Establishment`), affiché explicitement comme
 * "introuvable" plutôt que silencieusement omis ou qu'une donnée
 * inventée. Préparée pour une future page "Historique des décisions"
 * (encore "Bientôt" dans la console) — aucune interface ne consomme
 * encore cette fonction dans ce lot.
 */
export async function listAutoApprovedEstablishments(): Promise<AutoApprovedEstablishmentView[]> {
  await requirePlatformAdmin();

  const logs = await prisma.auditLog.findMany({
    where: { action: "ESTABLISHMENT_AUTO_APPROVED", entityType: "Establishment" },
    select: { entityId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const establishments = await prisma.establishment.findMany({
    where: { id: { in: logs.map((log) => log.entityId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(establishments.map((establishment) => [establishment.id, establishment.name]));

  return logs.map((log) => ({
    id: log.entityId,
    name: nameById.get(log.entityId) ?? "Établissement introuvable (donnée historique incohérente)",
    approvedAt: log.createdAt,
  }));
}
