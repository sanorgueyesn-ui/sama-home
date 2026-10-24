import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { assertSafeDevelopmentTarget } from "@/lib/env-guard";

// Singleton pattern: reuse one PrismaClient (and its connection pool) across
// hot reloads in development. See prisma-client-api skill, "Next.js Pattern".
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Phase 14 audit (Bloc 20): was a bare `!` non-null assertion — a missing
  // DATABASE_URL would previously surface as whatever opaque error the `pg`
  // driver happens to throw on first query (e.g. a connection-refused to a
  // default host), not a clear message. Same explicit fail-fast pattern
  // SESSION_SECRET already uses in src/lib/session-token.ts. Never exposes
  // the value either way — this only reports whether it's set.
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. See .env.example.");
  }
  // Garde contre la production : `next dev` ne doit JAMAIS s'ouvrir sur une
  // base distante (la base réelle contient de vrais clients). Refus par
  // défaut avant toute connexion ; voir src/lib/env-guard.ts. N'affecte ni
  // `next build` ni `next start` (NODE_ENV=production), donc ni la production.
  if (process.env.NODE_ENV === "development") {
    assertSafeDevelopmentTarget(process.env, "next dev");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
