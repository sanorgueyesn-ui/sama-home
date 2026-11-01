import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  SESSION_COOKIE_NAME,
  encryptSessionCookie,
  getSessionCookiePayload,
} from "@/lib/session-token";

import { SESSION_IDLE_MS, getSessionAbsoluteEnd } from "@/lib/session-policy";

export { getSessionCookiePayload };

/**
 * Creates a database-backed session (source of truth) and stores a signed
 * reference to it in an httpOnly cookie (the cookie only proves *which*
 * session to look up — it carries no session data itself).
 *
 * Lot 2 / étape 2a — durées fixées par src/lib/session-policy.ts : inactivité 30 min
 * (`expiresAt`, glissante, prolongée par verifySession()) et durée absolue 12 h depuis
 * `createdAt`. `remember` n'influence PLUS aucune durée : il ne décide que du caractère
 * persistant du cookie (au plus jusqu'à la fin absolue). `createdAt` est posé ici, avec
 * la même horloge que `expiresAt` et le JWT.
 */
export async function createSession(userId: string, remember: boolean) {
  const now = new Date(Date.now()); // même source d'horloge que la validation (dal.ts)
  const createdAt = now;
  const expiresAt = new Date(now.getTime() + SESSION_IDLE_MS);
  const absoluteEnd = getSessionAbsoluteEnd(createdAt);

  const session = await prisma.session.create({
    data: { userId, createdAt, expiresAt },
  });

  // Le JWT porte la fin ABSOLUE (12 h) : la base, plus stricte, gouverne l'inactivité.
  const token = await encryptSessionCookie({ sessionId: session.id }, absoluteEnd);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    // `Secure` cookies are dropped by the browser over plain http://localhost,
    // which is how `next dev` runs. Only require it in production (https).
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // "Se souvenir de moi" décoché: pas de `expires` -> cookie de session de
    // navigateur (effacé à la fermeture). Coché: persistant, mais jamais au-delà de la
    // fin absolue de 12 h ; la base expire de toute façon après 30 min d'inactivité.
    ...(remember ? { expires: absoluteEnd } : {}),
  });

  return { token, expiresAt, sessionId: session.id };
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
