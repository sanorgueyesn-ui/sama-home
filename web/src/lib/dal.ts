import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionCookiePayload } from "@/lib/session-token";
import { evaluateSession } from "@/lib/session-policy";
import { needsSpaceSelection, resolveEstablishmentIdentity } from "@/lib/active-space";

// Garde stricte de développement local : actif UNIQUEMENT si NODE_ENV === 'development'
// et que le flag DEV_BYPASS_AUTH === 'true' est explicitement positionné.
// Strictement inactif en production (NODE_ENV !== 'development').
const isLocalDevBypass =
  process.env.NODE_ENV === "development" &&
  process.env.DEV_BYPASS_AUTH === "true";

async function getLocalDevSession() {
  const localUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username: "sanorgueye221@gmail.com" },
        { role: "ADMIN" },
      ],
      establishment: {
        status: "ACTIVE",
      },
    },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      establishmentId: true,
      isPlatformAdmin: true,
      permissions: true,
    },
    orderBy: { createdAt: "asc" }, // déterministe : toujours le même compte de développement
  });
  if (!localUser) return null;
  // Pas de vraie session : ni identifiant ni espace actif. Le DAL se replie alors sur l'unique
  // appartenance du compte (voir src/lib/active-space.ts) ; sans appartenance, aucun accès.
  return {
    isAuth: true as const,
    userId: localUser.id,
    sessionId: null as string | null,
    activeEstablishmentId: null as string | null,
  };
}

/**
 * Data Access Layer entry point: the ONE place session validity is checked
 * against the database (the cookie alone is never trusted). Call this at the
 * top of every protected Server Component, Server Action and Route Handler —
 * see Next.js "Authentication" guide, Authorization > Data Access Layer.
 *
 * `cache()` memoizes the result for the lifetime of a single request/render
 * pass, so calling this from multiple components doesn't cause duplicate
 * database round-trips.
 */
export const verifySession = cache(async () => {
  const payload = await getSessionCookiePayload();
  if (!payload?.sessionId) {
    if (isLocalDevBypass) {
      const devSession = await getLocalDevSession();
      if (devSession) return devSession;
    }
    redirect("/login");
  }

  const session = await readSession(payload.sessionId, { extend: true });
  if (!session) {
    if (isLocalDevBypass) {
      const devSession = await getLocalDevSession();
      if (devSession) return devSession;
    }
    redirect("/login");
  }

  return session;
});

/**
 * Lot 2 / étape 2a — validation unique d'une session (politique : src/lib/session-policy.ts,
 * 30 min d'inactivité, 12 h depuis `createdAt`). Seul `extend: true` peut écrire, et
 * UNIQUEMENT `verifySession()` le demande : la variante non redirigeante utilisée par le
 * layout sur toutes les pages (dont /login) ne prolonge jamais une session.
 *
 * Écriture : `updateMany` conditionné par la valeur d'`expiresAt` lue (jamais `update`, qui
 * lèverait P2025 si la session a été supprimée entre-temps par une déconnexion ou un
 * changement de mot de passe). Deux requêtes concurrentes : une seule écriture aboutit,
 * l'autre ne modifie rien. Un échec d'écriture est journalisé (nom de l'erreur seul) sans
 * faire échouer la requête : la session lue est valide.
 */
async function readSession(sessionId: string, options: { extend: boolean }) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { userId: true, createdAt: true, expiresAt: true, activeEstablishmentId: true },
  });
  if (!session) return null;

  const evaluation = evaluateSession(session, Date.now());
  if (!evaluation.valid) return null;

  if (options.extend && evaluation.shouldWrite) {
    try {
      await prisma.session.updateMany({
        where: { id: sessionId, expiresAt: session.expiresAt },
        data: { expiresAt: evaluation.nextExpiresAt },
      });
    } catch (error: unknown) {
      console.error(
        "readSession() — échec de la prolongation de la session :",
        error instanceof Error ? error.name : "erreur inconnue",
      );
    }
  }

  // `activeEstablishmentId` n'est PAS une autorisation : c'est un simple candidat, revalidé
  // contre les appartenances réelles du compte (voir getCurrentUser / active-space.ts).
  return {
    isAuth: true as const,
    userId: session.userId,
    sessionId: sessionId as string | null,
    activeEstablishmentId: (session.activeEstablishmentId ?? null) as string | null,
  };
}

