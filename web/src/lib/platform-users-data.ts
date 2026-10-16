import "server-only";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/dal";
import type { UserRole, EstablishmentStatus } from "@/generated/prisma/client";

// Même plafond que listClients()/listEstablishments()/listPlatformDecisions()
// — convention déjà établie dans ce projet : capper la liste plutôt que
// charger toute la table, aucune pagination dédiée n'est justifiée à cette
// échelle.
const PLATFORM_USER_LIST_LIMIT = 50;

const USER_ROLE_VALUES: UserRole[] = ["ADMIN", "GESTIONNAIRE"];
const ESTABLISHMENT_STATUS_VALUES: EstablishmentStatus[] = ["PENDING", "ACTIVE", "REJECTED", "SUSPENDED"];

export type PlatformUserView = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  isPlatformAdmin: boolean;
  role: UserRole | null;
  establishmentName: string | null;
  establishmentStatus: EstablishmentStatus | null;
  createdAt: Date;
  /**
   * Indicateur de session, jamais une date de dernière connexion certaine
   * (voir le commentaire de listPlatformUsers() ci-dessous) : `createdAt` de
   * la session la plus récente de ce compte, ou `null` si aucune session
   * n'existe (jamais connecté, ou toutes ses sessions ont expiré/été
   * révoquées).
   */
  mostRecentSessionCreatedAt: Date | null;
};

/**
 * Phase 3G / Lot D12-P101 — lecture globale, tous établissements confondus,
 * des comptes de la plateforme (vue réservée à un administrateur de
 * PLATEFORME). Re-garde elle-même via requirePlatformAdmin(), dès la
 * première ligne exécutable — même défense en profondeur que les autres
 * lectures de la console (listEstablishments(), listPlatformDecisions()).
 *
 * `roleFilter` ("ADMIN"/"GESTIONNAIRE") et `establishmentStatusFilter`
 * ("PENDING"/"ACTIVE"/"REJECTED"/"SUSPENDED") sont validés ici contre les
 * valeurs réelles des enums `UserRole`/`EstablishmentStatus` (jamais une
 * chaîne de `searchParams` transmise telle quelle à Prisma) — toute valeur
 * absente ou invalide retombe silencieusement sur "aucun filtre", même
 * convention que listEstablishments()/listPlatformDecisions().
 *
 * `platformAccountsOnly` (booléen) : un filtre DISTINCT des deux précédents
 * — un compte de plateforme (`isPlatformAdmin: true`) n'a ni rôle
 * d'établissement ni établissement par construction (voir schema.prisma,
 * modèle User), donc `roleFilter`/`establishmentStatusFilter` et
 * `platformAccountsOnly` ne sont jamais combinés utilement ; quand
 * `platformAccountsOnly` est actif, les deux autres filtres sont ignorés
 * (un compte de plateforme ne peut de toute façon jamais matcher un rôle ou
 * un statut d'établissement).
 *
 * `query` filtre par nom, identifiant de connexion OU e-mail — `contains`/
 * `mode: "insensitive"`, même convention que listClients()/
 * listEstablishments().
 *
 * Une seule requête `findMany` avec `select` explicite (jamais
 * `passwordHash`, jamais `sessions` en entier — uniquement la session la
 * plus récente, limitée à son seul `createdAt`) : aucune requête N+1 pour
 * l'établissement (jointure directe), une requête secondaire groupée pour
 * les sessions les plus récentes (groupBy, une seule requête quel que soit
 * le nombre d'utilisateurs retournés).
 */
export async function listPlatformUsers(options?: {
  roleFilter?: string;
  establishmentStatusFilter?: string;
  platformAccountsOnly?: boolean;
  query?: string;
}): Promise<{ items: PlatformUserView[]; total: number; truncated: boolean }> {
  await requirePlatformAdmin();

  const roleFilter =
    options?.roleFilter && USER_ROLE_VALUES.includes(options.roleFilter as UserRole)
      ? (options.roleFilter as UserRole)
      : null;
  const establishmentStatusFilter =
    options?.establishmentStatusFilter &&
    ESTABLISHMENT_STATUS_VALUES.includes(options.establishmentStatusFilter as EstablishmentStatus)
      ? (options.establishmentStatusFilter as EstablishmentStatus)
      : null;
  const platformAccountsOnly = options?.platformAccountsOnly === true;
  const trimmedQuery = options?.query?.trim();

  const where = {
    ...(platformAccountsOnly
      ? { isPlatformAdmin: true }
      : {
          ...(roleFilter ? { role: roleFilter } : {}),
          ...(establishmentStatusFilter ? { establishment: { status: establishmentStatusFilter } } : {}),
        }),
    ...(trimmedQuery
      ? {
          OR: [
            { name: { contains: trimmedQuery, mode: "insensitive" as const } },
            { username: { contains: trimmedQuery, mode: "insensitive" as const } },
            { email: { contains: trimmedQuery, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        isPlatformAdmin: true,
        role: true,
        createdAt: true,
        establishment: { select: { name: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: PLATFORM_USER_LIST_LIMIT,
    }),
    prisma.user.count({ where }),
  ]);

  // Session la plus récente par utilisateur, en une seule requête groupée —
  // jamais le contenu d'une session (id, expiresAt) exposé ici, uniquement
  // l'instant de sa création la plus récente.
  const mostRecentSessions =
    users.length > 0
      ? await prisma.session.groupBy({
          by: ["userId"],
          where: { userId: { in: users.map((u) => u.id) } },
          _max: { createdAt: true },
        })
      : [];
  const mostRecentSessionByUserId = new Map(mostRecentSessions.map((s) => [s.userId, s._max.createdAt ?? null]));

  return {
    items: users.map((user) => ({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      isPlatformAdmin: user.isPlatformAdmin,
      role: user.role,
      establishmentName: user.establishment?.name ?? null,
      establishmentStatus: user.establishment?.status ?? null,
      createdAt: user.createdAt,
      mostRecentSessionCreatedAt: mostRecentSessionByUserId.get(user.id) ?? null,
    })),
    total,
    truncated: total > users.length,
  };
}
