import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";

function getRedirectUri(request: NextRequest): string {
  if (process.env.APP_URL) {
    const base = process.env.APP_URL.replace(/\/+$/, "");
    return `${base}/api/auth/callback/google`;
  }
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/api/auth/callback/google`;
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  // Si les clés Google OAuth ne sont pas encore configurées dans .env / Railway
  if (!clientId) {
    const errorUrl = new URL("/login", request.url);
    errorUrl.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(errorUrl);
  }

  const redirectUri = getRedirectUri(request);

  // Génération d'un état CSRF aléatoire sécurisé
  const state = crypto.randomBytes(32).toString("hex");

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", state);
  googleAuthUrl.searchParams.set("prompt", "select_account");
  googleAuthUrl.searchParams.set("access_type", "online");

  const response = NextResponse.redirect(googleAuthUrl.toString());

  // Sauvegarde de l'état dans un cookie HTTP-only pour vérification au retour
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: proto === "https",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  return response;
}
