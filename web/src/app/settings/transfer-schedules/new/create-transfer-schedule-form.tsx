"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTransferSchedule } from "@/app/actions/bank";
import type { TransferFrequency } from "@/generated/prisma/client";

const FREQUENCY_OPTIONS: { value: TransferFrequency; label: string }[] = [
  { value: "DAILY", label: "Quotidienne" },
  { value: "WEEKLY", label: "Hebdomadaire" },
  { value: "BIWEEKLY", label: "Bimensuelle" },
  { value: "MONTHLY", label: "Mensuelle" },
];

/**
 * Bloc H, sections 8/9 — appelle directement l'action existante
 * (createTransferSchedule, gelée), aucune validation métier dupliquée.
 * Nouvelle programmation toujours créée active (le moteur gelé ne propose
 * pas de champ "statut" à la création — voir section 8 : "ne pas créer de
 * nouvelle action serveur uniquement pour ce champ").
 */
export function CreateTransferScheduleForm({ accounts }: { accounts: { id: string; label: string; bankName: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [bankAccountId, setBankAccountId] = useState("");
  const [frequency, setFrequency] = useState<TransferFrequency>("WEEKLY");
  const [amountType, setAmountType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [fixedAmount, setFixedAmount] = useState("");
  const [percentage, setPercentage] = useState("");
  const [nextRunAt, setNextRunAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bankAccountId) {
      setError("Le compte bancaire est obligatoire.");
      return;
    }
    const parsedFixed = amountType === "FIXED" ? Number(fixedAmount) : undefined;
    const parsedPercentage = amountType === "PERCENTAGE" ? Number(percentage) : undefined;
    if (amountType === "FIXED" && (!fixedAmount.trim() || !Number.isInteger(parsedFixed) || parsedFixed! <= 0)) {
      setError("Le montant fixe doit être un nombre entier strictement positif.");
      return;
    }
    if (amountType === "PERCENTAGE" && (!percentage.trim() || !Number.isInteger(parsedPercentage) || parsedPercentage! <= 0 || parsedPercentage! > 100)) {
      setError("Le pourcentage doit être un nombre entier entre 1 et 100.");
      return;
    }
    if (!nextRunAt) {
      setError("La prochaine génération est obligatoire.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createTransferSchedule({
        bankAccountId,
        frequency,
        amountType,
        fixedAmount: parsedFixed,
        percentage: parsedPercentage,
        nextRunAt: new Date(nextRunAt),
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
      router.push("/settings/transfer-schedules?done=created");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="bankAccountId" className="mb-1.5 block text-xs font-bold text-fg">
          Compte bancaire
        </label>
        <select
          id="bankAccountId"
          value={bankAccountId}
          onChange={(e) => setBankAccountId(e.target.value)}
          className="h-12 w-full rounded-xl border border-border/15 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
        >
          <option value="">Sélectionner un compte...</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label} · {a.bankName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="frequency" className="mb-1.5 block text-xs font-bold text-fg">
          Fréquence
        </label>
        <select
          id="frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as TransferFrequency)}
          className="h-12 w-full rounded-xl border border-border/15 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
        >
          {FREQUENCY_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold text-fg">Type de montant</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAmountType("FIXED")}
            aria-pressed={amountType === "FIXED"}
            className={`h-12 flex-1 rounded-xl border text-sm font-extrabold ${amountType === "FIXED" ? "border-navy bg-navy text-white" : "border-border/15 text-fg"}`}
          >
            Montant fixe
          </button>
          <button
            type="button"
            onClick={() => setAmountType("PERCENTAGE")}
            aria-pressed={amountType === "PERCENTAGE"}
            className={`h-12 flex-1 rounded-xl border text-sm font-extrabold ${amountType === "PERCENTAGE" ? "border-navy bg-navy text-white" : "border-border/15 text-fg"}`}
          >
            Pourcentage
          </button>
        </div>
      </div>

      {amountType === "FIXED" ? (
        <div>
          <label htmlFor="fixedAmount" className="mb-1.5 block text-xs font-bold text-fg">
            Montant (FCFA)
          </label>
          <input
            id="fixedAmount"
            type="number"
            min={1}
            value={fixedAmount}
            onChange={(e) => setFixedAmount(e.target.value)}
            className="h-12 w-full rounded-xl border border-border/15 bg-surface px-4 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
          />
        </div>
      ) : (
        <div>
          <label htmlFor="percentage" className="mb-1.5 block text-xs font-bold text-fg">
            Pourcentage (%)
          </label>
          <input
            id="percentage"
            type="number"
            min={1}
            max={100}
            value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
            className="h-12 w-full rounded-xl border border-border/15 bg-surface px-4 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
          />
          <p className="mt-1 text-[11px] font-medium text-fg/40">
            Le montant sera calculé au moment de la génération selon le solde théorique disponible de la caisse,
            jamais au-delà de ce disponible.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="nextRunAt" className="mb-1.5 block text-xs font-bold text-fg">
          Prochaine génération
        </label>
        <input
          id="nextRunAt"
          type="datetime-local"
          value={nextRunAt}
          onChange={(e) => setNextRunAt(e.target.value)}
          className="h-12 w-full rounded-xl border border-border/15 bg-surface px-4 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
        />
      </div>

      <p className="rounded-xl bg-surface-sunken px-4 py-3 text-xs font-medium text-fg/60">
        Lorsque l&apos;échéance arrive, SAMA HOME crée un virement programmé (statut SCHEDULED) — il reste à
        effectuer manuellement depuis Caisse → Virements bancaires. Aucun transfert n&apos;est jamais réalisé
        automatiquement.
      </p>

      {error ? (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-1 flex gap-3">
        <button
          type="button"
          onClick={() => router.push("/settings/transfer-schedules")}
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
