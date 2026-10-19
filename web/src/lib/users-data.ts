import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";

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
 */
export async function listUsers() {
  const admin = await requireAdmin();
  if (!admin.establishmentId) {
    return [];
  }
  return prisma.user.findMany({
    where: { establishmentId: admin.establishmentId },
    select: { id: true, username: true, name: true, role: true, permissions: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

/** Phase 3C / Lot C2 — un utilisateur d'un autre établissement est traité comme introuvable, jamais renvoyé. */
export async function getUserById(id: string) {
  const admin = await requireAdmin();
  if (!admin.establishmentId) return null;
  return prisma.user.findFirst({
    select: { id: true, username: true, name: true, role: true, permissions: true, createdAt: true },
    where: { id, establishmentId: admin.establishmentId },
  });
}
