"use client";

import { useState, useTransition } from "react";
import { updateAdminPassword } from "@/app/actions/platform-settings";

export function AdminPasswordForm({
  currentUsername,
  currentName,
}: {
  currentUsername: string;
  currentName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateAdminPassword(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        // Clear input values
        const form = document.getElementById("admin-password-form") as HTMLFormElement | null;
        form?.reset();
      }
    });
  }

  return (
    <form
      id="admin-password-form"
      action={handleSubmit}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-3.5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Compte connecté</span>
          <p className="text-sm font-extrabold text-white">{currentName}</p>
        </div>
        <div className="rounded-xl border border-brand-orange/30 bg-brand-orange/10 px-3 py-1 text-xs font-black text-brand-orange">
          Identifiant : {currentUsername}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div>
          <label htmlFor="newPassword" className="mb-1.5 block text-xs font-bold text-white">
            Nouveau mot de passe <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <input
              id="newPassword"
              name="newPassword"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              placeholder="Minimum 8 caractères"
              className="h-12 w-full rounded-xl border border-white/10 bg-surface px-3.5 text-sm font-bold text-white outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/50 hover:text-white"
            >
              {showPassword ? "Masquer" : "Afficher"}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1.5 block text-xs font-bold text-white">
            Confirmer le mot de passe <span className="text-rose-400">*</span>
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            placeholder="Retapez le mot de passe"
            className="h-12 w-full rounded-xl border border-white/10 bg-surface px-3.5 text-sm font-bold text-white outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-bold text-rose-300">
          ⚠️ {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-400 flex items-center gap-2">
          <span>✓</span>
          <span>Votre mot de passe administrateur a été modifié avec succès ! Utilisez ce mot de passe pour vos prochaines connexions.</span>
        </div>
      ) : null}

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full sm:w-auto items-center justify-center rounded-xl bg-brand-orange px-6 text-xs sm:text-sm font-black text-ink shadow-md hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
        >
          {pending ? "Enregistrement en cours..." : "Enregistrer mon nouveau mot de passe"}
        </button>
      </div>
    </form>
  );
}
