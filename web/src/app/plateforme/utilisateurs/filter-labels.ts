import type { UserRole, EstablishmentStatus } from "@/generated/prisma/client";

/**
 * Phase 3G / Lot D12-P101 — libellés lisibles, module client-safe (aucune
 * dépendance `server-only`, uniquement des types effacés à la compilation
 * depuis `@/generated/prisma/client`) : jamais importé depuis
 * `src/lib/platform-users-data.ts` (qui commence par `import "server-only"`)
 * pour éviter exactement la violation de frontière serveur/client
 * identifiée et corrigée en D12-P98/P99 pour `/plateforme/historique`.
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrateur",
  GESTIONNAIRE: "Gestionnaire",
};

// Mêmes libellés que STATUS_BADGE (src/app/plateforme/etablissements/page.tsx)
// — cohérence visuelle entre les deux pages de la console.
export const ESTABLISHMENT_STATUS_LABELS: Record<EstablishmentStatus, string> = {
  PENDING: "En attente",
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  REJECTED: "Refusé",
};
