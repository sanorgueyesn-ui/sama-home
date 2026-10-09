"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTransferSchedule, deactivateTransferSchedule } from "@/app/actions/bank";
import type { TransferFrequency } from "@/generated/prisma/client";

const FREQUENCY_OPTIONS: { value: TransferFrequency; label: string }[] = [
  { value: "DAILY", label: "Quotidienne" },
  { value: "WEEKLY", label: "Hebdomadaire" },
  { value: "BIWEEKLY", label: "Bimensuelle" },
  { value: "MONTHLY", label: "Mensuelle" },
];

/** "2026-10-09T08:00:00.000Z" -> "2026-10-09T08:00" (valeur attendue par <input type="datetime-local">). */
function toDateTimeLocalValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Bloc H, sections 7/10/11 — un seul composant par ligne (même structure que
 * BankAccountRowActions/ExpenseCategoryRowActions). Appelle uniquement
 * `updateTransferSchedule`/`deactivateTransferSchedule` (gelés, Bloc 17.2) —
 * aucune règle de validation/audit réimplémentée ici. Pas de bouton
 * "Activer" : le moteur gelé n'expose aucune action de réactivation pour
 * `TransferSchedule` (même constat déjà fait pour `BankAccount` au Bloc F).
 */
export function TransferScheduleRowActions({
  id,
  bankAccountId,
  frequency,
  amountType,
  fixedAmount,
  percentage,
  nextRunAt,
  active,
  accounts,
}: {
  id: string;
  bankAccountId: string;
  frequency: TransferFrequency;
  amountType: "FIXED" | "PERCENTAGE";
  fixedAmount: number | null;
  percentage: number | null;
  nextRunAt: string;
  active: boolean;
  accounts: { id: string; label: string; bankName: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [editAccountId, setEditAccountId] = useState(bankAccountId);
  const [editFrequency, setEditFrequency] = useState<TransferFrequency>(frequency);
  const [editAmountType, setEditAmountType] = useState<"FIXED" | "PERCENTAGE">(amountType);
  const [editFixedAmount, setEditFixedAmount] = useState(fixedAmount !== null ? String(fixedAmount) : "");
  const [editPercentage, setEditPercentage] = useState(percentage !== null ? String(percentage) : "");
  const [editNextRunAt, setEditNextRunAt] = useState(toDateTimeLocalValue(nextRunAt));
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setEditing(false);
    setError(null);
    setEditAccountId(bankAccountId);
    setEditFrequency(frequency);
    setEditAmountType(amountType);
    setEditFixedAmount(fixedAmount !== null ? String(fixedAmount) : "");
    setEditPercentage(percentage !== null ? String(percentage) : "");
    setEditNextRunAt(toDateTimeLocalValue(nextRunAt));
  }

  function handleUpdate() {
    if (!editAccountId) {
      setError("Le compte bancaire est obligatoire.");
      return;
    }
    const parsedFixed = editAmountType === "FIXED" ? Number(editFixedAmount) : undefined;
    const parsedPercentage = editAmountType === "PERCENTAGE" ? Number(editPercentage) : undefined;
    if (editAmountType === "FIXED" && (!editFixedAmount.trim() || !Number.isInteger(parsedFixed) || parsedFixed! <= 0)) {
      setError("Le montant fixe doit être un nombre entier strictement positif.");
      return;
    }
    if (editAmountType === "PERCENTAGE" && (!editPercentage.trim() || !Number.isInteger(parsedPercentage) || parsedPercentage! <= 0 || parsedPercentage! > 100)) {
      setError("Le pourcentage doit être un nombre entier entre 1 et 100.");
      return;
    }
    if (!editNextRunAt) {
      setError("La prochaine génération est obligatoire.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateTransferSchedule(id, {
        bankAccountId: editAccountId,
        frequency: editFrequency,
        amountType: editAmountType,
        fixedAmount: parsedFixed,
        percentage: parsedPercentage,
        nextRunAt: new Date(editNextRunAt),
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
    if (!confirm("Désactiver cette programmation ? Elle ne générera plus de nouveaux virements.")) return;
    setError(null);
    startTransition(async () => {
      const result = await deactivateTransferSchedule(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (editing) {
    // L'édition n'offre que les comptes ACTIFS (même règle qu'à la
    // création) — si le compte actuel de la programmation a été désactivé
    // depuis, il n'apparaît pas dans la liste : `updateTransferSchedule`
    // (gelé) refuse de toute façon tout compte inactif, modifié ou non.
    const accountStillActive = accounts.some((a) => a.id === editAccountId);
    return (
      <div className="flex flex-col gap-2.5 py-1">
        <div>
          <label htmlFor={`account-${id}`} className="mb-1 block text-xs font-bold text-fg">
            Compte bancaire
          </label>
          <select
            id={`account-${id}`}
            value={accountStillActive ? editAccountId : ""}
            onChange={(e) => setEditAccountId(e.target.value)}
            className="h-10 w-full rounded-lg border border-border/15 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
          >
            <option value="">Sélectionner un compte...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label} · {a.bankName}
              </option>
            ))}
          </select>
          {!accountStillActive ? (
            <p className="mt-1 text-[11px] font-medium text-warning">
              Le compte actuel a été désactivé — choisissez un compte actif pour enregistrer.
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={`frequency-${id}`} className="mb-1 block text-xs font-bold text-fg">
            Fréquence
          </label>
          <select
            id={`frequency-${id}`}
            value={editFrequency}
            onChange={(e) => setEditFrequency(e.target.value as TransferFrequency)}
            className="h-10 w-full rounded-lg border border-border/15 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
          >
            {FREQUENCY_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-fg">Type de montant</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditAmountType("FIXED")}
              aria-pressed={editAmountType === "FIXED"}
              className={`h-10 flex-1 rounded-lg border text-xs font-extrabold ${editAmountType === "FIXED" ? "border-navy bg-navy text-white" : "border-border/15 text-fg"}`}
            >
              Montant fixe
            </button>
            <button
              type="button"
              onClick={() => setEditAmountType("PERCENTAGE")}
              aria-pressed={editAmountType === "PERCENTAGE"}
              className={`h-10 flex-1 rounded-lg border text-xs font-extrabold ${editAmountType === "PERCENTAGE" ? "border-navy bg-navy text-white" : "border-border/15 text-fg"}`}
            >
              Pourcentage
            </button>
          </div>
        </div>

        {editAmountType === "FIXED" ? (
          <div>
            <label htmlFor={`fixed-${id}`} className="mb-1 block text-xs font-bold text-fg">
              Montant (FCFA)
            </label>
            <input
              id={`fixed-${id}`}
              type="number"
              min={1}
              value={editFixedAmount}
              onChange={(e) => setEditFixedAmount(e.target.value)}
              className="h-10 w-full rounded-lg border border-border/15 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
            />
          </div>
        ) : (
          <div>
            <label htmlFor={`pct-${id}`} className="mb-1 block text-xs font-bold text-fg">
              Pourcentage (%)
            </label>
            <input
              id={`pct-${id}`}
              type="number"
              min={1}
              max={100}
              value={editPercentage}
              onChange={(e) => setEditPercentage(e.target.value)}
              className="h-10 w-full rounded-lg border border-border/15 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
            />
            <p className="mt-1 text-[11px] font-medium text-fg/40">
              Calculé sur le solde théorique disponible au moment de la génération, plafonné au disponible.
            </p>
          </div>
        )}

        <div>
          <label htmlFor={`next-${id}`} className="mb-1 block text-xs font-bold text-fg">
            Prochaine génération
          </label>
          <input
            id={`next-${id}`}
            type="datetime-local"
            value={editNextRunAt}
            onChange={(e) => setEditNextRunAt(e.target.value)}
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
      {error ? <p className="max-w-56 text-right text-[10.5px] font-medium text-danger">{error}</p> : null}
    </div>
  );
}
