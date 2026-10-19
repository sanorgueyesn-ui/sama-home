/**
 * Système de permissions granulaires et contrôle d'accès par rôle (RBAC)
 * SAMA HOME — Supporte à la fois :
 * 1. La Plateforme (Super-Admin vs Assistante, Caisse, Frère / Collaborateurs restreints)
 * 2. Les Établissements (Directeur / Patron vs Réceptionniste, Caisse, Gestionnaire)
 */

// ============================================================================
// 1. MODULES & PERMISSIONS PLATEFORME
// ============================================================================

export type PlatformPermissionId =
  | "PLATFORM_ALL"
  | "PLATFORM_DASHBOARD"
  | "PLATFORM_ESTABLISHMENTS"
  | "PLATFORM_SUBSCRIPTIONS"
  | "PLATFORM_USERS"
  | "PLATFORM_SETTINGS"
  | "PLATFORM_AUDIT";

export const PLATFORM_PERMISSIONS: {
  id: PlatformPermissionId;
  label: string;
  description: string;
  href: string;
}[] = [
  {
    id: "PLATFORM_DASHBOARD",
    label: "Tableau de bord & Statistiques",
    description: "Accès à la vue d'ensemble, métriques globales et graphiques",
    href: "/plateforme",
  },
  {
    id: "PLATFORM_ESTABLISHMENTS",
    label: "Gestion des Établissements",
    description: "Approuver, suspendre et modérer les résidences/hôtels",
    href: "/plateforme/etablissements",
  },
  {
    id: "PLATFORM_SUBSCRIPTIONS",
    label: "Abonnements & Règlements",
    description: "Vérifier et valider les paiements Wave & Orange Money",
    href: "/plateforme/abonnements",
  },
  {
    id: "PLATFORM_USERS",
    label: "Gestion des Utilisateurs",
    description: "Consulter la liste des comptes et gérer les accès",
    href: "/plateforme/utilisateurs",
  },
  {
    id: "PLATFORM_SETTINGS",
    label: "Paramètres Système & Tarifs",
    description: "Modifier la tarification globale et les coordonnées de paiement",
    href: "/plateforme/parametres",
  },
  {
    id: "PLATFORM_AUDIT",
    label: "Historique & Traçabilité",
    description: "Consulter le journal immuable des décisions administratives",
    href: "/plateforme/historique",
  },
];

// ============================================================================
// 2. MODULES & ACTIONS ÉTABLISSEMENT (HÔTELS / RÉSIDENCES)
// ============================================================================

export const ESTABLISHMENT_MODULE_PERMISSIONS = [
  {
    id: "MODULE_SEJOUR",
    label: "Séjour & Accueil rapide",
    description: "Enregistrer les arrivées, départs et séjours en direct",
    href: "/sejour",
  },
  {
    id: "MODULE_RESERVATIONS",
    label: "Réservations",
    description: "Créer, consulter et gérer les réservations de chambres",
    href: "/reservations",
  },
  {
    id: "MODULE_LOCATIONS",
    label: "Locations",
    description: "Consulter les locations en cours, contrats et factures",
    href: "/locations",
  },
  {
    id: "MODULE_CLIENTS",
    label: "Locataires / Répertoire Clients",
    description: "Consulter la fiche des clients et pièces d'identité",
    href: "/clients",
  },
  {
    id: "MODULE_LOGEMENTS",
    label: "Logements & Chambres",
    description: "Consulter les chambres, disponibilités et photos",
    href: "/logements",
  },
  {
    id: "MODULE_CAISSE",
    label: "Caisse & Encaissements",
    description: "Ouvrir et fermer la caisse, encaisser et suivre les espèces",
    href: "/caisse",
  },
  {
    id: "MODULE_DEPENSES",
    label: "Dépenses & Achats",
    description: "Enregistrer les frais d'entretien, factures et dépenses",
    href: "/depenses",
  },
  {
    id: "MODULE_SETTINGS",
    label: "Paramètres de l'établissement",
    description: "Modifier les couleurs de marque, logo et informations de l'hôtel",
    href: "/settings",
  },
] as const;

