"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePlatformUserPermissions } from "@/app/actions/platform-settings";
import { PLATFORM_PERMISSIONS, parseUserPermissions } from "@/lib/permissions";

export function EditPlatformUserPermissionsModal({
  userId,
  userName,
  userLogin,
  currentPermissions,
}: {
  userId: string;
  userName: string;
  userLogin: string;
  currentPermissions: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const initialPerms = parseUserPermissions(currentPermissions);
  const initialMode =
    !currentPermissions || initialPerms.length === 0 || initialPerms.includes("PLATFORM_ALL")
      ? "ALL"
      : "CUSTOM";

  const [permissionsMode, setPermissionsMode] = useState<"ALL" | "CUSTOM">(initialMode);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    initialMode === "CUSTOM" ? initialPerms : ["PLATFORM_ESTABLISHMENTS", "PLATFORM_USERS"]
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    formData.set("userId", userId);
    formData.set("permissionsMode", permissionsMode);

    startTransition(async () => {
      const result = await updatePlatformUserPermissions(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
          router.refresh();
        }, 1200);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setSuccess(false);
          setOpen(true);
        }}
        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-brand-orange hover:bg-brand-orange/15 transition-all cursor-pointer"
      >
        <span>🔑</span>
        <span>Gérer les accès</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#0e1a22] p-5 shadow-2xl sm:p-7 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/20 text-lg text-brand-orange font-black">
                  🔑
                </span>
                <div>
                  <h3 className="text-base font-black text-white">Modifier les accès de {userName}</h3>
                  <p className="text-xs text-white/50">Identifiant : @{userLogin}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-xs font-black uppercase tracking-wider text-brand-orange block mb-3">
                  Périmètre d&apos;autorisation
                </span>

                <div className="flex flex-col gap-2.5">
                  <label className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-surface p-3 cursor-pointer hover:border-brand-orange/40 transition-colors">
                    <input
                      type="radio"
                      name="permissionsMode"
                      value="ALL"
                      checked={permissionsMode === "ALL"}
                      onChange={() => setPermissionsMode("ALL")}
                      className="accent-brand-orange h-4 w-4"
                    />
                    <div>
                      <span className="text-xs font-extrabold text-white">👑 Pleins Pouvoirs (Super-Admin complet)</span>
                      <p className="text-[11px] text-white/50">Accès sans aucune restriction à l&apos;ensemble de la console.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-surface p-3 cursor-pointer hover:border-brand-orange/40 transition-colors">
                    <input
                      type="radio"
                      name="permissionsMode"
                      value="CUSTOM"
                      checked={permissionsMode === "CUSTOM"}
                      onChange={() => setPermissionsMode("CUSTOM")}
                      className="accent-brand-orange h-4 w-4"
                    />
                    <div>
                      <span className="text-xs font-extrabold text-white">🎯 Accès Restreint aux modules cochés</span>
                      <p className="text-[11px] text-white/50">Pour assistant, caisse ou frère : seules les pages cochées s&apos;affichent.</p>
                    </div>
                  </label>
                </div>

                {permissionsMode === "CUSTOM" && (
                  <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-3 animate-in fade-in duration-150">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-white/50 mr-1">Raccourcis :</span>
                      <button
                        type="button"
                        onClick={() => setSelectedPermissions(["PLATFORM_ESTABLISHMENTS", "PLATFORM_USERS"])}
                        className="rounded-lg bg-white/10 px-2 py-1 text-[10px] font-bold text-white hover:bg-brand-orange hover:text-ink transition-colors cursor-pointer"
                      >
                        🛎️ Assistant / Approbations
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPermissions(["PLATFORM_SUBSCRIPTIONS"])}
                        className="rounded-lg bg-white/10 px-2 py-1 text-[10px] font-bold text-white hover:bg-brand-orange hover:text-ink transition-colors cursor-pointer"
                      >
                        💳 Caisse / Abonnements
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPermissions(["PLATFORM_DASHBOARD", "PLATFORM_AUDIT"])}
                        className="rounded-lg bg-white/10 px-2 py-1 text-[10px] font-bold text-white hover:bg-brand-orange hover:text-ink transition-colors cursor-pointer"
                      >
                        📊 Statistiques &amp; Audit
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {PLATFORM_PERMISSIONS.map((perm) => {
                        const checked = selectedPermissions.includes(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-colors ${
                              checked
                                ? "border-brand-orange/40 bg-brand-orange/10"
                                : "border-white/5 bg-surface/50 opacity-70"
                            }`}
                          >
                            <input
                              type="checkbox"
                              name="permissions"
                              value={perm.id}
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPermissions((prev) => [...prev, perm.id]);
                                } else {
                                  setSelectedPermissions((prev) => prev.filter((p) => p !== perm.id));
                                }
                              }}
                              className="accent-brand-orange h-4 w-4 mt-0.5"
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-white block leading-snug">{perm.label}</span>
                              <p className="text-[10px] text-white/50 leading-tight mt-0.5">{perm.description}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {error ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-bold text-rose-300">
                  ⚠️ {error}
                </div>
              ) : null}

              {success ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <span>✓</span>
                  <span>Accès mis à jour avec succès !</span>
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-11 rounded-xl border border-white/10 bg-surface px-4 text-xs font-bold text-white/70 hover:bg-white/5 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="h-11 rounded-xl bg-brand-orange px-5 text-xs sm:text-sm font-black text-ink shadow-md hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {pending ? "Enregistrement..." : "Enregistrer les accès"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
