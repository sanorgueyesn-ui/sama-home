import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";

/** Bloc 9/11 — ADMIN-only, and the selection NEVER includes passwordHash. */
export async function listUsers() {
  await requireAdmin();
  return prisma.user.findMany({
    select: { id: true, username: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getUserById(id: string) {
  await requireAdmin();
  return prisma.user.findUnique({
    select: { id: true, username: true, name: true, role: true, createdAt: true },
    where: { id },
  });
}
