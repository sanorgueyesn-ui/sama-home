import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookiePayload } from "@/lib/session-token";

// Optimistic check only (cookie signature, no database round-trip) — Proxy
// runs on every matched request, including prefetches, so it must stay
// cheap. The authoritative, database-backed check lives in src/lib/dal.ts
// and MUST also be called from every Server Action / Server Component that
// touches protected data: Proxy alone is not sufficient (see Next.js
// "Authentication" guide, Authorization > Optimistic checks with Proxy).

const PUBLIC_ROUTES = ["/login"];

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|brand/).*)"],
};
