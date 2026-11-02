"use client";

import { useActionState, useState } from "react";
import { addRentalCharge, type FolioState } from "@/app/actions/folio";
import { FOLIO_PRESETS } from "@/lib/folio";

export type FolioLine = { id: string; label: string; amount: number; reason: string | null; createdAt: string };

const fmt = (n: number) => `${n < 0 ? "−" : ""}${Math.abs(n).toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
const fmtDate = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

const FIELD =
  "h-11 w-full rounded-xl border border-app-line-strong bg-app-panel px-3 text-sm text-app-text outline-none placeholder:text-app-faint focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange/40";

/**
 * Formulaire d'ajout. Il est monté avec `key={nonce}` par le parent : après un ajout réussi il est recréé
 * vide, donc un second clic ne peut pas enregistrer deux fois le même extra.
 */
function AddChargeForm({ formAction, pending, state }: { formAction: (formData: FormData) => void; pending: boolean; state: FolioState }) {
  const [label, setLabel] = useState("");
  const [negative, setNegative] = useState(false);

  return (
    <form
      action={(formData) => {
        // Montant négatif = remise : le signe vient du choix, jamais d'une saisie ambiguë.
        const raw = String(formData.get("amount") ?? "").replace(/[\s -]/g, "");
        formData.set("amount", raw ? (negative ? `-${raw}` : raw) : "");
        formAction(formData);
      }}
      className="mt-4 space-y-3 border-t border-app-line pt-4"
    >
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Raccourcis">
        {FOLIO_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              setLabel(preset);
              setNegative(preset === "Remise");
            }}
            className="h-9 rounded-full border border-app-line-strong px-3 text-xs font-bold text-app-text-2 hover:bg-app-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
          >
            {preset}
          </button>
        ))}
      </div>
      <input name="label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Ce qui est facturé" aria-label="Libellé" maxLength={60} className={FIELD} required />
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input name="amount" inputMode="numeric" placeholder="Montant en FCFA" aria-label="Montant en FCFA" className={FIELD} required />
        <label className="flex h-11 items-center gap-2 rounded-xl border border-app-line-strong px-3 text-xs font-bold text-app-text-2">
          <input type="checkbox" checked={negative} onChange={(event) => setNegative(event.target.checked)} className="h-4 w-4 accent-[var(--color-brand-orange)]" />
          Remise
        </label>
      </div>
      {negative ? <input name="reason" placeholder="Motif de la remise ou de la correction" aria-label="Motif" maxLength={200} className={FIELD} required /> : null}
      {state?.error ? (
        <p role="alert" className="text-xs font-bold text-app-bad">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-brand-orange text-sm font-bold text-ink transition hover:brightness-110 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
      >
        {pending ? "Enregistrement…" : negative ? "Appliquer la remise" : "Ajouter l'extra"}
      </button>
    </form>
  );
}

/** Extras du séjour (hôtel) : liste des lignes et ajout d'un extra ou d'une remise. */
export function FolioSection({ rentalId, lines, canEdit }: { rentalId: string; lines: FolioLine[]; canEdit: boolean }) {
  const [state, formAction, pending] = useActionState<FolioState, FormData>(addRentalCharge.bind(null, rentalId), undefined);
  const total = lines.reduce((sum, line) => sum + line.amount, 0);

  return (
    <section aria-label="Extras du séjour" className="rounded-2xl border border-app-line bg-app-panel p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-app-muted">Extras et remises</h2>
        {lines.length > 0 ? <span className="text-xs font-bold tabular-nums text-app-text-2">{fmt(total)}</span> : null}
      </div>

      {lines.length === 0 ? (
        <p className="mt-2 text-xs text-app-muted">Aucun extra sur ce séjour.</p>
      ) : (
        <ul className="mt-2 divide-y divide-app-line">
          {lines.map((line) => (
            <li key={line.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-app-text">{line.label}</p>
                <p className="text-[11px] text-app-faint">
                  {fmtDate(line.createdAt)}
                  {line.reason ? ` · ${line.reason}` : ""}
                </p>
              </div>
              <span className={`shrink-0 text-sm font-bold tabular-nums ${line.amount < 0 ? "text-app-good" : "text-app-text"}`}>{fmt(line.amount)}</span>
            </li>
          ))}
        </ul>
      )}

      {state?.ok ? (
        <p role="status" className="mt-3 text-xs font-bold text-app-good">
          Enregistré.
        </p>
      ) : null}
      {canEdit ? <AddChargeForm key={state?.nonce ?? "new"} formAction={formAction} pending={pending} state={state} /> : null}
    </section>
  );
}
