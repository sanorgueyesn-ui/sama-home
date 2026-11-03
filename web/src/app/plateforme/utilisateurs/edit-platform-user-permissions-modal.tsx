"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePlatformUserPermissions } from "@/app/actions/platform-settings";
import { AccessPicker } from "./access-picker";
import { AlertCircleIcon, CheckIcon, CloseIcon, KeyIcon } from "@/components/ui/icons";

export function EditPlatformUserPermissionsModal({
  userId,
  userName,
  userLogin,
  currentPermissions,
  actorPermissions,
}: {
  userId: string;
  userName: string;
  userLogin: string;
  currentPermissions: string | null;
  actorPermissions: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    formData.set("userId", userId);

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
        <KeyIcon className="h-4 w-4" aria-hidden />
        <span>Gérer les droits</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#0e1a22] p-5 shadow-2xl sm:p-7 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/20 text-lg text-brand-orange font-black">
                  <KeyIcon className="h-5 w-5" aria-hidden />
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
                <CloseIcon className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
              <AccessPicker initialStored={currentPermissions} actorPermissions={actorPermissions} />

              {error ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-bold text-rose-300">
                  <AlertCircleIcon className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden /> {error}
                </div>
              ) : null}

              {success ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <CheckIcon className="h-3.5 w-3.5" aria-hidden />
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
                  {pending ? "Enregistrement..." : "Enregistrer les droits"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
