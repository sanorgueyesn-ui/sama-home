import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookiePayload } from "@/lib/session-token";

// Optimistic check only (cookie signature, no database round-trip) — Proxy
// runs on every matched request, including prefetches, so it must stay
// cheap. The authoritative, database-backed check lives in src/lib/dal.ts
// and MUST also be called from every Server Action / Server Component that
// touches protected data: Proxy alone is not sufficient (see Next.js
// "Authentication" guide, Authorization > Optimistic checks with Proxy).

// "/register" ajouté pour le lot "Correction visuelle de l'authentification"
// — la page existe désormais (src/app/register/page.tsx), purement visuelle
// (aucune action serveur, aucune création de compte). Sans cette entrée,
// un visiteur non authentifié ne pourrait jamais l'atteindre : la logique
// ci-dessous (déjà générique, non modifiée) s'applique à l'identique à
// "/login" et "/register".
const PUBLIC_ROUTES = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  const session = await getSessionCookiePayload();
  const isAuthenticated = Boolean(session?.sessionId);

  if (!isPublicRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isPublicRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Phase 3G / Lot D12-P86 — transmet le chemin au layout racine (Server
  // Component, qui n'a pas directement accès à l'URL courante) via un
  // en-tête de la REQUÊTE transmise en aval (jamais un en-tête de réponse au
  // navigateur) : seul moyen standard pour src/app/layout.tsx de choisir
  // entre la navigation métier (AppShell) et la console de plateforme
  // (PlatformShell) sans dupliquer la logique d'authentification déjà
  // ci-dessus, strictement inchangée. Aucune incidence sur les redirections
  // existantes (les deux blocs au-dessus restent exactement les mêmes).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // "images/" ajouté pour le lot "Correction visuelle de l'authentification"
  // — même raison que l'exclusion déjà existante de "brand/" : l'optimiseur
  // d'images de Next effectue une requête HTTP interne vers le chemin brut
  // (ex. /images/hero/...) pour le traiter ; sans cette exclusion, le proxy
  // interceptait cette requête interne et la redirigeait vers /login,
  // provoquant une erreur "isn't a valid image" pour toute photo locale
  // utilisée sur une page publique (/login, /register) avant connexion —
  // confirmé dans les logs serveur pendant la vérification de cette page.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|brand/|images/).*)"],
};
