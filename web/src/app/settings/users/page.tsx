import Link from "next/link";
import { SettingsPageHeader } from "@/app/settings/settings-ui";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/dal";
import { listUsers } from "@/lib/users-data";
import { parseUserPermissions } from "@/lib/permissions";
import { CrownIcon, ShieldIcon, KeyIcon } from "@/components/ui/icons";
import { DeleteEstablishmentUserButton } from "./delete-user-button";
import { T } from "@/components/i18n/i18n-provider";
import { dateLocale } from "@/lib/i18n/date-locale";

const ROLE_LABELS: Record<string, string> = { ADMIN: "Administrateur", GESTIONNAIRE: "Gestionnaire" };

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat(dateLocale(), { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

export default async function UsersPage(props: PageProps<"/settings/users">) {
  // Bloc 11 — page-level server check, independent of the "Administration"
  // section being hidden in the UI for non-ADMIN users.
  const admin = await requireAdmin();
  const { created, updated, passwordReset } = await props.searchParams;

  const users = await listUsers();

  return (
    <>
      <SettingsPageHeader title="Utilisateurs" backHref={"/settings"} action={{ href: "/settings/users/new", label: "+ Nouvel" }} />

      {created ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          <T>Utilisateur créé.</T>
        </p>
      ) : null}
      {updated ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          <T>Modifications enregistrées.</T>
        </p>
      ) : null}
      {passwordReset ? (
        <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">
          <T>Mot de passe réinitialisé.</T>
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {users.map((u) => (
          <Card key={u.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-extrabold text-fg">{u.name}</p>
                <p className="mt-0.5 text-xs font-semibold text-fg/60">
                  @{u.username} · {u.role ? ROLE_LABELS[u.role] ?? u.role : <T>{"Sans rôle"}</T>}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  {(() => {
                    const perms = parseUserPermissions(u.permissions);
                    if (u.role === "ADMIN" && (perms.length === 0 || perms.includes("ESTABLISHMENT_ALL"))) {
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-app-good">
                          <CrownIcon className="h-3 w-3" />
                          <span><T>Pleins pouvoirs (Patron)</T></span>
                        </span>
                      );
                    }
                    if (perms.length === 0) {
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-info/15 px-2 py-0.5 text-[10px] font-bold text-app-sky">
                          <ShieldIcon className="h-3 w-3" />
                          <span><T>Gestionnaire standard</T></span>
                        </span>
                      );
                    }
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-app-warn">
                        <KeyIcon className="h-3 w-3" />
                        <span><T>Accès personnalisé (</T>{perms.length} droit{perms.length > 1 ? "s" : ""})</span>
                      </span>
                    );
                  })()}
                </div>
              </div>
              <span className="text-[11px] font-medium text-fg/40"><T>Depuis</T> {fmtDate(u.createdAt)}</span>
            </div>
            <div className="mt-3 flex gap-2.5">
              <Link
                href={`/settings/users/${u.id}/edit`}
                className="flex h-10 flex-1 items-center justify-center rounded-xl border border-border/15 text-xs font-extrabold text-fg"
              >
                <T>Modifier</T>
              </Link>
              <Link
                href={`/settings/users/${u.id}/reset-password`}
                className="flex h-10 flex-1 items-center justify-center rounded-xl border border-border/15 text-xs font-extrabold text-fg"
              >
                <T>Réinitialiser</T>
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
    </>
  );
}
