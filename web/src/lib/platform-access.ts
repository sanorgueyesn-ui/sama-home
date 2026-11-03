// Droits des administrateurs de la PLATEFORME (console /plateforme). Module pur : aucune dépendance
// serveur, importable depuis un composant client, une action serveur ou un test.
//
// Modèle : des DROITS fins (consulter / agir / action sensible) regroupés par domaine, et des RÔLES
// prêts à l'emploi qui ne sont que des listes de droits. Ce qui est enregistré en base reste un simple
// texte (`User.permissions`, liste JSON) : aucune migration. Compatibilité totale avec l'ancien format :
//   - `null`, liste vide, `PLATFORM_ALL` ou `ALL` = tous les droits (super-administrateur) ;
//   - un ancien module (`PLATFORM_SUBSCRIPTIONS`, …) = tous les droits de ce domaine, comme avant.
// Les administrateurs existants gardent donc exactement leurs accès.

export type CapabilityLevel = "view" | "act" | "sensitive";

export type PlatformDomainId = "dashboard" | "establishments" | "subscriptions" | "users" | "settings" | "audit";

export const PLATFORM_DOMAINS: readonly { id: PlatformDomainId; label: string; href: string }[] = [
  { id: "dashboard", label: "Tableau de bord", href: "/plateforme" },
  { id: "establishments", label: "Établissements", href: "/plateforme/etablissements" },
  { id: "subscriptions", label: "Abonnements et règlements", href: "/plateforme/abonnements" },
  { id: "users", label: "Administrateurs", href: "/plateforme/utilisateurs" },
  { id: "settings", label: "Réglages de la plateforme", href: "/plateforme/parametres" },
  { id: "audit", label: "Historique", href: "/plateforme/historique" },
];

export const PLATFORM_CAPABILITIES = [
  { id: "DASHBOARD_VIEW", domain: "dashboard", level: "view", label: "Voir le tableau de bord", description: "Statistiques et vue d'ensemble de la plateforme." },

  { id: "ESTABLISHMENTS_VIEW", domain: "establishments", level: "view", label: "Consulter les établissements", description: "Voir la liste, les statuts et les fiches." },
  { id: "ESTABLISHMENTS_DECIDE", domain: "establishments", level: "act", label: "Approuver ou refuser une inscription", description: "Décider du sort d'un nouvel établissement en attente." },
  { id: "ESTABLISHMENTS_LIFECYCLE", domain: "establishments", level: "sensitive", label: "Suspendre, réactiver ou supprimer", description: "Couper l'accès d'un établissement ou le supprimer définitivement." },

  { id: "SUBSCRIPTIONS_VIEW", domain: "subscriptions", level: "view", label: "Consulter les abonnements", description: "Voir les formules, échéances et paiements." },
  { id: "PAYMENTS_RECORD", domain: "subscriptions", level: "act", label: "Saisir un règlement reçu", description: "Déposer une demande de règlement manuel (Wave, Orange Money, espèces). Elle doit être validée par une autre personne." },
  { id: "SUBSCRIPTIONS_ADJUST", domain: "subscriptions", level: "act", label: "Demander une prolongation", description: "Déposer une demande de prolongation (geste commercial). Elle doit être validée par une autre personne." },
  { id: "PAYMENTS_CONFIRM", domain: "subscriptions", level: "sensitive", label: "Valider ou refuser un règlement", description: "Décider des demandes de règlement et de prolongation déposées par d'autres, et enregistrer directement un règlement reçu." },

  { id: "USERS_VIEW", domain: "users", level: "view", label: "Consulter les comptes", description: "Voir la liste des utilisateurs et des administrateurs." },
  { id: "USERS_MANAGE", domain: "users", level: "sensitive", label: "Créer des administrateurs et gérer leurs droits", description: "Ajouter un administrateur de plateforme et modifier ce qu'il peut faire." },

  { id: "SETTINGS_VIEW", domain: "settings", level: "view", label: "Consulter les réglages", description: "Voir l'approbation, les tarifs et les paramètres." },
  { id: "SETTINGS_EDIT", domain: "settings", level: "sensitive", label: "Modifier les réglages", description: "Approbation automatique, essai gratuit et paramètres globaux." },

  { id: "AUDIT_VIEW", domain: "audit", level: "view", label: "Consulter l'historique", description: "Lire le journal des décisions et des modifications." },
] as const satisfies readonly { id: string; domain: PlatformDomainId; level: CapabilityLevel; label: string; description: string }[];

