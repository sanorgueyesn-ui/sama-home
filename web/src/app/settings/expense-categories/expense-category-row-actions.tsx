"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  renameExpenseCategory,
  activateExpenseCategory,
  deactivateExpenseCategory,
  deleteExpenseCategory,
} from "@/app/actions/expense-categories";

type Mode = "idle" | "rename" | "deactivate" | "delete";

const textareaClass =
  "min-h-20 w-full resize-none rounded-xl border border-navy/15 bg-paper px-3 py-2 text-sm text-navy outline-none focus:border-navy";
const inputClass =
  "h-11 w-full rounded-xl border border-navy/15 bg-paper px-3 text-sm text-navy outline-none focus:border-navy";

/**
 * Bloc 16.3 — un seul composant par ligne pour renommer/activer/désactiver/
 * supprimer, même structure que TariffRowActions (src/app/logements/[id]/
 * tariffs/tariff-row-actions.tsx), étendue pour les deux actions qui
 * exigent une justification (texte libre, donc `confirm()` ne suffit pas —
 * repris du même principe d'affichage inline que check-in-button.tsx).
 * L'UI n'appelle que les actions serveur existantes du Bloc 16.2 — aucune
 * règle métier, aucun contrôle de doublon/justification/audit réimplémenté
 * ici ; le serveur reste la seule autorité, l'UI ne fait que relayer son
 * message d'erreur.
 */
export function ExpenseCategoryRowActions({
  id,
  name,
  active,
  usageCount,
}: {
  id: string;
  name: string;
  active: boolean;
  usageCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState(name);
  const [reason, setReason] = useState("");
  const nameFieldId = useId();
  const reasonFieldId = useId();

  function reset() {
    setMode("idle");
    setError(null);
    setNewName(name);
    setReason("");
  }

  function handleRename() {
    const trimmed = newName.trim();
    if (trimmed.length === 0) {
      setError("Le nom est obligatoire.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await renameExpenseCategory(id, trimmed);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMode("idle");
      router.refresh();
    });
  }

  function handleActivate() {
    if (!confirm(`Réactiver « ${name} » ? Elle redeviendra proposée pour les nouvelles dépenses.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await activateExpenseCategory(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDeactivate() {
    const trimmed = reason.trim();
    if (trimmed.length === 0) {
      setError("Une justification est obligatoire pour désactiver une catégorie.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deactivateExpenseCategory(id, trimmed);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMode("idle");
      router.refresh();
    });
  }

  function handleDelete() {
    const trimmed = reason.trim();
    if (trimmed.length === 0) {
      setError("Une justification est obligatoire pour supprimer une catégorie.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteExpenseCategory(id, trimmed);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMode("idle");
      router.refresh();
    });
  }

  if (mode === "rename") {
    return (
      <div className="flex w-full flex-col gap-2 py-1">
        <label htmlFor={nameFieldId} className="text-xs font-bold text-navy">
          Nom
        </label>
        <input
          id={nameFieldId}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className={inputClass}
        />
        {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            disabled={pending}
            className="h-10 flex-1 rounded-xl border border-navy/15 text-xs font-extrabold text-navy disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleRename}
            disabled={pending}
            className="h-10 flex-1 rounded-xl bg-navy text-xs font-extrabold text-white disabled:opacity-60"
          >
            {pending ? "..." : "Enregistrer"}
          </button>
        </div>
      </div>
    );
  }

  if (mode === "deactivate") {
    return (
      <div className="flex w-full flex-col gap-2 py-1">
        <p className="text-xs font-medium text-navy/70">
          Cette catégorie ne pourra plus être utilisée pour les nouvelles dépenses. Les dépenses existantes seront
          conservées.
        </p>
        <label htmlFor={reasonFieldId} className="text-xs font-bold text-navy">
          Motif
        </label>
        <textarea
          id={reasonFieldId}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex. Catégorie remplacée par une autre."
          className={textareaClass}
        />
        {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            disabled={pending}
            className="h-10 flex-1 rounded-xl border border-navy/15 text-xs font-extrabold text-navy disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleDeactivate}
            disabled={pending}
            className="h-10 flex-1 rounded-xl bg-navy text-xs font-extrabold text-white disabled:opacity-60"
          >
            {pending ? "..." : "Désactiver"}
          </button>
        </div>
      </div>
    );
  }

  if (mode === "delete") {
    return (
      <div className="flex w-full flex-col gap-2 py-1">
        <p className="text-xs font-medium text-navy/70">
          La suppression est définitive. Si cette catégorie est déjà utilisée par une dépense, elle ne pourra pas
          être supprimée.
        </p>
        <label htmlFor={reasonFieldId} className="text-xs font-bold text-navy">
          Motif de suppression
        </label>
        <textarea
          id={reasonFieldId}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex. Catégorie créée par erreur."
          className={textareaClass}
        />
        {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            disabled={pending}
            className="h-10 flex-1 rounded-xl border border-navy/15 text-xs font-extrabold text-navy disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="h-10 flex-1 rounded-xl bg-danger text-xs font-extrabold text-white disabled:opacity-60"
          >
            {pending ? "..." : "Supprimer"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-1.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setNewName(name);
            setMode("rename");
          }}
          className="h-8 rounded-lg border border-navy/15 px-2.5 text-[11px] font-bold text-navy disabled:opacity-60"
        >
          Renommer
        </button>
        {active ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setMode("deactivate")}
            className="h-8 rounded-lg bg-paper px-2.5 text-[11px] font-bold text-navy/70 disabled:opacity-60"
          >
            Désactiver
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={handleActivate}
            className="h-8 rounded-lg bg-success-bg px-2.5 text-[11px] font-bold text-success disabled:opacity-60"
          >
            {pending ? "..." : "Activer"}
          </button>
        )}
        {usageCount === 0 ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setMode("delete")}
            className="h-8 rounded-lg bg-danger-bg px-2.5 text-[11px] font-bold text-danger disabled:opacity-60"
          >
            Supprimer
          </button>
        ) : null}
      </div>
      {error ? <p className="max-w-48 text-right text-[10.5px] font-medium text-danger">{error}</p> : null}
    </div>
  );
}