/**
 * Lot "Personnalisation des couleurs" — variante non redirigeante de
 * verifySession(), réservée à src/app/layout.tsx : ce layout enveloppe
 * TOUTES les pages, y compris /login, où une redirection créerait une
 * boucle. Même vérification réelle en base que verifySession() ci-dessus
 * (jamais le cookie seul) — session effectivement trouvée et non expirée —
 * mais retourne `null` au lieu de rediriger en cas d'échec. À utiliser
 * UNIQUEMENT pour une décision d'affichage non sensible (ex. couleurs de
 * marque), jamais comme contrôle d'autorisation pour une donnée protégée ou
 * une action — verifySession() reste la seule référence pour cela.
 */
export const getVerifiedSessionOrNull = cache(async () => {
  const payload = await getSessionCookiePayload();
  if (!payload?.sessionId) {
    if (isLocalDevBypass) {
      return getLocalDevSession();
    }
    return null;
  }

  // Lecture seule : ne prolonge JAMAIS la session (voir readSession()).
  const session = await readSession(payload.sessionId, { extend: false });
  if (!session && isLocalDevBypass) {
    return getLocalDevSession();
  }
  return session;
});

/**
 * Returns only the fields safe to use in the UI or pass to a Client
 * Component — never the password hash. See "Using Data Transfer Objects".
 *
 * Lot "Phase 3B / Lot A" — `establishmentId`/`isPlatformAdmin` ajoutés
 * (lecture seule) pour que les futures vérifications d'isolation multi-
 * tenant aient une source serveur unique et fiable : jamais déduits d'une
 * donnée transmise par le navigateur. `establishmentId` reste `string |
 * null` tel qu'en base — ni un compte ordinaire ni un futur administrateur
 * de plateforme n'ont la garantie d'en avoir un, jamais supposé non nul ici.
 * `isPlatformAdmin` est un booléen distinct de `role === "ADMIN"` (deux
 * autorisations différentes, voir le commentaire sur `model User` dans
 * schema.prisma) — ni fusionné ni déduit l'un de l'autre.
 */
import { hasPlatformPermission, getFirstAuthorizedPlatformUrl, type PlatformPermissionId } from "@/lib/permissions";

/**
 * Socle multi-espaces (lot B) — SEUL endroit où l'identité d'établissement est résolue.
 * `getCurrentUser()` et `getCurrentUserOrNull()` passent tous deux par ici : sinon le layout
 * afficherait un espace pendant que les actions écriraient dans un autre.
 *
 * `establishmentId` et `role` renvoyés sont ceux de l'espace ACTIF, issus d'une appartenance
 * (`Membership`) relue en base à chaque requête, jamais de `User.establishmentId` (colonne
 * historique, plus lue ici) ni d'une valeur du navigateur. `User.role` n'est lu que comme repli
 * pour un compte de PLATEFORME sans appartenance (voir resolveEstablishmentIdentity). Les ~327
 * usages de `user.establishmentId` dans l'application restent donc valables sans modification.
 * Règles de choix : src/lib/active-space.ts (testé seul).
 */
async function loadCurrentUser(userId: string, activeEstablishmentId: string | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      isPlatformAdmin: true,
      permissions: true,
      memberships: { select: { establishmentId: true, role: true } },
    },
  });
  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    isPlatformAdmin: user.isPlatformAdmin,
    permissions: user.permissions,
    needsSpaceSelection: needsSpaceSelection(user.memberships, activeEstablishmentId),
    ...resolveEstablishmentIdentity({
      isPlatformAdmin: user.isPlatformAdmin,
      legacyRole: user.role,
      memberships: user.memberships,
      activeEstablishmentId,
    }),
  };
}