export type PlatformCapabilityId = (typeof PLATFORM_CAPABILITIES)[number]["id"];

const ALL_IDS: readonly PlatformCapabilityId[] = PLATFORM_CAPABILITIES.map((c) => c.id);
const KNOWN = new Set<string>(ALL_IDS);

export function isPlatformCapabilityId(value: unknown): value is PlatformCapabilityId {
  return typeof value === "string" && KNOWN.has(value);
}

/** Droit de consultation d'un domaine (nécessaire pour ouvrir sa page). */
export function viewCapabilityOf(domain: PlatformDomainId): PlatformCapabilityId {
  return PLATFORM_CAPABILITIES.find((c) => c.domain === domain && c.level === "view")!.id;
}

function capabilitiesOfDomain(domain: PlatformDomainId): PlatformCapabilityId[] {
  return PLATFORM_CAPABILITIES.filter((c) => c.domain === domain).map((c) => c.id);
}

// Anciens modules : tous les droits de leur domaine (comportement historique).
const LEGACY_MODULES: Record<string, PlatformDomainId> = {
  PLATFORM_DASHBOARD: "dashboard",
  PLATFORM_ESTABLISHMENTS: "establishments",
  PLATFORM_SUBSCRIPTIONS: "subscriptions",
  PLATFORM_USERS: "users",
  PLATFORM_SETTINGS: "settings",
  PLATFORM_AUDIT: "audit",
};

export function domainOfLegacyModule(id: string): PlatformDomainId | null {
  return LEGACY_MODULES[id] ?? null;
}

/** Lecture tolérante de `User.permissions` : liste JSON ou liste séparée par des virgules. */
function parseStored(stored: string | null | undefined): string[] {
  if (!stored) return [];
  const trimmed = stored.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((p) => String(p).trim()).filter(Boolean);
    } catch {
      /* repli sur les virgules */
    }
  }
  return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Tous les droits réellement accordés. Un droit d'agir ou une action sensible d'un domaine donne aussi
 * la consultation de ce domaine (sinon on ne pourrait pas ouvrir la page).
 */
export function effectivePlatformCapabilities(stored: string | null | undefined): Set<PlatformCapabilityId> {
  const list = parseStored(stored);
  if (list.length === 0 || list.includes("PLATFORM_ALL") || list.includes("ALL")) return new Set(ALL_IDS);

  const granted = new Set<PlatformCapabilityId>();
  for (const item of list) {
    if (isPlatformCapabilityId(item)) granted.add(item);
    const legacy = domainOfLegacyModule(item);
    if (legacy) for (const id of capabilitiesOfDomain(legacy)) granted.add(id);
  }
  for (const domain of PLATFORM_DOMAINS) {
    if (capabilitiesOfDomain(domain.id).some((id) => granted.has(id))) granted.add(viewCapabilityOf(domain.id));
  }
  return granted;
}

export function isFullPlatformAccess(stored: string | null | undefined): boolean {
  return effectivePlatformCapabilities(stored).size === ALL_IDS.length;
}

export type PlatformRoleId = "SUPER_ADMIN" | "FINANCE" | "MODERATOR" | "SUPPORT" | "AUDITOR";

