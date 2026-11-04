"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "./confirm-dialog";

export type ConfirmOptions = {
  /** Titre court (phrase française, traduite automatiquement). */
  title: string;
  /** Explication : texte déjà traduit, ou élément. Les retours à la ligne sont respectés. */
  message: ReactNode;
  /** Verbe de l'action, ex. « Terminer le séjour ». */
  confirmLabel: string;
  cancelLabel?: string;
  /** Action destructive : bouton rouge, et le focus part sur « Retour ». */
  danger?: boolean;
};

/**
 * Remplace `window.confirm()` par la fenêtre de confirmation de l'application (même présentation partout,
 * jamais celle du navigateur). Usage :
 *
 *   const { confirm, dialog } = useConfirm();
 *   async function onClick() { if (!(await confirm({ ... }))) return; ... }
 *   return (<div>{dialog} ...</div>);
 */
export function useConfirm() {
  const [state, setState] = useState<(ConfirmOptions & { open: boolean }) | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false);
        resolver.current = resolve;
        setState({ ...options, open: true });
      }),
    [],
  );

  const settle = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setState((current) => (current ? { ...current, open: false } : current));
  };

  const dialog = state ? (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      danger={state.danger}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    >
      <p className="whitespace-pre-line">{state.message}</p>
    </ConfirmDialog>
  ) : null;

  return { confirm, dialog };
}
