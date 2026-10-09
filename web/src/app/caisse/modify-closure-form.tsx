"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { modifyClosedCashSession } from "@/app/actions/cash";

function fmtFcfa(amount: number) {
  const sign = amount < 0 ? "-" : "";
  return `${sign}${Math.abs(amount).toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}

/**
 * Bloc E, section 13 — ADMIN uniquement (masquage côté parent, revérifié
 * serveur). `closingTheoreticalBalance` affiché mais jamais envoyé comme
 * champ modifiable (le moteur métier le refuserait de toute façon — ce
 * formulaire ne propose même pas le champ).
 */
export function ModifyClosureForm({
  sessionId,
  currentPhysicalCount,
  currentVarianceReason,
  currentCloseNote,
  closingTheoreticalBalance,
}: {
  sessionId: string;
  currentPhysicalCount: number | null;
  currentVarianceReason: string | null;
  currentCloseNote: string | null;
  closingTheoreticalBalance: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [physicalCount, setPhysicalCount] = useState(
    currentPhysicalCount !== null ? String(currentPhysicalCount) : "",
  );
  const [varianceReason, setVarianceReason] = useState(currentVarianceReason ?? "");
  const [closeNote, setCloseNote] = useState(currentCloseNote ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasCount = physicalCount.trim().length > 0;
  const parsedCount = hasCount ? Number(physicalCount) : null;
  const countValid = !hasCount || (Number.isInteger(parsedCount) && parsedCount! >= 0);
  const variance = hasCount && countValid ? parsedCount! - closingTheoreticalBalance : null;

  function handleSubmit() {
    if (!countValid) {
      setError("Le comptage physique doit être un nombre entier positif ou nul.");
      return;
    }
    if (variance !== null && variance !== 0 && !varianceReason.trim()) {
      setError("Une justification de l'écart est obligatoire.");
      return;
    }
    if (!reason.trim()) {
      setError("Une justification de la modification est obligatoire.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await modifyClosedCashSession(
        sessionId,
        {
          physicalCount: hasCount ? parsedCount : null,
          varianceReason: varianceReason.trim() || null,
          closeNote: closeNote.trim() || null,
        },
        reason.trim(),
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-center text-xs font-bold text-fg underline">
        Modifier cette clôture
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/15 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-extrabold text-fg">Modification d&apos;une clôture validée</p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-bold text-fg/50 underline">
          Annuler
        </button>
      </div>
      <p className="rounded-xl bg-warning-bg px-3 py-2.5 text-xs font-medium text-warning">
        Ceci modifie un historique déjà validé. L&apos;ancien et le nouvel état seront conservés (journal d&apos;audit).
      </p>

      <div className="rounded-xl bg-surface-sunken px-4 py-3">
        <p className="text-xs font-bold text-fg/50">SOLDE THÉORIQUE (non modifiable)</p>
        <p className="mt-1 text-lg font-extrabold text-fg">{fmtFcfa(closingTheoreticalBalance)}</p>
      </div>

      <div>
        <label htmlFor="modifyPhysicalCount" className="mb-1.5 block text-xs font-bold text-fg">
          Comptage physique
        </label>
        <input
          id="modifyPhysicalCount"
          type="number"
          min={0}
          value={physicalCount}
          onChange={(e) => setPhysicalCount(e.target.value)}
          className="h-12 w-full rounded-xl border border-border/15 bg-surface px-4 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
        />
      </div>

      {hasCount && countValid && variance !== 0 ? (
        <div>
          <p className="text-xs font-extrabold text-warning">
            Écart : {variance! > 0 ? "+" : ""}
            {fmtFcfa(variance!)}
          </p>
          <label htmlFor="modifyVarianceReason" className="mt-1.5 mb-1.5 block text-xs font-bold text-fg">
            Justification de l&apos;écart
          </label>
          <textarea
            id="modifyVarianceReason"
            value={varianceReason}
            onChange={(e) => setVarianceReason(e.target.value)}
            className="min-h-16 w-full resize-none rounded-xl border border-border/15 bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
          />
        </div>
      ) : null}

      <div>
        <label htmlFor="modifyCloseNote" className="mb-1.5 block text-xs font-bold text-fg">
          Note
        </label>
        <textarea
          id="modifyCloseNote"
          value={closeNote}
          onChange={(e) => setCloseNote(e.target.value)}
          className="min-h-16 w-full resize-none rounded-xl border border-border/15 bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
        />
      </div>

      <div>
        <label htmlFor="modifyReason" className="mb-1.5 block text-xs font-bold text-fg">
          Motif de la modification
        </label>
        <textarea
          id="modifyReason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="min-h-16 w-full resize-none rounded-xl border border-border/15 bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
        />
      </div>

      {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}

      <button
        type="button"
        disabled={pending}
        onClick={handleSubmit}
        className="flex h-12 items-center justify-center rounded-xl bg-brand-orange text-sm font-extrabold text-ink disabled:opacity-40"
      >
        {pending ? "..." : "Enregistrer la modification"}
      </button>
    </div>
  );
}
