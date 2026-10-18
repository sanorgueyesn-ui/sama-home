"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBankAccount, deactivateBankAccount } from "@/app/actions/bank";

/**
 * Bloc F — un seul composant par ligne, même structure que
 * ExpenseCategoryRowActions (Bloc 16.3) et TariffRowActions. Appelle
 * uniquement `updateBankAccount`/`deactivateBankAccount` (Bloc 17.2, gelés)
 * — aucune règle de validation/doublon/audit réimplémentée ici. Pas de
 * bouton "Activer" : le moteur gelé n'expose aucune action de
 * réactivation pour `BankAccount` (seules create/update/deactivate
 * existent) et ce bloc ne demande pas d'en ajouter une.
 */
export function BankAccountRowActions({
  id,
  label,
  bankName,
  maskedAccountNumber,
  active,
}: {
  id: string;
  label: string;
  bankName: string;
  maskedAccountNumber: string | null;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);
  const [editBankName, setEditBankName] = useState(bankName);
  const [editMasked, setEditMasked] = useState(maskedAccountNumber ?? "");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  function reset() {
    setEditing(false);
    setError(null);
    setEditLabel(label);
    setEditBankName(bankName);
    setEditMasked(maskedAccountNumber ?? "");
  }

  function handleUpdate() {
    if (!editLabel.trim() || !editBankName.trim()) {
      setError("Le libellé et la banque sont obligatoires.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateBankAccount(id, {
        label: editLabel.trim(),
        bankName: editBankName.trim(),
        maskedAccountNumber: editMasked.trim() || undefined,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.errors) {
        const first = Object.values(result.errors)[0]?.[0];
        setError(first ?? "Données invalides.");
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function handleDeactivate() {
    if (!confirm(`Désactiver « ${label} » ? Il ne pourra plus être utilisé pour de nouveaux versements.`)) return;
    setError(null);
    setWarning(null);
    startTransition(async () => {
      const result = await deactivateBankAccount(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      // Phase 3G / Lot D12-P42 — avertissement informatif (pas une erreur) :
      // le compte a bien été désactivé, mais des programmations actives le
      // référencent encore. Conservé localement après le router.refresh()
      // (ce composant client n'est pas démonté par un rafraîchissement de
      // données serveur), jamais perdu silencieusement.
      if (result.warning) {
        setWarning(result.warning);
      }
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="flex w-full flex-col gap-2 py-1">
        <div>
          <label htmlFor={`label-${id}`} className="mb-1 block text-xs font-bold text-fg">
            Libellé
          </label>
          <input
            id={`label-${id}`}
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            className="h-10 w-full rounded-lg border border-border/15 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
          />
        </div>
        <div>
          <label htmlFor={`bank-${id}`} className="mb-1 block text-xs font-bold text-fg">
            Banque
          </label>
          <input
            id={`bank-${id}`}
            type="text"
            value={editBankName}
            onChange={(e) => setEditBankName(e.target.value)}
            className="h-10 w-full rounded-lg border border-border/15 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
          />
        </div>
        <div>
          <label htmlFor={`masked-${id}`} className="mb-1 block text-xs font-bold text-fg">
            Numéro masqué <span className="font-medium text-fg/40">(optionnel)</span>
          </label>
          <input
            id={`masked-${id}`}
            type="text"
            value={editMasked}
            onChange={(e) => setEditMasked(e.target.value)}
            placeholder="Ex. •••• 4821"
            className="h-10 w-full rounded-lg border border-border/15 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
          />
        </div>
        {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            disabled={pending}
            className="h-10 flex-1 rounded-xl border border-border/15 text-xs font-extrabold text-fg disabled:opacity-60"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            disabled={pending}
            className="h-10 flex-1 rounded-xl bg-brand-orange text-xs font-extrabold text-ink disabled:opacity-60"
          >
            {pending ? "..." : "Enregistrer"}
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
          onClick={() => setEditing(true)}
          className="h-8 rounded-lg border border-border/15 px-2.5 text-[11px] font-bold text-fg disabled:opacity-60"
        >
          Modifier
        </button>
        {active ? (
          <button
            type="button"
            disabled={pending}
            onClick={handleDeactivate}
            className="h-8 rounded-lg bg-danger-bg px-2.5 text-[11px] font-bold text-danger disabled:opacity-60"
          >
            Désactiver
          </button>
        ) : null}
      </div>
      {error ? <p className="max-w-48 text-right text-[10.5px] font-medium text-danger">{error}</p> : null}
      {warning ? <p className="max-w-48 text-right text-[10.5px] font-medium text-warning">{warning}</p> : null}
    </div>
  );
}
