import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
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
    await prisma.session.delete({ where: { id: payload.sessionId } }).catch(() => {
      // Already gone (expired cleanup, double logout, ...) — not an error.
    });
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
