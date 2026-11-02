import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/dal";
import { SettingsNav } from "./settings-nav";

/**
 * Cadre commun de toutes les pages `/settings/**` : la barre des sections en haut (ordinateur), la
 * page courante dessous. La session est imposée ici ; l'accès réservé à l'administrateur reste
 * vérifié par chaque page et chaque action (`requireAdmin()`), la barre ne fait que masquer.
 */
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <SettingsNav isAdmin={user.role === "ADMIN"} />
      <div className="min-w-0 lg:mt-8 lg:max-w-4xl">{children}</div>
    </div>
  );
}
