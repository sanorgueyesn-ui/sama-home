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
const isPublicRoutePath = (pathname: string) =>
  pathname === "/" ||
  pathname === "/login" ||
  pathname === "/register" ||
  pathname.startsWith("/register/") ||
  pathname === "/verify-otp" ||
  pathname === "/forgot-password" ||
  pathname.startsWith("/forgot-password/") ||
  pathname === "/landing" ||
  pathname.startsWith("/landing/");

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicRoute = isPublicRoutePath(pathname);

  const session = await getSessionCookiePayload();
  const isAuthenticated = Boolean(session?.sessionId);

  if (!isPublicRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isPublicRoute && isAuthenticated) {
    if ((pathname === "/login" || pathname === "/register") && request.method === "GET") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // D12-P206 — la sélection entre navigation métier (AppShell) et console
  // de plateforme (PlatformShell) ne passe plus par un en-tête posé ici
  // (src/app/layout.tsx, Server Component partagé par les deux, n'était
  // jamais ré-exécuté lors d'une navigation côté client entre les deux —
  // la coquille restait figée, cause du rapport D12-P205). Ce choix est
  // désormais fait par src/components/shell-switcher.tsx (composant client,
  // usePathname()). Aucune incidence sur les redirections ci-dessus,
  // strictement inchangées.
  return NextResponse.next();
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
