"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { openCashSession } from "@/app/actions/cash";

function fmtFcfa(amount: number) {
  return `${Math.abs(amount).toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}

/**
 * Bloc E, sections 4/5 — le montant proposé pour l'ouverture normale est
 * TOUJOURS une valeur calculée par le serveur (`proposedBalance`, reçue en
 * prop depuis la page) : jamais recalculée ici. L'ouverture manuelle n'est
 * affichée qu'à ADMIN — l'action serveur `openCashSession` revérifie le
 * rôle de toute façon (jamais un simple masquage UI).
 */
export function OpenCashSessionForm({
  role,
  proposedBalance,
  proposedOriginLabel,
  hasPreviousSession,
}: {
  role: "ADMIN" | "GESTIONNAIRE";
  proposedBalance: number | null;
  proposedOriginLabel: string | null;
  hasPreviousSession: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"normal" | "manual">(hasPreviousSession ? "normal" : "manual");
  const [manualAmount, setManualAmount] = useState("");
  const [manualReason, setManualReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleNormalOpen() {
    setError(null);
    startTransition(async () => {
      const result = await openCashSession();
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleManualOpen() {
    const amount = Number(manualAmount);
    if (manualAmount.trim().length === 0 || !Number.isInteger(amount) || amount < 0) {
      setError("Le montant doit être un nombre entier positif ou nul.");
      return;
    }
    if (!manualReason.trim()) {
      setError("Une justification est obligatoire.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await openCashSession({ openingBalance: amount, reason: manualReason.trim() });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (!hasPreviousSession && role !== "ADMIN") {
    return (
      <p className="rounded-xl bg-warning-bg px-4 py-3 text-sm font-medium text-warning">
        Aucune session précédente. Seul un administrateur peut effectuer la toute première ouverture de caisse.
      </p>
    );
  }

  if (mode === "normal" && hasPreviousSession) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-xl bg-surface-sunken px-4 py-3">
          <p className="text-xs font-bold text-fg/50">MONTANT D&apos;OUVERTURE PROPOSÉ</p>
          <p className="mt-1 text-xl font-extrabold text-fg">{fmtFcfa(proposedBalance ?? 0)}</p>
          {proposedOriginLabel ? <p className="mt-1 text-xs font-medium text-fg/50">{proposedOriginLabel}</p> : null}
        </div>
        {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
        <button
          type="button"
          disabled={pending}
          onClick={handleNormalOpen}
          className="flex h-14 items-center justify-center rounded-2xl bg-brand-orange text-base font-extrabold text-ink disabled:opacity-40"
        >
          {pending ? "..." : "Ouvrir la caisse"}
        </button>
        {role === "ADMIN" ? (
          <button
            type="button"
            onClick={() => {
              setMode("manual");
              setError(null);
            }}
            className="text-center text-xs font-bold text-fg underline"
          >
            Ouverture manuelle exceptionnelle
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl bg-warning-bg px-4 py-3">
        <p className="text-xs font-extrabold text-warning">Ouverture exceptionnelle</p>
        <p className="mt-0.5 text-xs font-medium text-warning">
          Cette action remplace le calcul automatique du montant d&apos;ouverture. Elle est tracée et nécessite une
          justification.
        </p>
      </div>
      <div>
        <label htmlFor="manualAmount" className="mb-1.5 block text-xs font-bold text-fg">
          Montant d&apos;ouverture (FCFA)
        </label>
        <input
          id="manualAmount"
          type="number"
          min={0}
          value={manualAmount}
          onChange={(e) => setManualAmount(e.target.value)}
          className="h-12 w-full rounded-xl border border-border/15 bg-surface px-4 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
        />
      </div>
      <div>
        <label htmlFor="manualReason" className="mb-1.5 block text-xs font-bold text-fg">
          Justification
        </label>
        <textarea
          id="manualReason"
          value={manualReason}
          onChange={(e) => setManualReason(e.target.value)}
          placeholder="Ex. Première mise en service de la caisse."
          className="min-h-20 w-full resize-none rounded-xl border border-border/15 bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
        />
      </div>
      {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
      <div className="flex gap-2">
        {hasPreviousSession ? (
          <button
            type="button"
            onClick={() => {
              setMode("normal");
              setError(null);
            }}
            disabled={pending}
            className="h-12 flex-1 rounded-xl border border-border/15 text-sm font-extrabold text-fg disabled:opacity-60"
          >
            Annuler
          </button>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={handleManualOpen}
          className="h-12 flex-1 rounded-xl bg-brand-orange text-sm font-extrabold text-ink disabled:opacity-40"
        >
          {pending ? "..." : "Ouvrir manuellement"}
        </button>
      </div>
    </div>
  );
}
