import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { logout } from "@/app/actions/auth";

export default async function Home() {
  // Server-side, database-backed check — see src/lib/dal.ts. Redirects to
  // /login on its own if there is no valid session.
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <Image
        src="/brand/Sama-Home-icone-Bleu-nuit.png"
        alt="SAMA HOME"
        width={72}
        height={72}
        priority
        className="rounded-2xl shadow-sm"
      />
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-navy">
          SAMA HOME
        </h1>
        <p className="mt-1 text-sm font-medium text-navy/60">
          Connecté en tant que {user.name} ({user.role}).
        </p>
        <p className="mt-1 text-xs font-medium text-navy/40">
          Fondations + authentification en place — écrans à venir par phase.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/clients"
          className="h-11 rounded-xl bg-navy px-5 text-sm font-bold text-white flex items-center"
        >
          Clients
        </Link>
        <Link
          href="/logements"
          className="h-11 rounded-xl bg-navy px-5 text-sm font-bold text-white flex items-center"
        >
          Logements
        </Link>
        <Link
          href="/reservations"
          className="h-11 rounded-xl bg-navy px-5 text-sm font-bold text-white flex items-center"
        >
          Réservations
        </Link>
        <Link
          href="/locations"
          className="h-11 rounded-xl bg-navy px-5 text-sm font-bold text-white flex items-center"
        >
          Locations
        </Link>
        <Link
          href="/depenses"
          className="h-11 rounded-xl bg-navy px-5 text-sm font-bold text-white flex items-center"
        >
          Dépenses
        </Link>
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="h-11 rounded-xl border border-navy/15 px-5 text-sm font-bold text-navy"
        >
          Déconnexion
        </button>
      </form>
    </div>
  );
}
