import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/dal";
import { listUsers } from "@/lib/users-data";

const ROLE_LABELS: Record<string, string> = { ADMIN: "Administrateur", GESTIONNAIRE: "Gestionnaire" };

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

export default async function UsersPage(props: PageProps<"/settings/users">) {
  // Bloc 11 — page-level server check, independent of the "Administration"
  // section being hidden in the UI for non-ADMIN users.
  await requireAdmin();
  const { created, updated, passwordReset } = await props.searchParams;

  const users = await listUsers();

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pt-6 pb-10">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/settings"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-navy"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="flex-1 text-xl font-extrabold text-navy">Utilisateurs</h1>
        <Link
          href="/settings/users/new"
          className="flex h-10 items-center rounded-xl bg-navy px-4 text-sm font-bold text-white"
        >
          + Nouvel
        </Link>
      </div>

      {created ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Utilisateur créé.
        </p>
      ) : null}
      {updated ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Modifications enregistrées.
        </p>
      ) : null}
      {passwordReset ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          Mot de passe réinitialisé.
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {users.map((u) => (
          <Card key={u.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-extrabold text-navy">{u.name}</p>
                <p className="mt-0.5 text-xs font-semibold text-navy/60">
                  @{u.username} · {ROLE_LABELS[u.role] ?? u.role}
                </p>
              </div>
              <span className="text-[11px] font-medium text-navy/40">Depuis {fmtDate(u.createdAt)}</span>
            </div>
            <div className="mt-3 flex gap-2.5">
              <Link
                href={`/settings/users/${u.id}/edit`}
                className="flex h-10 flex-1 items-center justify-center rounded-xl border border-navy/15 text-xs font-extrabold text-navy"
              >
                Modifier
              </Link>
              <Link
                href={`/settings/users/${u.id}/reset-password`}
                className="flex h-10 flex-1 items-center justify-center rounded-xl border border-navy/15 text-xs font-extrabold text-navy"
              >
                Réinitialiser le mot de passe
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
