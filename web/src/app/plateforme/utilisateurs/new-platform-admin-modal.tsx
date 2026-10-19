"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPlatformAdminUser } from "@/app/actions/platform-settings";
import { PLATFORM_PERMISSIONS } from "@/lib/permissions";

export function NewPlatformAdminModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [permissionsMode, setPermissionsMode] = useState<"ALL" | "CUSTOM">("ALL");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    "PLATFORM_ESTABLISHMENTS",
    "PLATFORM_USERS",
  ]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createPlatformAdminUser(formData);
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
        className="flex h-11 items-center gap-2 rounded-xl bg-brand-orange px-4 text-xs sm:text-sm font-black text-ink shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
      >
        <span>👑</span>
        <span>+ Nouvel Administrateur Plateforme</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#0e1a22] p-5 shadow-2xl sm:p-7 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/20 text-lg text-brand-orange font-black">
                  👑
                </span>
                <div>
                  <h3 className="text-base font-black text-white">Ajouter un administrateur plateforme</h3>
                  <p className="text-xs text-white/50">Assistant, frère ou co-gestionnaire avec pleins pouvoirs</p>
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
              <div className="rounded-2xl border border-brand-orange/20 bg-brand-orange/5 p-3.5 text-xs leading-relaxed text-white/80">
                Ce compte aura les droits <strong>Super-Admin</strong> : il pourra approuver/suspendre des résidences, gérer les abonnements et superviser toute la plateforme SAMA HOME.
              </div>

              <div>
                <label htmlFor="name" className="mb-1 block text-xs font-bold text-white">
                  Nom complet <span className="text-rose-400">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  placeholder="Ex : Moussa Gueye (Assistant)"
                  className="h-11 w-full rounded-xl border border-white/10 bg-surface px-3 text-sm font-bold text-white outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="username" className="mb-1 block text-xs font-bold text-white">
                    Identifiant de connexion <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="username"
                    name="username"
                    required
                    placeholder="Ex : assistant ou prenom"
                    className="h-11 w-full rounded-xl border border-white/10 bg-surface px-3 text-sm font-bold text-white outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="mb-1 block text-xs font-bold text-white">
                    Adresse e-mail <span className="text-white/40 font-normal">(optionnel)</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Ex : assistant@gmail.com"
                    className="h-11 w-full rounded-xl border border-white/10 bg-surface px-3 text-sm text-white outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="password" className="mb-1 block text-xs font-bold text-white">
                    Mot de passe initial <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      placeholder="8 caractères min"
                      className="h-11 w-full rounded-xl border border-white/10 bg-surface px-3 text-sm font-bold text-white outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-white/50 hover:text-white"
                    >
                      {showPassword ? "Masquer" : "Voir"}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="mb-1 block text-xs font-bold text-white">
                    Confirmer le mot de passe <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="Retapez le mot de passe"
                    className="h-11 w-full rounded-xl border border-white/10 bg-surface px-3 text-sm font-bold text-white outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                  />
                </div>
              </div>

              {/* Sélecteur de Permissions & Limites d'accès */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-brand-orange">
                    Niveau d&apos;accès &amp; Permissions
                  </span>
                  <span className="text-[11px] text-white/50">Limitez ce que ce collaborateur peut voir</span>
                </div>

                <div className="mt-3 flex flex-col gap-2.5">
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
                      <p className="text-[11px] text-white/50">Accès illimité à tous les modules, approbations, abonnements et réglages.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-surface p-3 cursor-pointer hover:border-brand-orange/40 transition-colors">
                    <input
                      type="radio"
                      name="permissionsMode"
                      value="CUSTOM"
                      checked={permissionsMode === "CUSTOM"}
                      onChange={() => {
                        setPermissionsMode("CUSTOM");
                        if (selectedPermissions.length === 0) {
                          setSelectedPermissions(["PLATFORM_ESTABLISHMENTS", "PLATFORM_USERS"]);
                        }
                      }}
                      className="accent-brand-orange h-4 w-4"
                    />
                    <div>
                      <span className="text-xs font-extrabold text-white">🎯 Accès Restreint &amp; Limité aux pages cochées</span>
                      <p className="text-[11px] text-white/50">Pour assistante, caisse ou frère : ils ne verront que les pages autorisées.</p>
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
                  <span>Compte administrateur créé avec succès !</span>
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
                  {pending ? "Création en cours..." : "Créer le compte Super-Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
