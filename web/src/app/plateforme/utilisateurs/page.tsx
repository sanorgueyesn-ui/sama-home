import { listPlatformUsers, type PlatformUserView } from "@/lib/platform-users-data";
import { ROLE_LABELS, ESTABLISHMENT_STATUS_LABELS } from "./filter-labels";
import { PlatformUserFilterBar } from "./filter-bar";

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(d);
}
function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Phase 3G / Lot D12-P101 — une ligne de la liste. Le compte `platform-admin`
 * (`isPlatformAdmin: true`) affiche toujours "Compte de plateforme" —
 * jamais une tentative de lui attribuer un rôle ou un établissement (il n'en
 * a structurellement aucun, voir schema.prisma, modèle User). Aucune donnée
 * inventée : un champ absent (email, établissement) est affiché comme tel,
 * jamais masqué silencieusement ni remplacé par une valeur plausible.
 */
function UserRow({ user }: { user: PlatformUserView }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-extrabold text-white">{user.name}</p>
          {user.isPlatformAdmin ? (
            <span className="rounded-full bg-brand-orange/20 px-2 py-0.5 text-[10px] font-bold text-brand-orange">
              Compte de plateforme
            </span>
          ) : user.role ? (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/60">
              {ROLE_LABELS[user.role]}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-[11px] font-medium text-white/50">Identifiant : {user.username}</p>
        {user.email ? <p className="mt-0.5 text-[11px] font-medium text-white/50">{user.email}</p> : null}

        {user.isPlatformAdmin ? null : user.establishmentName ? (
          <p className="mt-1 text-sm font-semibold text-white/90">
            {user.establishmentName}
            {user.establishmentStatus ? (
              <span className="ml-1.5 text-[11px] font-bold text-white/50">
                ({ESTABLISHMENT_STATUS_LABELS[user.establishmentStatus]})
              </span>
            ) : null}
          </p>
        ) : (
          <p className="mt-1 text-sm font-semibold text-white/40">Aucun établissement associé</p>
        )}

        <p className="mt-1 text-[11px] font-medium text-white/40">Créé le {fmtDate(user.createdAt)}</p>
        <p className="mt-0.5 text-[11px] font-medium text-white/30">
          {user.mostRecentSessionCreatedAt
            ? `Dernière session ouverte le ${fmtDateTime(user.mostRecentSessionCreatedAt)} (indicateur de session, pas une date de dernière connexion certaine)`
            : "Aucune session enregistrée"}
        </p>
      </div>
    </div>
  );
}

export default async function PlatformUsersPage(props: PageProps<"/plateforme/utilisateurs">) {
  const { role, status, platform, q } = await props.searchParams;
  const roleParam = typeof role === "string" ? role : "ALL";
  const statusParam = typeof status === "string" ? status : "ALL";
  const platformOnly = platform === "1";
  const query = typeof q === "string" ? q : "";

  let items: PlatformUserView[] = [];
  let truncated = false;
  let loadError: string | null = null;
  try {
    const result = await listPlatformUsers({
      roleFilter: roleParam,
      establishmentStatusFilter: statusParam,
      platformAccountsOnly: platformOnly,
      query,
    });
    items = result.items;
    truncated = result.truncated;
  } catch (error) {
    // D12-P172 — même correction que PlatformDashboardPage() : ne jamais
    // avaler le signal interne redirect() de Next.js (digest "NEXT_REDIRECT").
    if (error && typeof error === "object" && "digest" in error && typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("PlatformUsersPage() — échec du chargement :", error);
    loadError = "Impossible de charger les utilisateurs pour le moment. Rechargez la page pour réessayer.";
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pt-6 pb-10 md:max-w-none md:px-8 lg:px-10">
      <h1 className="text-2xl font-extrabold text-white">Utilisateurs</h1>
      <p className="mt-1 text-xs font-medium text-white/50">
        Consultation globale des comptes de la plateforme — lecture seule.
      </p>

      <div className="mt-4">
        <PlatformUserFilterBar
          defaultRole={roleParam as "ADMIN" | "GESTIONNAIRE" | "ALL"}
          defaultStatus={statusParam as "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED" | "ALL"}
          defaultPlatformOnly={platformOnly}
          defaultQuery={query}
        />
      </div>

      {loadError ? (
        <p className="mt-5 rounded-xl bg-danger-bg px-4 py-3 text-sm font-bold text-danger">{loadError}</p>
      ) : items.length === 0 ? (
        <p className="mt-5 text-sm font-semibold text-white/70">
          {query || roleParam !== "ALL" || statusParam !== "ALL" || platformOnly
            ? "Aucun utilisateur ne correspond à ces critères."
            : "Aucun utilisateur."}
        </p>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {items.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
          {truncated && (
            <p className="pt-1 text-center text-xs font-medium text-white/50">
              Affinez votre recherche pour voir plus de résultats.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
