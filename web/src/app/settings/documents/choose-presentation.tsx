"use client";

import { useActionState } from "react";
import { chooseDocumentPresentation, type DocumentChoiceState } from "@/app/actions/documents";

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
        Choisie
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
        {pending ? "…" : "Utiliser"}
      </button>
      {state?.error ? (
        <p role="alert" className="mt-1 text-[11px] font-semibold text-app-bad">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
