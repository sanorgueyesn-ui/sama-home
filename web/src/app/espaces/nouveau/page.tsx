import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { canCreateSpace } from "@/lib/space-creation";
import { AddSpaceForm } from "./add-space-form";

export const metadata = { title: "Ajouter un espace — SAMA HOME" };

/**
 * Ajout d'un espace professionnel. Réservé à l'administrateur (même règle que l'action serveur,
 * qui reste le vrai garde) : tout autre compte est renvoyé au tableau de bord.
 */
export default async function NewSpacePage() {
  const user = await getCurrentUser();
  const spaceCount = await prisma.membership.count({ where: { userId: user.id } });
  const check = canCreateSpace({ isPlatformAdmin: user.isPlatformAdmin, role: user.role, currentSpaceCount: spaceCount });
  if (!check.allowed && user.role !== "ADMIN") redirect("/dashboard");

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-2xl font-black">Ajouter un espace professionnel</h1>
        <p className="mt-1 text-sm text-fg/70">
          Chaque espace a ses propres données, son mode et son abonnement. Les données de votre espace actuel ne sont ni
          copiées ni modifiées.
        </p>
      </header>
      {check.allowed ? (
        <AddSpaceForm />
      ) : (
        <p role="status" className="rounded-xl border border-fg/15 bg-surface-raised px-4 py-3 text-sm">
          {check.message}
        </p>
      )}
    </main>
  );
}
