import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/dal";
import { SettingsNav } from "./settings-nav";

/**
 * Cadre commun de toutes les pages `/settings/**` : menu des sections à gauche (ordinateur), la
 * page courante à droite. La session est imposée ici ; l'accès réservé à l'administrateur reste
 * vérifié par chaque page et chaque action (`requireAdmin()`), le menu ne fait que masquer.
 */
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[15.5rem_minmax(0,1fr)]">
        <SettingsNav isAdmin={user.role === "ADMIN"} />
        <div className="min-w-0 max-w-3xl">{children}</div>
      </div>
    </div>
  );
}
