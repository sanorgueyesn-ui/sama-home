import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionCookiePayload } from "@/lib/session-token";

/**
 * Data Access Layer entry point: the ONE place session validity is checked
 * against the database (the cookie alone is never trusted). Call this at the
 * top of every protected Server Component, Server Action and Route Handler —
 * see Next.js "Authentication" guide, Authorization > Data Access Layer.
 *
 * `cache()` memoizes the result for the lifetime of a single request/render
 * pass, so calling this from multiple components doesn't cause duplicate
 * database round-trips.
 */
export const verifySession = cache(async () => {
  const payload = await getSessionCookiePayload();
  if (!payload?.sessionId) {
    redirect("/login");
  }

  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    select: { userId: true, expiresAt: true },
  });

  if (!session || session.expiresAt.getTime() < Date.now()) {
    redirect("/login");
  }

  return { isAuth: true as const, userId: session.userId };
});

/**
 * Returns only the fields safe to use in the UI or pass to a Client
 * Component — never the password hash. See "Using Data Transfer Objects".
 */
export const getCurrentUser = cache(async () => {
  const { userId } = await verifySession();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, name: true, role: true },
  });

  if (!user) {
    redirect("/login");
  }

  return user;
});
