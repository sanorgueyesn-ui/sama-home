import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";
import type { UserRole } from "@/generated/prisma/client";

/**
 * Bloc 9/11 — ADMIN-only, and the selection NEVER includes passwordHash.
 * Phase 3C / Lot C3 — limitée explicitement à `admin.establishmentId` : un
 * ADMIN d'établissement ne doit voir que les utilisateurs de son propre
 * établissement, jamais ceux de tous les établissements. `isPlatformAdmin`
 * n'intervient pas ici — `requireAdmin()` ne vérifie que le rôle métier
 * `role === "ADMIN"`, jamais fusionné avec `isPlatformAdmin` ; un compte de
 * plateforme n'obtient aucune vue globale implicite via cette fonction.
 * Si l'administrateur n'a lui-même aucun établissement, aucun utilisateur
 * métier n'est renvoyé (liste vide, jamais la table entière par défaut).
 *
 * Socle multi-espaces : les comptes d'un espace sont ceux qui y ont une
 * APPARTENANCE (`Membership`), et leur rôle est celui de cette appartenance,
 * jamais la colonne historique `User.establishmentId` / `User.role`.
 */
export async function listUsers() {
  const admin = await requireAdmin();
  if (!admin.establishmentId) {
    return [];
  }
  const memberships = await prisma.membership.findMany({
    where: { establishmentId: admin.establishmentId },
    select: {
      role: true,
      user: { select: { id: true, username: true, name: true, permissions: true, createdAt: true } },
    },
    orderBy: { user: { createdAt: "asc" } },
  });
  return memberships.map((m) => ({ ...m.user, role: m.role }));
}

export type SpaceUser = {
  id: string;
  username: string;
  name: string;
  /** Rôle DANS cet espace (appartenance), pas la colonne historique `User.role`. */
  role: UserRole;
  permissions: string | null;
  createdAt: Date;
  /** Nombre d'espaces auxquels ce compte appartient (>1 = compte partagé). */
  spaceCount: number;
};

/**
 * Compte d'un espace, retrouvé par APPARTENANCE. Un compte d'un autre espace est traité comme
 * introuvable (jamais renvoyé, même `null` que pour un id inexistant).
 */
export async function findSpaceUser(userId: string, establishmentId: string): Promise<SpaceUser | null> {
  const membership = await prisma.membership.findUnique({
    where: { userId_establishmentId: { userId, establishmentId } },
    select: {
      role: true,
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          permissions: true,
          createdAt: true,
          _count: { select: { memberships: true } },
        },
      },
    },
  });
  if (!membership) return null;
  const { _count, ...user } = membership.user;
  return { ...user, role: membership.role, spaceCount: _count.memberships };
}

/** Phase 3C / Lot C2 — un utilisateur d'un autre établissement est traité comme introuvable, jamais renvoyé. */
export async function getUserById(id: string) {
  const admin = await requireAdmin();
  if (!admin.establishmentId) return null;
  const user = await findSpaceUser(id, admin.establishmentId);
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    permissions: user.permissions,
    createdAt: user.createdAt,
  };
}
