"use client";

import { useActionState } from "react";
import { chooseDocumentPresentation, type DocumentChoiceState } from "@/app/actions/documents";
import { T } from "@/components/i18n/i18n-provider";

/** « Utiliser » : choisit cette présentation pour l'établissement ; « Choisie » quand c'est déjà la bonne. */
export function ChoosePresentation({
  kind,
  theme,
  paper,
  selected,
}: {
  kind: "contract" | "ticket";
  theme: number;
  paper: string | null;
  selected: boolean;
}) {
  const [state, formAction, pending] = useActionState<DocumentChoiceState, FormData>(chooseDocumentPresentation.bind(null, kind, theme, paper), undefined);

  if (selected) {
    return (
      <span className="mt-2 inline-flex h-9 items-center rounded-full bg-success-bg px-3 text-xs font-bold text-success" role="status">
        <T>Choisie</T>
      </span>
    );
  }
  return (
    <form action={formAction} className="mt-2">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center rounded-full border border-app-line-strong bg-app-panel px-3 text-xs font-bold text-app-text-2 transition-colors hover:bg-app-hover disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-focus"
      >
        {pending ? "…" : <T>{"Utiliser"}</T>}
      </button>
      {state?.error ? (
        <p role="alert" className="mt-1 text-[11px] font-semibold text-app-bad">
          <T>{state.error}</T>
        </p>
      ) : null}
    </form>
  );
}
