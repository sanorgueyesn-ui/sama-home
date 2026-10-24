import { REASON_MAX_LENGTH, type DecisionMode, type DecisionState } from "./subscription-change-decision-logic";

/**
 * Lot 3B (B2.14-B) — AFFICHAGE des commandes de décision (approbation, rejet, annulation) d'une demande.
 * Composant de présentation pur : aucun hook, aucun appel serveur ; l'état et les gestionnaires sont fournis
 * par `SubscriptionChangeDecisionControls` (composant client). Les boutons ne s'affichent que si les
 * indicateurs calculés par la lecture le permettent, mais ces indicateurs ne sont qu'un confort : chaque
 * action serveur refait ses propres contrôles.
 *
 * Accessibilité : vrais boutons et formulaire natifs (utilisables au clavier), `label` associé au champ du
 * motif, erreurs reliées au champ (`aria-describedby`, `aria-invalid`) et annoncées (`role="alert"`), succès
 * annoncé (`role="status"`), `aria-busy` pendant une requête.
 */

export type DecisionFlags = { canApprove: boolean; canReject: boolean; canCancel: boolean };

export type DecisionSummary = {
  kindLabel: string;
  establishmentName: string;
  /** Montant et durée, ou durée en jours. */
  details: string;
  /** Effet de l'approbation, pour la confirmation. */
  effect: string;
};

export type DecisionPanelProps = {
  state: DecisionState;
  flags: DecisionFlags;
  summary: DecisionSummary;
  ids: { reason: string; error: string };
  onOpen: (mode: Exclude<DecisionMode, "idle">) => void;
  onClose: () => void;
  onReasonChange: (reason: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
  onRefresh: () => void;
};

const BASE_BUTTON = "h-9 rounded-xl px-3 text-xs font-extrabold transition-opacity disabled:opacity-50";
const PRIMARY_BUTTON = `${BASE_BUTTON} bg-brand-orange text-ink hover:opacity-90`;
const DANGER_BUTTON = `${BASE_BUTTON} border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20`;
const SECONDARY_BUTTON = `${BASE_BUTTON} border border-white/20 text-white/80 hover:bg-white/10`;

function Context({ summary }: { summary: DecisionSummary }) {
  return (
    <p className="text-[11px] leading-relaxed text-white/70">
      <strong className="text-white">{summary.kindLabel}</strong> · {summary.establishmentName} · {summary.details}
    </p>
  );
}

export function DecisionPanelView(props: DecisionPanelProps) {
  const { state, flags, summary, ids } = props;
  const busy = state.pending;
  const hasAction = flags.canApprove || flags.canReject || flags.canCancel;
  const result = state.result;

  if (!hasAction && !result) return null;

  // Après une réussite, plus aucune commande : la page est actualisée et la demande change de statut.
  if (result?.kind === "success") {
    return (
      <p role="status" className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-300">
        {result.message}
      </p>
    );
  }

  const stale = result?.kind === "stale" || result?.kind === "unknown";
  const reasonLength = Array.from(state.reason).length;

  return (
    <div role="group" aria-label="Décision sur la demande" aria-busy={busy} className="mt-3 flex flex-col gap-2">
      {state.mode === "idle" && !stale ? (
        <div className="flex flex-wrap gap-2">
          {flags.canApprove ? (
            <button type="button" disabled={busy} onClick={() => props.onOpen("confirm-approve")} className={PRIMARY_BUTTON}>
              Approuver la demande
            </button>
          ) : null}
          {flags.canReject ? (
            <button type="button" disabled={busy} onClick={() => props.onOpen("reject-form")} className={DANGER_BUTTON}>
              Rejeter la demande
            </button>
          ) : null}
          {flags.canCancel ? (
            <button type="button" disabled={busy} onClick={() => props.onOpen("confirm-cancel")} className={SECONDARY_BUTTON}>
              Annuler ma demande
            </button>
          ) : null}
        </div>
      ) : null}

      {state.mode === "confirm-approve" && flags.canApprove ? (
        <div className="flex flex-col gap-2 rounded-xl border border-brand-orange/40 bg-white/5 p-3">
          <p className="text-xs font-bold text-white">Confirmer l&apos;approbation de cette demande ?</p>
          <Context summary={summary} />
          <p className="text-[11px] leading-relaxed text-white/60">
            {summary.effect} Cette action est immédiate et ne peut pas être annulée.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={props.onClose} className={SECONDARY_BUTTON}>
              Retour
            </button>
            <button type="button" disabled={busy} onClick={props.onApprove} className={PRIMARY_BUTTON}>
              {busy ? "Approbation en cours…" : "Oui, approuver"}
            </button>
          </div>
        </div>
      ) : null}

      {state.mode === "reject-form" && flags.canReject ? (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            props.onReject();
          }}
          className="flex flex-col gap-2 rounded-xl border border-danger/30 bg-white/5 p-3"
        >
          <p className="text-xs font-bold text-white">Rejeter cette demande</p>
          <Context summary={summary} />
          <label htmlFor={ids.reason} className="text-[11px] font-bold text-white/80">
            Motif du rejet (obligatoire, {REASON_MAX_LENGTH} caractères au maximum)
          </label>
          <textarea
            id={ids.reason}
            name="reason"
            rows={3}
            value={state.reason}
            disabled={busy}
            required
            aria-required="true"
            aria-invalid={state.fieldError !== null}
            aria-describedby={state.fieldError !== null ? ids.error : undefined}
            onChange={(event) => props.onReasonChange(event.target.value)}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-brand-orange focus:outline-none disabled:opacity-60"
            placeholder="Ex : paiement non reçu sur le compte"
          />
          <div className="flex items-start justify-between gap-2">
            {state.fieldError !== null ? (
              <p id={ids.error} role="alert" className="text-[11px] font-semibold text-danger">
                {state.fieldError}
              </p>
            ) : (
              <span />
            )}
            <span className={`shrink-0 text-[10.5px] ${reasonLength > REASON_MAX_LENGTH ? "font-bold text-danger" : "text-white/40"}`}>
              {reasonLength} / {REASON_MAX_LENGTH}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={props.onClose} className={SECONDARY_BUTTON}>
              Retour
            </button>
            <button type="submit" disabled={busy} className={DANGER_BUTTON}>
              {busy ? "Rejet en cours…" : "Confirmer le rejet"}
            </button>
          </div>
        </form>
      ) : null}

      {state.mode === "confirm-cancel" && flags.canCancel ? (
        <div className="flex flex-col gap-2 rounded-xl border border-white/20 bg-white/5 p-3">
          <p className="text-xs font-bold text-white">Annuler cette demande ?</p>
          <Context summary={summary} />
          <p className="text-[11px] leading-relaxed text-white/60">
            La demande sera clôturée sans aucun effet sur l&apos;abonnement.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={props.onClose} className={SECONDARY_BUTTON}>
              Retour
            </button>
            <button type="button" disabled={busy} onClick={props.onCancel} className={PRIMARY_BUTTON}>
              {busy ? "Annulation en cours…" : "Oui, annuler la demande"}
            </button>
          </div>
        </div>
      ) : null}

      {result && !stale ? (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] font-semibold text-danger">
          {result.message}
        </p>
      ) : null}

      {stale && result ? (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2">
          <p role="alert" className="text-[11px] font-semibold text-amber-200">
            {result.message}
          </p>
          <div>
            <button type="button" onClick={props.onRefresh} className={SECONDARY_BUTTON}>
              Actualiser les données
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