export const ESTABLISHMENT_ACTION_PERMISSIONS = [
  {
    id: "CAN_EDIT_TARIFFS",
    label: "Modifier les Tarifs & Prix",
    description: "Autoriser à changer ou supprimer les prix par heure ou par jour",
  },
  {
    id: "CAN_DELETE_PROPERTY",
    label: "Supprimer des Logements",
    description: "Autoriser la suppression définitive d'un appartement ou chambre",
  },
  {
    id: "CAN_DELETE_RENTAL",
    label: "Supprimer / Annuler des Locations",
    description: "Autoriser l'annulation ou suppression d'un contrat de location",
  },
  {
    id: "CAN_MANAGE_USERS",
    label: "Gérer l'équipe & les Utilisateurs",
    description: "Créer, modifier ou réinitialiser les mots de passe des employés",
  },
] as const;

export type EstablishmentModuleId = typeof ESTABLISHMENT_MODULE_PERMISSIONS[number]["id"];
export type EstablishmentActionId = typeof ESTABLISHMENT_ACTION_PERMISSIONS[number]["id"];
export type EstablishmentPermissionId = EstablishmentModuleId | EstablishmentActionId | "ESTABLISHMENT_ALL";

// ============================================================================
// 3. FONCTIONS UTILITAIRES D'ÉVALUATION DES PERMISSIONS
// ============================================================================

/**
 * Extrait les permissions stockées en base (JSON string ou comma-separated)
 */
export function parseUserPermissions(permissionsStr: string | null | undefined): string[] {
  if (!permissionsStr) return [];
  const trimmed = permissionsStr.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((p) => String(p).trim()).filter(Boolean);
    } catch {
      // fallback to comma separated
    }
  }

  return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Vérifie si un utilisateur de plateforme a accès à une fonctionnalité ou page
 */
export function hasPlatformPermission(
  user: {
    isPlatformAdmin: boolean;
    permissions?: string | null;
  } | null | undefined,
  requiredPermission: PlatformPermissionId
): boolean {
  if (!user || !user.isPlatformAdmin) return false;

  // Si permissions est non défini / null / vide : Super-Admin principal (pleins pouvoirs)
  if (!user.permissions) return true;

  const perms = parseUserPermissions(user.permissions);
  if (perms.length === 0 || perms.includes("PLATFORM_ALL") || perms.includes("ALL")) {
    return true;
  }

  return perms.includes(requiredPermission);
}

/**
 * Vérifie si un utilisateur d'établissement a accès à un module ou action
 */
export function hasEstablishmentPermission(
  user: {
    role?: string | null;
    isPlatformAdmin?: boolean;
    permissions?: string | null;
  } | null | undefined,
  requiredPermission: EstablishmentPermissionId | string
): boolean {
  if (!user) return false;

  // Si c'est un Super-Admin de plateforme, il a accès à tout
  if (user.isPlatformAdmin) return true;

  // Si c'est l'ADMIN (patron) de l'établissement sans restriction spécifique
  if (user.role === "ADMIN" && !user.permissions) {
    return true;
  }

  const perms = parseUserPermissions(user.permissions);

  // Si l'utilisateur a explicitement "ESTABLISHMENT_ALL" ou "ALL"
  if (perms.includes("ESTABLISHMENT_ALL") || perms.includes("ALL")) {
    return true;
  }

  // Si permissions est vide et que c'est un GESTIONNAIRE : permissions standard par défaut
  if (perms.length === 0 && user.role === "GESTIONNAIRE") {
    // Les modules standards sont autorisés par défaut pour un gestionnaire
    const defaultAllowed = [
      "MODULE_SEJOUR",
      "MODULE_RESERVATIONS",
      "MODULE_LOCATIONS",
      "MODULE_CLIENTS",
      "MODULE_LOGEMENTS",
      "MODULE_CAISSE",
      "MODULE_DEPENSES",
    ];
    // Mais les actions sensibles (modifier tarifs, supprimer chambres/locations, réglages hôtel) sont interdites
    return defaultAllowed.includes(requiredPermission);
  }

  return perms.includes(requiredPermission);
}

/**
 * Trouve la première URL autorisée pour un utilisateur de plateforme lors de sa connexion
 */
export function getFirstAuthorizedPlatformUrl(permissionsStr: string | null | undefined): string {
  if (!permissionsStr) return "/plateforme";
  const perms = parseUserPermissions(permissionsStr);
  if (perms.length === 0 || perms.includes("PLATFORM_ALL") || perms.includes("ALL")) {
    return "/plateforme";
  }

  for (const item of PLATFORM_PERMISSIONS) {
    if (perms.includes(item.id)) {
      return item.href;
    }
  }

  return "/plateforme";
}
