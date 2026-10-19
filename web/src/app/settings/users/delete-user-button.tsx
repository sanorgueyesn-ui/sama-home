"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteEstablishmentUser } from "@/app/actions/users";
import { AlertCircleIcon } from "@/components/ui/icons";

export function DeleteEstablishmentUserButton({
  userId,
  userName,
  userLogin,
  isCurrentAdmin,
}: {
  userId: string;
  userName: string;
  userLogin: string;
  isCurrentAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  if (isCurrentAdmin) {
    return null;
  }

  function handleDelete() {
    if (pending) return;
    setError(null);

    startTransition(async () => {
      const result = await deleteEstablishmentUser(userId);
      if (result.error) {
        setError(result.error);
      } else {
        setShowModal(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          setShowModal(true);
        }}
        title="Supprimer définitivement ce compte"
        className="flex h-10 items-center justify-center rounded-xl border border-danger/30 bg-danger/10 px-3 text-xs font-extrabold text-danger transition-colors hover:bg-danger/20"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-danger/40 bg-[#0e1a22] p-5 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-danger/20 text-danger font-bold">
                  <AlertCircleIcon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-white">Supprimer ce compte</h3>
                  <p className="text-xs text-white/50">Action irréversible</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <div className="rounded-2xl border border-danger/30 bg-danger/10 p-3.5 text-xs leading-relaxed text-white/80">
                Vous êtes sur le point de supprimer définitivement le compte de{" "}
                <strong className="text-white">« {userName} »</strong> ({userLogin}).
                <p className="mt-2 text-danger font-semibold">
                  Ce compte ainsi que son adresse e-mail quitteront complètement la plateforme.
                  Toutes les sessions seront révoquées et l&apos;utilisateur ne pourra plus réinitialiser de mot de passe ni se connecter.
                </p>
              </div>

              {error && (
                <p className="rounded-xl bg-danger/20 px-3 py-2 text-xs font-bold text-danger">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-white/70 hover:bg-white/10 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={handleDelete}
                  className="flex items-center justify-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-danger/30 transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {pending ? "Suppression en cours..." : "Confirmer la suppression"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
