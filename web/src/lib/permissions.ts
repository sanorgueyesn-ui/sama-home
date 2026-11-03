/**
 * Système de permissions granulaires et contrôle d'accès par rôle (RBAC)
 * SAMA HOME — Supporte à la fois :
 * 1. La Plateforme (Super-Admin vs Assistante, Caisse, Frère / Collaborateurs restreints)
 * 2. Les Établissements (Directeur / Patron vs Réceptionniste, Caisse, Gestionnaire)
 */

// ============================================================================
// 1. MODULES & PERMISSIONS PLATEFORME
// ============================================================================

import {
  domainOfLegacyModule,
  effectivePlatformCapabilities,
  viewCapabilityOf,
  type PlatformCapabilityId,
} from "@/lib/platform-access";

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

  // Aucun droit précisé / vide / « tous » : super-administrateur (pleins pouvoirs).
  const granted = effectivePlatformCapabilities(user.permissions);
  const domain = domainOfLegacyModule(requiredPermission);
  // Un module = le droit de CONSULTER son domaine (ouvrir la page). Les actions ont leurs propres droits.
  if (domain) return granted.has(viewCapabilityOf(domain));
  return requiredPermission === "PLATFORM_ALL" ? isEverything(granted) : false;
}

function isEverything(granted: Set<PlatformCapabilityId>): boolean {
  return effectivePlatformCapabilities(null).size === granted.size;
}

/** Vérifie un droit précis (ex. valider un règlement) — jamais déduit du seul accès à une page. */
export function hasPlatformCapability(
  user: { isPlatformAdmin: boolean; permissions?: string | null } | null | undefined,
  capability: PlatformCapabilityId,
): boolean {
  if (!user || user.isPlatformAdmin !== true) return false;
  return effectivePlatformCapabilities(user.permissions).has(capability);
}

/**
 * Variante STRICTE de `hasPlatformCapability` : seul `null` (pleins pouvoirs canoniques) ou une liste
 * bien formée, non vide, qui accorde le droit. Même exigence que `hasExplicitPlatformPermission`.
 */
export function hasExplicitPlatformCapability(
  user: { isPlatformAdmin: boolean; permissions?: string | null } | null | undefined,
  capability: PlatformCapabilityId,
): boolean {
  if (!user || user.isPlatformAdmin !== true) return false;
  const stored = user.permissions;
  if (stored === null) return true;
  if (typeof stored !== "string") return false;
  const list = parseExplicitPermissions(stored);
  if (list === null || list.length === 0) return false;
  return effectivePlatformCapabilities(stored).has(capability);
}

/**
 * Lot 3B — variante STRICTE de `hasPlatformPermission` pour le flux de double approbation des
 * abonnements. Fonction pure ; `hasPlatformPermission` n'est pas modifiée et garde son comportement.
 *
 * Formats réels de `User.permissions` (`String?`, voir schema.prisma et createPlatformAdminUser) :
 * - `null` : compte « pleins pouvoirs » (mode « ALL » de la création d'un administrateur) ;
 * - une chaîne JSON `["PLATFORM_SUBSCRIPTIONS", …]` (mode « CUSTOM », au moins un module coché) ;
 * - tolérée par `parseUserPermissions` : une liste séparée par des virgules.
 *
 * Accepté UNIQUEMENT :
 * - un administrateur de plateforme (`isPlatformAdmin === true` exactement) dont `permissions` vaut
 *   `null` (pleins pouvoirs canoniques) ;
 * - un administrateur de plateforme dont la liste NON VIDE contient la permission demandée,
 *   `PLATFORM_ALL` ou `ALL` (comparaison exacte, sensible à la casse).
 *
 * Refusé : tout autre cas, notamment `undefined` (champ non sélectionné : jamais un accès par
 * omission), chaîne vide ou d'espaces, `[]`, `,`, liste mal formée, liste sans la permission, valeur
 * qui n'est pas une chaîne, utilisateur absent ou qui n'est pas administrateur de plateforme. À la
 * différence de `hasPlatformPermission`, une liste vide ne donne JAMAIS les pleins pouvoirs.
 */
export function hasExplicitPlatformPermission(
  user: {
    isPlatformAdmin: boolean;
    permissions?: string | null;
  } | null | undefined,
  requiredPermission: PlatformPermissionId
): boolean {
  if (!user || user.isPlatformAdmin !== true) return false;

  const stored = user.permissions;
  if (stored === null) return true;
  if (typeof stored !== "string") return false;

  const perms = parseExplicitPermissions(stored);
  if (perms === null || perms.length === 0) return false;

  return perms.includes(requiredPermission) || perms.includes("PLATFORM_ALL") || perms.includes("ALL");
}

/**
 * Lecture STRICTE de `User.permissions` pour `hasExplicitPlatformPermission`. Contrairement à
 * `parseUserPermissions` (qui convertit tout élément en texte, donc aplatit une liste imbriquée
 * `[["X"]]` en "X", et retombe sur un découpage par virgules quand le JSON est invalide), elle
 * retourne `null` — donc un refus — dès que la valeur n'est pas exactement :
 * - une liste JSON dont TOUS les éléments sont des chaînes ; ou
 * - une liste séparée par des virgules (format toléré par le parseur historique), sans crochets.
 * Les éléments sont nettoyés des espaces ; les éléments vides sont ignorés.
 */
function parseExplicitPermissions(stored: string): string[] | null {
  const trimmed = stored.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[") || trimmed.endsWith("]")) {
    if (!(trimmed.startsWith("[") && trimmed.endsWith("]"))) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return null;
    }
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) return null;
    return parsed.map((item: string) => item.trim()).filter(Boolean);
  }

  return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
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
  const granted = effectivePlatformCapabilities(permissionsStr);
  for (const item of PLATFORM_PERMISSIONS) {
    const domain = domainOfLegacyModule(item.id);
    if (domain && granted.has(viewCapabilityOf(domain))) return item.href;
  }
  return "/plateforme";
}
