import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { createTrialSubscriptionAndAudit } from "@/lib/establishment-activation";

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
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const loginUrl = new URL("/login", request.url);

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

  const redirectUri = getRedirectUri(request);

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

    let targetUserId: string;
    let isPlatformAdmin = false;

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

      targetUserId = user.id;
      isPlatformAdmin = user.isPlatformAdmin;
    } else {
      // 6. Nouvel utilisateur : Inscription rapide automatique 1-clic
      const randomPassword = crypto.randomBytes(24).toString("hex");
      const passwordHash = await hashPassword(randomPassword);
      const establishmentName = `Résidence ${name}`;

      const created = await prisma.$transaction(async (tx) => {
        // Création de l'établissement actif immédiatement
        const establishment = await tx.establishment.create({
          data: {
            name: establishmentName,
            status: "ACTIVE",
          },
        });

        // Création de l'administrateur
        const newUser = await tx.user.create({
          data: {
            username: email,
            email,
            name,
            passwordHash,
            role: "ADMIN",
            establishmentId: establishment.id,
          },
        });

        // Activation de l'essai gratuit
        await createTrialSubscriptionAndAudit(
          tx,
          establishment.id,
          null,
          "ESTABLISHMENT_AUTO_APPROVED",
        );

        return newUser;
      });

      targetUserId = created.id;
      isPlatformAdmin = false;
    }

    // 7. Création de la session sécurisée
    await createSession(targetUserId, true);

    // 8. Redirection vers la destination appropriée
    const destination = isPlatformAdmin ? "/plateforme" : "/";
    const redirectResponse = NextResponse.redirect(new URL(destination, request.url));

    // Nettoyage du cookie temporaire d'état
    redirectResponse.cookies.delete("oauth_state");

    return redirectResponse;
  } catch (err) {
    console.error("Unexpected error in Google OAuth callback:", err);
    loginUrl.searchParams.set("error", "google_error");
    return NextResponse.redirect(loginUrl);
  }
}
