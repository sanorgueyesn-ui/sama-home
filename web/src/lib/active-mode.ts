import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/lib/dal";
import { listMySpaces } from "@/lib/spaces-data";
import { toShellMode, type ShellMode } from "@/lib/business-mode";

/** Mode métier et nom de l'espace actif (celui de la session), pour adapter titres et vocabulaire. */
export const getActiveSpace = cache(async (): Promise<{ mode: ShellMode; name: string }> => {
  const user = await getCurrentUser();
  const spaces = await listMySpaces(user.id);
  const active = spaces.find((space) => space.id === user.establishmentId);
  return { mode: active ? toShellMode(active.businessMode) : "RESIDENCE", name: active?.name ?? "" };
});
