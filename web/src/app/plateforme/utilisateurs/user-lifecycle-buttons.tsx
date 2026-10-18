"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePlatformUser } from "@/app/actions/establishment-approval";

export function UserLifecycleButtons({
  userId,
  userName,
  userLogin,
  isPlatformAdmin,
}: {
  userId: string;
  userName: string;
  userLogin: string;
  isPlatformAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");

  if (isPlatformAdmin) {
    return null; // On ne peut pas supprimer un compte plateforme principal
  }

  function handleDeleteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);

    if (!adminPassword.trim()) {
      setError("Veuillez saisir votre mot de passe administrateur.");
      return;
    }

    startTransition(async () => {
      const result = await deletePlatformUser(userId, adminPassword.trim());
      if (result.error) {
        setError(result.error);
      } else {
        setShowDeleteModal(false);
        setAdminPassword("");
      }
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          setAdminPassword("");
          setShowDeleteModal(true);
        }}
        title="Supprimer définitivement ce compte"
        className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white/50 transition-colors hover:border-danger/40 hover:bg-danger/15 hover:text-danger sm:w-auto"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
        <span>Supprimer le compte</span>
      </button>

      {/* Modal centré sur mobile et bureau */}
      {showDeleteModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-danger/40 bg-[#0e1a22] p-5 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-danger/20 text-danger font-bold">
                  ⚠️
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-white">Supprimer ce compte</h3>
                  <p className="text-xs text-white/50">Action irréversible</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-xl p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDeleteSubmit} className="mt-4 flex flex-col gap-4">
              <div className="rounded-2xl border border-danger/30 bg-danger/10 p-3.5 text-xs leading-relaxed text-white/80">
                Vous êtes sur le point de supprimer le compte de{" "}
                <strong className="text-white">« {userName} »</strong> ({userLogin}).
                <p className="mt-1 text-[11px] text-danger font-semibold">
                  L&apos;utilisateur ne pourra plus se connecter et ses sessions seront révoquées immédiatement.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                  Mot de passe Administrateur
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Saisissez votre mot de passe pour autoriser"
                  className="mt-1.5 h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3.5 text-sm text-white placeholder-white/30 outline-none focus:border-danger focus:ring-1 focus:ring-danger"
                />
              </div>

              {error ? (
                <div className="rounded-xl bg-danger-bg px-3 py-2 text-xs font-semibold text-danger">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setShowDeleteModal(false)}
                  className="h-10 w-full rounded-xl border border-white/15 px-4 text-xs font-bold text-white/70 hover:bg-white/10 sm:w-auto"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={pending || !adminPassword.trim()}
                  className="h-10 w-full rounded-xl bg-danger px-4 text-xs font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
                >
                  {pending ? "Suppression en cours..." : "Confirmer la suppression"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