export const PLATFORM_ROLES: readonly {
  id: PlatformRoleId;
  label: string;
  description: string;
  capabilities: readonly PlatformCapabilityId[];
}[] = [
  {
    id: "SUPER_ADMIN",
    label: "Super-administrateur",
    description: "Tous les droits, y compris la gestion des autres administrateurs. À réserver aux responsables.",
    capabilities: ALL_IDS,
  },
  {
    id: "FINANCE",
    label: "Responsable finance",
    description: "Suit les abonnements et valide les règlements. Ne peut ni suspendre ni supprimer un établissement.",
    capabilities: ["DASHBOARD_VIEW", "SUBSCRIPTIONS_VIEW", "PAYMENTS_RECORD", "SUBSCRIPTIONS_ADJUST", "PAYMENTS_CONFIRM", "AUDIT_VIEW"],
  },
  {
    id: "MODERATOR",
    label: "Modérateur",
    description: "Traite les inscriptions : approuve, refuse, suspend. Ne voit pas l'argent.",
    capabilities: ["DASHBOARD_VIEW", "ESTABLISHMENTS_VIEW", "ESTABLISHMENTS_DECIDE", "ESTABLISHMENTS_LIFECYCLE", "AUDIT_VIEW"],
  },
  {
    id: "SUPPORT",
    label: "Support client",
    description: "Consulte les établissements et leurs abonnements pour aider les clients. Ne modifie rien.",
    capabilities: ["DASHBOARD_VIEW", "ESTABLISHMENTS_VIEW", "SUBSCRIPTIONS_VIEW", "USERS_VIEW"],
  },
  {
    id: "AUDITOR",
    label: "Auditeur",
    description: "Lecture seule sur toute la plateforme, historique compris. Ne peut rien modifier.",
    capabilities: ["DASHBOARD_VIEW", "ESTABLISHMENTS_VIEW", "SUBSCRIPTIONS_VIEW", "USERS_VIEW", "SETTINGS_VIEW", "AUDIT_VIEW"],
  },
];

/** Le rôle prêt à l'emploi correspondant exactement à ces droits, ou `null` (accès personnalisé). */
export function roleOf(stored: string | null | undefined): PlatformRoleId | null {
  const have = effectivePlatformCapabilities(stored);
  for (const role of PLATFORM_ROLES) {
    const expected = effectivePlatformCapabilities(JSON.stringify(role.capabilities));
    if (role.id === "SUPER_ADMIN") {
      if (have.size === ALL_IDS.length) return "SUPER_ADMIN";
      continue;
    }
    if (have.size === expected.size && [...have].every((id) => expected.has(id))) return role.id;
  }
  return null;
}

export function roleLabel(stored: string | null | undefined): string {
  const id = roleOf(stored);
  return id ? PLATFORM_ROLES.find((r) => r.id === id)!.label : "Accès personnalisé";
}

/** Résumé lisible : ce que la personne peut / ne peut pas faire. */
export function summarizeAccess(stored: string | null | undefined): { can: string[]; cannot: string[] } {
  const have = effectivePlatformCapabilities(stored);
  const can: string[] = [];
  const cannot: string[] = [];
  for (const capability of PLATFORM_CAPABILITIES) (have.has(capability.id) ? can : cannot).push(capability.label);
  return { can, cannot };
}

export type ParsedSelection = { ok: true; stored: string | null } | { ok: false; error: string };

/**
 * Valide une sélection de droits venue d'un formulaire et la convertit en texte à enregistrer.
 * `null` = super-administrateur. Un droit inconnu est refusé (jamais ignoré en silence).
 */
export function parseCapabilitySelection(mode: string | undefined, selected: readonly string[]): ParsedSelection {
  if (mode === "ALL") return { ok: true, stored: null };
  if (mode !== "CUSTOM") return { ok: false, error: "Choisissez un rôle ou un accès personnalisé." };
  const unique = [...new Set(selected.map((s) => s.trim()).filter(Boolean))];
  if (unique.length === 0) return { ok: false, error: "Cochez au moins un droit." };
  const unknown = unique.find((id) => !isPlatformCapabilityId(id));
  if (unknown) return { ok: false, error: "Droit inconnu : la demande est refusée." };
  const withView = effectivePlatformCapabilities(JSON.stringify(unique));
  return { ok: true, stored: JSON.stringify(ALL_IDS.filter((id) => withView.has(id))) };
}

/** Anti-escalade : on ne peut accorder que des droits que l'on possède soi-même. */
export function canGrant(actorStored: string | null | undefined, targetStored: string | null | undefined): boolean {
  const actor = effectivePlatformCapabilities(actorStored);
  return [...effectivePlatformCapabilities(targetStored)].every((id) => actor.has(id));
}
