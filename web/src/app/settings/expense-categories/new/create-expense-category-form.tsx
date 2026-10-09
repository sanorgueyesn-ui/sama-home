"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExpenseCategory } from "@/app/actions/expense-categories";

/**
 * Bloc 16.3, section 9 — position calculée côté serveur uniquement
 * (createExpenseCategory ne reçoit que le nom) ; jamais recalculée ici.
 * Appelle directement l'action existante du Bloc 16.2, aucune validation
 * métier dupliquée (doublon, longueur, etc. restent une décision serveur —
 * ce formulaire ne fait que relayer l'erreur retournée).
 */
export function CreateExpenseCategoryForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError("Le nom est obligatoire.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createExpenseCategory(trimmed);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/settings/expense-categories?done=created");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="name" className="mb-1.5 block text-xs font-bold text-fg">
          Nom
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex. Électricité"
          className="h-12 w-full rounded-xl border border-border/15 bg-surface px-4 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
        />
        {error ? <p className="mt-1 text-xs font-medium text-danger">{error}</p> : null}
      </div>

      <div className="mt-1 flex gap-3">
        <button
          type="button"
          onClick={() => router.push("/settings/expense-categories")}
          disabled={pending}
          className="h-14 flex-1 rounded-2xl border border-border/15 text-base font-extrabold text-fg disabled:opacity-40"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={pending}
          className="h-14 flex-1 rounded-2xl bg-brand-orange text-base font-extrabold tracking-wide text-ink disabled:opacity-40"
        >
          {pending ? "..." : "Créer"}
        </button>
      </div>
    </form>
  );
}
