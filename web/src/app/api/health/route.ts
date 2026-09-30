import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Phase 17, Bloc 9 — minimal health check for Railway (or any platform
// probing readiness). Deliberately checks real DB connectivity (a Node
// process can be "up" while Postgres is unreachable, which is the failure
// mode that actually matters for this app's DB-backed sessions) rather than
// just answering "the server is running". Never exposes DATABASE_URL, a
// query result, or any error detail on failure — only a flat ok/error
// status, matching the exact shape given in the brief. Already reachable
// without a session: proxy.ts's matcher already excludes `/api` entirely
// (see its `matcher` config), so no change was needed there.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
