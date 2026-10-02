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
export function CloseCashSessionForm({ theoreticalBalance }: { theoreticalBalance: number }) {
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
  const variance = hasCount && countValid ? parsedCount! - theoreticalBalance : null;

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
        className="flex h-14 items-center justify-center rounded-2xl border border-danger/30 bg-danger-bg text-base font-extrabold text-danger"
      >
        Fermer la caisse
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-navy/15 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-extrabold text-navy">Clôture de caisse</p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-bold text-navy/50 underline">
          Annuler
        </button>
      </div>

      <div className="rounded-xl bg-paper px-4 py-3">
        <p className="text-xs font-bold text-navy/50">SOLDE THÉORIQUE</p>
        <p className="mt-1 text-xl font-extrabold text-navy">{fmtFcfa(theoreticalBalance)}</p>
      </div>

      <div>
        <label htmlFor="physicalCount" className="mb-1.5 block text-xs font-bold text-navy">
          Comptage physique <span className="font-medium text-navy/40">(facultatif)</span>
        </label>
        <input
          id="physicalCount"
          type="number"
          min={0}
          value={physicalCount}
          onChange={(e) => setPhysicalCount(e.target.value)}
          placeholder="Laisser vide si aucun comptage"
          className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-4 text-sm text-navy outline-none focus:border-navy"
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
              className="min-h-16 w-full resize-none rounded-xl border border-warning/30 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-warning"
            />
          </div>
        )
      ) : null}

      <div>
        <label htmlFor="closeNote" className="mb-1.5 block text-xs font-bold text-navy">
          Note <span className="font-medium text-navy/40">(optionnel)</span>
        </label>
        <textarea
          id="closeNote"
          value={closeNote}
          onChange={(e) => setCloseNote(e.target.value)}
          className="min-h-16 w-full resize-none rounded-xl border border-navy/15 bg-paper px-3 py-2 text-sm text-navy outline-none focus:border-navy"
        />
      </div>

      {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}

      <button
        type="button"
        disabled={pending}
        onClick={handleClose}
        className="flex h-12 items-center justify-center rounded-xl bg-navy text-sm font-extrabold text-white disabled:opacity-40"
      >
        {pending ? "..." : "Confirmer la fermeture"}
      </button>
    </div>
  );
}
