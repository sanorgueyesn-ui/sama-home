import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Deliberately has NO dependency on Prisma/the database: this is the only
// piece `proxy.ts` needs (an "optimistic" signature check on every request),
// and Proxy runs on every matched route — it must stay cheap. The
// authoritative, database-backed check lives in src/lib/dal.ts.

export const SESSION_COOKIE_NAME = "sama_session";

const secretKey = process.env.SESSION_SECRET;
if (!secretKey) {
  throw new Error(
    "SESSION_SECRET is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
  );
}
const encodedKey = new TextEncoder().encode(secretKey);

export type SessionCookiePayload = {
  sessionId: string;
};

export async function encryptSessionCookie(
  payload: SessionCookiePayload,
  expiresAt: Date,
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(encodedKey);
}

async function decryptSessionCookie(
  token: string | undefined,
): Promise<SessionCookiePayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionCookiePayload>(
      token,
      encodedKey,
      { algorithms: ["HS256"] },
    );
    return payload;
  } catch {
    // Expired, tampered, or signed with a rotated secret.
    return null;
  }
}

/** Reads and verifies the signature of the session cookie — no database call. */
export async function getSessionCookiePayload(): Promise<SessionCookiePayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return decryptSessionCookie(token);
}
