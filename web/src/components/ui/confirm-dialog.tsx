"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Confirmation intégrée à la page (remplace `window.confirm()`, que certains
 * navigateurs intégrés / modes installés bloquent silencieusement). Basée sur
 * l'élément natif <dialog> : focus piégé, Échap pour fermer, rôle ARIA gérés
 * par le navigateur. L'appelant garde la maîtrise de `open`.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "Retour",
  pending = false,
  danger = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  pending?: boolean;
  danger?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Identifiant unique par instance : plusieurs dialogues coexistent dans le
  // DOM (fermés) sur une même page — un id fixe serait dupliqué.
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Focus initial explicite : sur "Retour" pour une action destructive
      // (Entrée ne confirme alors jamais par réflexe), sinon sur la confirmation.
      (danger ? cancelRef : confirmRef).current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, danger]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-surface-raised p-5 text-fg shadow-card backdrop:bg-black/60"
    >
      <h2 id={titleId} className="text-base font-extrabold text-fg">
        {title}
      </h2>
      <div className="mt-2 text-sm font-medium text-fg/80">{children}</div>
      {error ? (
        <p role="alert" className="mt-3 rounded-xl bg-danger-bg px-3 py-2.5 text-xs font-bold text-danger">
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
        <button
          ref={confirmRef}
          type="button"
          disabled={pending}
          onClick={onConfirm}
          className={`flex h-12 flex-1 items-center justify-center rounded-xl text-sm font-extrabold disabled:opacity-60 ${
            danger ? "bg-danger text-white" : "bg-brand-orange text-ink"
          }`}
        >
          {pending ? "Traitement en cours…" : confirmLabel}
        </button>
        <button
          ref={cancelRef}
          type="button"
          disabled={pending}
          onClick={onCancel}
          className="flex h-12 flex-1 items-center justify-center rounded-xl border border-border/15 text-sm font-bold text-fg disabled:opacity-60"
        >
          {cancelLabel}
        </button>
      </div>
    </dialog>
  );
}