export const getCurrentUser = cache(async () => {
  const { userId, activeEstablishmentId } = await verifySession();

  const user = await loadCurrentUser(userId, activeEstablishmentId);

  if (!user) {
    redirect("/login");
  }

  // Plusieurs espaces et aucun choix valide : aucune donnée métier n'est servie avant que le
  // compte ait choisi (page /espaces, qui n'utilise PAS getCurrentUser pour éviter une boucle).
  if (user.needsSpaceSelection) {
    redirect("/espaces");
  }

  return user;
});

/**
 * Phase 11, Bloc 11 — "un simple masquage d'un bouton dans l'interface ne
 * constitue pas une protection" : every ADMIN-only page and action must call
 * this (or perform the equivalent check) server-side. Redirects home rather
 * than to /login, since the user IS authenticated — they just lack the role.
 */
export const requireAdmin = cache(async () => {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return user;
});

/**
 * Phase 3G / Lot D12-P60 — même principe et même convention que
 * requireAdmin() ci-dessus (redirige vers "/", jamais "/login" : l'utilisateur
 * EST authentifié, il lui manque seulement ce privilège), mais pour
 * l'administration de PLATEFORME : `isPlatformAdmin === true` UNIQUEMENT,
 * jamais `role === "ADMIN"` (deux autorisations distinctes, jamais fusionnées
 * — voir le commentaire sur `model User` dans schema.prisma et sur
 * getCurrentUser() ci-dessus). Un ADMIN d'établissement, même du même
 * établissement qu'une demande de paiement, est refusé par cette fonction. Un
 * compte sans établissement (`establishmentId === null`) n'est PAS refusé ici
 * pour cette seule raison — c'est au contraire le cas normal d'un compte de
 * plateforme (voir schema.prisma, modèle User : `establishmentId` nullable
 * "NULL pour un compte de plateforme").
 */
export const requirePlatformAdmin = cache(async () => {
  const user = await getCurrentUser();
  if (!user.isPlatformAdmin) {
    redirect("/dashboard");
  }
  return user;
});

/**
 * Contrôle d'accès granulaire pour les collaborateurs de plateforme
 * (assistants, caisse, modérateurs). Redirige vers leur premier module
 * autorisé s'ils n'ont pas la permission requise.
 */
export const requirePlatformPermission = cache(async (permission: PlatformPermissionId) => {
  const user = await requirePlatformAdmin();
  if (!hasPlatformPermission(user, permission)) {
    const fallback = getFirstAuthorizedPlatformUrl(user.permissions);
    redirect(fallback);
  }
  return user;
});

/**
 * Phase 3F / Lot D12-B — variante non redirigeante de getCurrentUser(), même
 * principe que getVerifiedSessionOrNull() ci-dessus par rapport à
 * verifySession() : réservée à src/app/layout.tsx (ou tout autre
 * consommateur enveloppant des routes publiques comme /login, /register, où
 * une redirection créerait une boucle). Réutilise getVerifiedSessionOrNull()
 * telle quelle — aucune logique de validation de session dupliquée ici,
 * cette fonction ne fait qu'ajouter la lecture `User` par-dessus, exactement
 * comme getCurrentUser() le fait par-dessus verifySession().
 *
 * Retourne `null` si la session est absente, expirée/invalide, OU si
 * l'utilisateur associé n'existe plus (compte supprimé entre-temps) —
 * jamais une redirection. Mêmes champs que getCurrentUser() ci-dessus,
 * notamment `establishmentId`/`isPlatformAdmin`, jamais déduits d'une
 * donnée transmise par le navigateur. `isPlatformAdmin` reste un booléen
 * distinct de `role === "ADMIN"`, ni fusionné ni déduit l'un de l'autre.
 *
 * UNIQUEMENT pour une décision d'affichage non sensible (ex. paramètres
 * d'établissement pour les couleurs de marque) — jamais comme contrôle
 * d'autorisation pour une donnée protégée ou une action : getCurrentUser()
 * reste la seule référence pour cela. Ne couvre PAS encore le statut de
 * l'établissement ni de l'abonnement (hors périmètre de ce lot).
 */
