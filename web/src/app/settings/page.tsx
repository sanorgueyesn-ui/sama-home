import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";
import { getCurrentUser } from "@/lib/dal";
import { getSettings } from "@/lib/settings-data";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#E7EAEE] py-3 last:border-0">
      <span className="text-[11px] font-bold text-navy/50">{label}</span>
      <span className="text-sm font-semibold text-navy">{value}</span>
    </div>
  );
}

export default async function SettingsPage(props: PageProps<"/settings">) {
  const { saved, passwordChanged } = await props.searchParams;
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-6 pb-10">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-navy"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="text-xl font-extrabold text-navy">Paramètres</h1>
      </div>

      {saved ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Modifications enregistrées.
        </p>
      ) : null}
      {passwordChanged ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Mot de passe modifié.
        </p>
      ) : null}

      {/* Informations générales */}
      <section>
        <h2 className="mb-2.5 text-sm font-extrabold text-navy">Informations générales</h2>
        {/* Bloc 17 — logo officiel affiché tel quel, non modifiable ici : voir
            le rapport Phase 11 pour la décision (aucune infrastructure
            d'upload de fichier n'existe dans le projet). */}
        <div className="mb-3 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_1px_2px_rgba(18,48,74,0.05),0_8px_20px_rgba(18,48,74,0.06)]">
          <Image
            src="/brand/Sama-Home-icone-Bleu-nuit.png"
            alt="SAMA HOME"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <p className="text-xs font-medium text-navy/50">
            Logo officiel SAMA HOME — non modifiable depuis cette page.
          </p>
        </div>
        <SettingsForm defaultValues={settings ?? undefined} />
      </section>

      {/* Compte */}
      <section className="mt-6">
        <h2 className="mb-2.5 text-sm font-extrabold text-navy">Compte</h2>
        <p className="mb-2 text-xs font-medium text-navy/50">
          Connecté en tant que {user.name} ({user.role}).
        </p>
        <Link
          href="/settings/password"
          className="flex h-12 items-center justify-center rounded-xl border border-navy/15 text-sm font-extrabold text-navy"
        >
          Modifier mon mot de passe
        </Link>
      </section>

      {/* Administration — visible uniquement pour ADMIN (Bloc 13). Rappel :
          ce simple masquage n'est PAS la protection — /settings/users,
          /settings/expense-categories, /settings/bank-accounts,
          /settings/transfer-schedules et chaque action associée revérifient
          le rôle côté serveur (requireAdmin(), voir src/lib/dal.ts,
          src/app/actions/users.ts, src/app/actions/expense-categories.ts,
          src/app/actions/bank.ts). */}
      {user.role === "ADMIN" ? (
        <section className="mt-6">
          <h2 className="mb-2.5 text-sm font-extrabold text-navy">Administration</h2>
          <div className="flex flex-col gap-2.5">
            <Link
              href="/settings/users"
              className="flex h-12 items-center justify-center rounded-xl border border-navy/15 text-sm font-extrabold text-navy"
            >
              Utilisateurs
            </Link>
            <Link
              href="/settings/expense-categories"
              className="flex h-12 items-center justify-center rounded-xl border border-navy/15 text-sm font-extrabold text-navy"
            >
              Catégories de dépenses
            </Link>
            <Link
              href="/settings/bank-accounts"
              className="flex h-12 items-center justify-center rounded-xl border border-navy/15 text-sm font-extrabold text-navy"
            >
              Comptes bancaires
            </Link>
            <Link
              href="/settings/transfer-schedules"
              className="flex h-12 items-center justify-center rounded-xl border border-navy/15 text-sm font-extrabold text-navy"
            >
              Virements programmés
            </Link>
          </div>
        </section>
      ) : null}

      {/* Configuration — liens vers les modules existants, rien recréé
          (Bloc 7/8). */}
      <section className="mt-6">
        <h2 className="mb-2.5 text-sm font-extrabold text-navy">Configuration</h2>
        <div className="flex flex-col gap-2.5">
          <Link
            href="/logements"
            className="flex h-12 items-center justify-center rounded-xl border border-navy/15 text-sm font-extrabold text-navy"
          >
            Gestion des logements
          </Link>
          <Link
            href="/logements"
            className="flex h-12 items-center justify-center rounded-xl border border-navy/15 text-sm font-extrabold text-navy"
          >
            Gestion des tarifs
          </Link>
          <p className="text-center text-[11px] font-medium text-navy/40">
            Les tarifs se gèrent depuis la fiche de chaque logement.
          </p>
        </div>
      </section>

      {/* Informations système — jamais de secret (Bloc 13). */}
      <section className="mt-6 mb-2">
        <h2 className="mb-2.5 text-sm font-extrabold text-navy">Informations système</h2>
        <Card className="px-4">
          <Row label="APPLICATION" value="SAMA HOME" />
          <Row label="VERSION" value="0.1.0" />
          <Row label="ENVIRONNEMENT" value={process.env.NODE_ENV ?? "development"} />
        </Card>
      </section>
    </div>
  );
}
