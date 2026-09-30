import "server-only";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

/** Fixed singleton row id — see the `model Settings` comment in schema.prisma. */
export const SETTINGS_ID = "singleton";

export async function getSettings() {
  await verifySession();
  return prisma.settings.findUnique({ where: { id: SETTINGS_ID } });
}
