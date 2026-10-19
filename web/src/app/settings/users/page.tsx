import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/dal";
import { listUsers } from "@/lib/users-data";
import { parseUserPermissions } from "@/lib/permissions";
import { CrownIcon, ShieldIcon, KeyIcon } from "@/components/ui/icons";
import { DeleteEstablishmentUserButton } from "./delete-user-button";

const ROLE_LABELS: Record<string, string> = { ADMIN: "Administrateur", GESTIONNAIRE: "Gestionnaire" };

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

export default async function UsersPage(props: PageProps<"/settings/users">) {
  // Bloc 11 — page-level server check, independent of the "Administration"
  // section being hidden in the UI for non-ADMIN users.
  const admin = await requireAdmin();
  const { created, updated, passwordReset } = await props.searchParams;

  const users = await listUsers();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pt-6 pb-10 md:max-w-none md:px-8 lg:px-10">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/settings"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-fg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="flex-1 text-xl font-extrabold text-fg">Utilisateurs</h1>
        <Link
          href="/settings/users/new"
          className="flex h-10 items-center rounded-xl bg-brand-orange px-4 text-sm font-bold text-ink"
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {users.map((u) => (
          <Card key={u.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-extrabold text-fg">{u.name}</p>
                <p className="mt-0.5 text-xs font-semibold text-fg/60">
                  @{u.username} · {u.role ? ROLE_LABELS[u.role] ?? u.role : "Sans rôle"}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  {(() => {
                    const perms = parseUserPermissions(u.permissions);
                    if (u.role === "ADMIN" && (perms.length === 0 || perms.includes("ESTABLISHMENT_ALL"))) {
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          <CrownIcon className="h-3 w-3" />
                          <span>Pleins pouvoirs (Patron)</span>
                        </span>
                      );
                    }
                    if (perms.length === 0) {
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                          <ShieldIcon className="h-3 w-3" />
                          <span>Gestionnaire standard</span>
                        </span>
                      );
                    }
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                        <KeyIcon className="h-3 w-3" />
                        <span>Accès personnalisé ({perms.length} droit{perms.length > 1 ? "s" : ""})</span>
                      </span>
                    );
                  })()}
                </div>
              </div>
              <span className="text-[11px] font-medium text-fg/40">Depuis {fmtDate(u.createdAt)}</span>
            </div>
            <div className="mt-3 flex gap-2.5">
              <Link
                href={`/settings/users/${u.id}/edit`}
                className="flex h-10 flex-1 items-center justify-center rounded-xl border border-border/15 text-xs font-extrabold text-fg"
              >
                Modifier
              </Link>
              <Link
                href={`/settings/users/${u.id}/reset-password`}
                className="flex h-10 flex-1 items-center justify-center rounded-xl border border-border/15 text-xs font-extrabold text-fg"
              >
                Réinitialiser
              </Link>
              <DeleteEstablishmentUserButton
                userId={u.id}
                userName={u.name}
                userLogin={u.username}
                isCurrentAdmin={u.id === admin.id}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
