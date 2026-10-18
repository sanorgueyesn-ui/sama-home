import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { signGoogleAuthToken } from "@/lib/session-token";

function getBaseUrl(request: NextRequest): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, "");
  }
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = getBaseUrl(request);
  const isSecure = baseUrl.startsWith("https");
  const loginUrl = new URL(`${baseUrl}/login`);

  // 1. Gestion des annulations ou erreurs renvoyées par Google
  if (error || !code) {
    console.error("Google OAuth error from provider:", error);
    loginUrl.searchParams.set("error", "google_cancelled");
    return NextResponse.redirect(loginUrl);
  }

  // 2. Vérification de l'état CSRF
  const cookieState = request.cookies.get("oauth_state")?.value;
  if (!state || !cookieState || state !== cookieState) {
    console.error("Google OAuth CSRF state mismatch:", { state, cookieState });
    loginUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(loginUrl);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("Google OAuth credentials missing in environment");
    loginUrl.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(loginUrl);
  }

  const redirectUri = `${baseUrl}/api/auth/callback/google`;

  try {
    // 3. Échange du code d'autorisation contre les jetons
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("Failed to exchange Google OAuth code for tokens:", tokenRes.status, errBody);
      loginUrl.searchParams.set("error", "google_token_failed");
      return NextResponse.redirect(loginUrl);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 4. Récupération des informations du profil utilisateur Google
    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userinfoRes.ok) {
      console.error("Failed to fetch Google userinfo:", userinfoRes.status);
      loginUrl.searchParams.set("error", "google_userinfo_failed");
      return NextResponse.redirect(loginUrl);
    }

    const profile = await userinfoRes.json();
    const email = profile.email?.toLowerCase().trim();
    const name = profile.name || email?.split("@")[0] || "Utilisateur Google";

    if (!email) {
      loginUrl.searchParams.set("error", "google_no_email");
      return NextResponse.redirect(loginUrl);
    }

    // 5. Recherche de l'utilisateur dans la base de données
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: email }, { email: email }],
      },
      include: { establishment: true },
    });

    if (user) {
      // Vérification du statut de l'établissement
      if (user.establishmentId && user.establishment) {
        if (user.establishment.status === "PENDING") {
          loginUrl.searchParams.set("error", "establishment_pending");
          return NextResponse.redirect(loginUrl);
        }
        if (user.establishment.status === "REJECTED") {
          loginUrl.searchParams.set("error", "establishment_rejected");
          return NextResponse.redirect(loginUrl);
        }
        if (user.establishment.status === "SUSPENDED") {
          loginUrl.searchParams.set("error", "establishment_suspended");
          return NextResponse.redirect(loginUrl);
        }
      }

      // Utilisateur existant : Redirection vers /login pour demander le mot de passe
      // Sécurité renforcée : Google a validé l'identité de l'e-mail, l'utilisateur n'a plus qu'à taper son mot de passe
      const token = await signGoogleAuthToken({
        email,
        name: user.name || name,
        purpose: "login",
      });

      loginUrl.searchParams.set("google_verified", "1");
      loginUrl.searchParams.set("username", user.username);
      if (user.establishment?.name) {
        loginUrl.searchParams.set("establishment", user.establishment.name);
      }
      loginUrl.searchParams.set("token", token);

      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.cookies.set("google_auth_token", token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60,
      });
      redirectResponse.cookies.delete("oauth_state");
      return redirectResponse;
    } else {
      // Nouvel utilisateur : Redirection vers /register avec pré-remplissage email & nom
      // L'utilisateur renseigne le nom de son établissement et son mot de passe
      const token = await signGoogleAuthToken({
        email,
        name,
        purpose: "register",
      });

      const registerUrl = new URL(`${baseUrl}/register`);
      registerUrl.searchParams.set("google", "1");
      registerUrl.searchParams.set("email", email);
      registerUrl.searchParams.set("name", name);
      registerUrl.searchParams.set("token", token);

      const redirectResponse = NextResponse.redirect(registerUrl);
      redirectResponse.cookies.set("google_auth_token", token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60,
      });
      redirectResponse.cookies.delete("oauth_state");
      return redirectResponse;
    }
  } catch (err) {
    console.error("Unexpected error in Google OAuth callback:", err);
    loginUrl.searchParams.set("error", "google_error");
    return NextResponse.redirect(loginUrl);
  }
}

