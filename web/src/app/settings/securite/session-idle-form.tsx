"use client";

import { useActionState } from "react";
import { updateSessionIdleMinutes, type SessionIdleState } from "@/app/actions/security";
import { SESSION_IDLE_OPTIONS_MINUTES } from "@/lib/session-policy";
import { T, useT } from "@/components/i18n/i18n-provider";

const LABELS: Record<number, string> = {
  5: "5 minutes",
  15: "15 minutes",
  30: "30 minutes",
  60: "1 heure",
  120: "2 heures",
  240: "4 heures",
  480: "8 heures",
};

/** Choix du délai de déconnexion automatique : après ce temps sans activité, les identifiants sont redemandés. */
export function SessionIdleForm({ current }: { current: number }) {
  const t = useT();
  const [state, formAction, pending] = useActionState<SessionIdleState, FormData>(updateSessionIdleMinutes, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex flex-1 flex-col gap-1.5 text-sm font-bold text-fg">
        <T>Se déconnecter après</T>
        <select
          name="minutes"
          defaultValue={current}
          className="h-12 rounded-xl border border-border/15 bg-surface px-3 text-sm font-semibold text-fg focus-visible:outline-2 focus-visible:outline-brand-orange"
        >
          {SESSION_IDLE_OPTIONS_MINUTES.map((minutes) => (
            <option key={minutes} value={minutes}>
              {t(LABELS[minutes])}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="flex h-12 items-center justify-center rounded-xl bg-brand-orange px-5 text-sm font-extrabold text-ink disabled:opacity-60"
      >
        {pending ? "…" : <T>Enregistrer</T>}
      </button>
      {state?.ok ? (
        <p role="status" className="text-xs font-bold text-success sm:self-center">
          <T>Enregistré.</T>
        </p>
      ) : null}
      {state?.error ? (
        <p role="alert" className="text-xs font-bold text-danger sm:self-center">
          <T>{state.error}</T>
        </p>
      ) : null}
    </form>
  );
}