export const getCurrentUserOrNull = cache(async () => {
  const session = await getVerifiedSessionOrNull();
  if (!session) return null;

  return loadCurrentUser(session.userId, session.activeEstablishmentId);
});

/**
 * Phase 3G / Lot D12-N — résultat discriminé (jamais un `redirect()` ni une
 * erreur levée) : aucune route de refus dédiée n'existe encore dans l'app
 * (confirmé par audit exhaustif des `redirect()` existants, D12-N précontrôle
 * — seules `/login` et `/` sont utilisées, pour des raisons différentes de
 * celle-ci), donc cette fonction ne décide d'aucune convention d'affichage à
 * la place des futurs appelants.
 *
 * Mise à jour D12-P110 (commentaire corrigé — obsolète depuis plusieurs lots
 * intermédiaires) : désormais branchée dans la quasi-totalité des Server
 * Actions métier qui créent, modifient ou suppriment une donnée (voir
 * l'audit D12-P109 et la correction D12-P110 pour la liste exhaustive et le
 * principe retenu : les actions qui créent ou augmentent un engagement sont
 * gardées, celles qui réduisent un engagement déjà existant — désactivation,
 * annulation — ou qui relèvent de l'hygiène de sécurité du compte restent
 * volontairement non gardées).
 */
export type EstablishmentAccessResult =
  | { ok: true; user: Awaited<ReturnType<typeof getCurrentUser>> }
  | { ok: false; reason: "NO_ESTABLISHMENT" | "INACTIVE" | "NO_SUBSCRIPTION" | "EXPIRED" };

/**
 * Phase 3G / Lot D12-N — garde centralisé pour les points d'entrée
 * métier critiques (pas encore appelé nulle part ailleurs qu'ici). Deux
 * vérifications strictement séparées, jamais fusionnées : le statut de
 * l'ÉTABLISSEMENT (`Establishment.status`) d'abord, puis celui de
 * l'ABONNEMENT (`Subscription`) ensuite — un établissement actif peut avoir
 * un abonnement expiré, et les deux notions ne se substituent jamais l'une à
 * l'autre (voir l'audit D12-K). `establishmentId` provient exclusivement de
 * `getCurrentUser()` (donc en dernier ressort de la session serveur), jamais
 * d'une valeur transmise par le navigateur.
 *
 * Aucune exemption codée en dur pour l'établissement historique
 * (`04f027a5-1a0e-4fab-b1e6-cac096a38c4f`) : sa ligne `Subscription` (créée
 * au Lot D12-M, échéance 2026-12-14) suffit à le faire passer par le chemin
 * normal, exactement comme n'importe quel autre établissement abonné.
 *
 * Ne confirme, ne crée ni ne modifie aucun paiement — la confirmation
 * manuelle d'un `SubscriptionPayment` reste une responsabilité séparée, hors
 * périmètre de cette fonction.
 */
export const requireActiveEstablishment = cache(async (): Promise<EstablishmentAccessResult> => {
  const user = await getCurrentUser();

  if (!user.establishmentId) {
    return { ok: false, reason: "NO_ESTABLISHMENT" };
  }

  const establishment = await prisma.establishment.findUnique({
    where: { id: user.establishmentId },
    select: { status: true },
  });
  if (!establishment || establishment.status !== "ACTIVE") {
    return { ok: false, reason: "INACTIVE" };
  }

  const subscription = await prisma.subscription.findUnique({
    where: { establishmentId: user.establishmentId },
    select: { currentPeriodEnd: true },
  });
  if (!subscription) {
    return { ok: false, reason: "NO_SUBSCRIPTION" };
  }
  if (subscription.currentPeriodEnd.getTime() <= Date.now()) {
    return { ok: false, reason: "EXPIRED" };
  }

  return { ok: true, user };
});
