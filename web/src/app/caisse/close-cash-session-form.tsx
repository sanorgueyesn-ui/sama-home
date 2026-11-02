"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { closeCashSession } from "@/app/actions/cash";

function fmtFcfa(amount: number) {
  const sign = amount < 0 ? "-" : "";
  return `${sign}${Math.abs(amount).toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}

/**
 * Bloc E, sections 10/11 — `theoreticalBalance` est reçu du serveur (jamais
 * recalculé ici). Le comptage physique est facultatif ; l'écart n'est
 * qu'un affichage immédiat (`physique - théorique`, simple soustraction,
 * pas une règle métier) — le serveur revalide et reste la seule autorité.
 * La fermeture n'est jamais bloquée par un écart, seule la justification
 * de cet écart est exigée.
 */
export function CloseCashSessionForm({
  theoreticalBalance,
  expectedCash,
  mobileMoney,
}: {
  theoreticalBalance: number;
  /** Espèces attendues dans le tiroir (sans Wave ni Orange Money) : affichées pour aider au comptage. */
  expectedCash: number;
  mobileMoney: { wave: number; orangeMoney: number };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [physicalCount, setPhysicalCount] = useState("");
  const [varianceReason, setVarianceReason] = useState("");
  const [closeNote, setCloseNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasCount = physicalCount.trim().length > 0;
  const parsedCount = hasCount ? Number(physicalCount) : null;
  const countValid = !hasCount || (Number.isInteger(parsedCount) && parsedCount! >= 0);
  const variance = hasCount && countValid ? parsedCount! - expectedCash : null;

  function handleClose() {
    if (!countValid) {
      setError("Le comptage physique doit être un nombre entier positif ou nul.");
      return;
    }
    if (variance !== null && variance !== 0 && !varianceReason.trim()) {
      setError("Une justification est obligatoire lorsqu'un écart est constaté.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await closeCashSession({
        physicalCount: hasCount ? parsedCount : null,
        varianceReason: varianceReason.trim() || null,
        closeNote: closeNote.trim() || null,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-12 items-center justify-center rounded-xl border border-danger/30 bg-danger-bg text-base font-extrabold text-danger"
      >
        Fermer la caisse
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-app-line-strong p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-extrabold text-app-text">Clôture de caisse</p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-bold text-app-muted underline">
          Annuler
        </button>
      </div>

      <div className="rounded-xl bg-app-panel-2 px-4 py-3">
        <p className="text-xs font-bold text-app-muted">SOLDE THÉORIQUE TOTAL</p>
        <p className="mt-1 text-xl font-extrabold text-app-text">{fmtFcfa(theoreticalBalance)}</p>
        <dl className="mt-2 space-y-1 border-t border-app-line-strong pt-2 text-xs text-app-muted">
          <div className="flex justify-between gap-3">
            <dt className="font-bold text-app-text">dont espèces attendues au tiroir</dt>
            <dd className="font-semibold tabular-nums text-app-text">{fmtFcfa(expectedCash)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>dont Wave</dt>
            <dd className="font-semibold tabular-nums text-app-text">{fmtFcfa(mobileMoney.wave)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>dont Orange Money</dt>
            <dd className="font-semibold tabular-nums text-app-text">{fmtFcfa(mobileMoney.orangeMoney)}</dd>
          </div>
        </dl>
      </div>

      <div>
        <label htmlFor="physicalCount" className="mb-1.5 block text-xs font-bold text-app-text">
          Comptage physique <span className="font-medium text-app-faint">(facultatif)</span>
          <span className="mt-0.5 block text-[11px] font-medium text-app-muted">Comptez uniquement les espèces du tiroir : elles sont comparées aux espèces attendues ({fmtFcfa(expectedCash)}). Wave et Orange Money ne créent pas d&apos;écart.</span>
        </label>
        <input
          id="physicalCount"
          type="number"
          min={0}
          value={physicalCount}
          onChange={(e) => setPhysicalCount(e.target.value)}
          placeholder="Laisser vide si aucun comptage"
          className="h-12 w-full rounded-xl border border-app-line-strong bg-app-panel-2 px-4 text-sm text-app-text outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
        />
      </div>

      {hasCount && countValid ? (
        variance === 0 ? (
          <p className="rounded-xl bg-success-bg px-4 py-3 text-sm font-bold text-success">Aucun écart</p>
        ) : (
          <div className="flex flex-col gap-2 rounded-xl bg-warning-bg px-4 py-3">
            <p className="text-sm font-extrabold text-warning">
              Écart : {variance! > 0 ? "+" : ""}
              {fmtFcfa(variance!)}
            </p>
            <label htmlFor="varianceReason" className="text-xs font-bold text-warning">
              Justification de l&apos;écart
            </label>
            <textarea
              id="varianceReason"
              value={varianceReason}
              onChange={(e) => setVarianceReason(e.target.value)}
              className="min-h-16 w-full resize-none rounded-xl border border-warning/30 bg-app-panel-2 px-3 py-2 text-sm text-app-text outline-none focus:border-warning focus-visible:ring-2 focus-visible:ring-warning"
            />
          </div>
        )
      ) : null}

      <div>
        <label htmlFor="closeNote" className="mb-1.5 block text-xs font-bold text-app-text">
          Note <span className="font-medium text-app-faint">(optionnel)</span>
        </label>
        <textarea
          id="closeNote"
          value={closeNote}
          onChange={(e) => setCloseNote(e.target.value)}
          className="min-h-16 w-full resize-none rounded-xl border border-app-line-strong bg-app-panel-2 px-3 py-2 text-sm text-app-text outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
        />
      </div>

      {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}

      <button
        type="button"
        disabled={pending}
        onClick={handleClose}
        className="flex h-12 items-center justify-center rounded-xl bg-brand-orange text-sm font-extrabold text-ink disabled:opacity-40"
      >
        {pending ? "..." : "Confirmer la fermeture"}
      </button>
    </div>
  );
}
