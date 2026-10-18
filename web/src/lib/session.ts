import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  SESSION_COOKIE_NAME,
  encryptSessionCookie,
  getSessionCookiePayload,
} from "@/lib/session-token";

export { getSessionCookiePayload };

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Creates a database-backed session (source of truth) and stores a signed
 * reference to it in an httpOnly cookie (the cookie only proves *which*
 * session to look up — it carries no session data itself).
 */
export async function createSession(userId: string, remember: boolean) {
  const durationMs = remember ? 30 * DAY_MS : 1 * DAY_MS;
  const expiresAt = new Date(Date.now() + durationMs);

  const session = await prisma.session.create({
    data: { userId, expiresAt },
  });

  const token = await encryptSessionCookie({ sessionId: session.id }, expiresAt);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    // `Secure` cookies are dropped by the browser over plain http://localhost,
    // which is how `next dev` runs. Only require it in production (https).
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // "Se souvenir de moi" décoché: pas de `expires` -> cookie de session de
    // navigateur (effacé à la fermeture), la ligne en base expire quand même
    // après 24h comme filet de sécurité.
    ...(remember ? { expires: expiresAt } : {}),
  });
}

/** Deletes the session both in the database and on the client (true logout). */
export async function deleteSession() {
  const payload = await getSessionCookiePayload();

  if (payload?.sessionId) {
    // Phase 3G / Lot D12-P46-R1 — faille signalée en D12-P45 : ce `catch`
    // masquait auparavant TOUTE erreur, pas seulement le cas attendu
    // ("déjà absente"). P2025 ("Record to delete does not exist") est le
    // seul cas bénin (expiration déjà nettoyée, double déconnexion...) ;
    // toute autre erreur est désormais journalisée plutôt que masquée —
    // jamais de cookie, de jeton ni de secret dans le message, seul le nom
    // de l'erreur est loggé. La suppression du cookie et la redirection
    // restent inconditionnelles dans tous les cas (voir plus bas) : un
    // échec en base ne bloque jamais la déconnexion côté interface.
    await prisma.session.delete({ where: { id: payload.sessionId } }).catch((error: unknown) => {
      const isAlreadyGone = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
      if (!isAlreadyGone) {
        console.error("deleteSession() — échec inattendu de la suppression de la session :", error);
      }
    });
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
