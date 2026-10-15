import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionCookiePayload } from "@/lib/session-token";

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
    redirect("/login");
  }

  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    select: { userId: true, expiresAt: true },
  });

  if (!session || session.expiresAt.getTime() < Date.now()) {
    redirect("/login");
  }

  return { isAuth: true as const, userId: session.userId };
});

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
  if (!payload?.sessionId) return null;

  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    select: { userId: true, expiresAt: true },
  });

  if (!session || session.expiresAt.getTime() < Date.now()) return null;

  return { isAuth: true as const, userId: session.userId };
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
export const getCurrentUser = cache(async () => {
  const { userId } = await verifySession();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, name: true, role: true, establishmentId: true, isPlatformAdmin: true },
  });

  if (!user) {
    redirect("/login");
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
    redirect("/");
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
    redirect("/");
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

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, name: true, role: true, establishmentId: true, isPlatformAdmin: true },
  });

  return user;
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
