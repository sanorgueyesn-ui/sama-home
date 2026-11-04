"use client";

import { useState, useTransition } from "react";
import { completeRental, cancelRental } from "@/app/actions/rentals";
import { useConfirm } from "@/components/ui/use-confirm";
import { T } from "@/components/i18n/i18n-provider";

export function CompleteButton({ id, hotel = false }: { id: string; hotel?: boolean }) {
  const { confirm: askConfirm, dialog: confirmDialog } = useConfirm();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    const ok = await askConfirm({
      title: hotel ? "Terminer ce séjour ?" : "Terminer cette location ?",
      message: <T>{hotel ? "La chambre passera à nettoyer." : "Le logement redeviendra disponible."}</T>,
      confirmLabel: hotel ? "Terminer le séjour" : "Terminer la location",
    });
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const result = await completeRental(id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div>
      {confirmDialog}
      <button
        type="button"
        disabled={pending}
        onClick={handleComplete}
        className="flex h-14 w-full items-center justify-center rounded-2xl bg-navy text-sm font-extrabold text-white disabled:opacity-60"
      >
        {pending ? "..." : hotel ? <T>{"Terminer le séjour"}</T> : <T>{"Terminer la location"}</T>}
      </button>
      {error ? <p className="mt-1.5 text-center text-xs font-medium text-danger"><T>{error}</T></p> : null}
    </div>
  );
}

export function CancelRentalButton({ id, hotel = false }: { id: string; hotel?: boolean }) {
  const { confirm: askConfirm, dialog: confirmDialog } = useConfirm();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    const ok = await askConfirm({
      title: hotel ? "Annuler ce séjour ?" : "Annuler cette location ?",
      message: <T>{hotel ? "La chambre redeviendra disponible." : "Le logement redeviendra disponible."}</T>,
      confirmLabel: hotel ? "Annuler le séjour" : "Annuler la location",
      danger: true,
    });
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelRental(id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div>
      {confirmDialog}
      <button
        type="button"
        disabled={pending}
        onClick={handleCancel}
        className="flex h-14 w-full items-center justify-center rounded-2xl border border-danger/30 text-sm font-extrabold text-danger disabled:opacity-60"
      >
        {pending ? "..." : hotel ? <T>{"Annuler le séjour"}</T> : <T>{"Annuler la location"}</T>}
      </button>
      {error ? <p className="mt-1.5 text-center text-xs font-medium text-danger"><T>{error}</T></p> : null}
    </div>
  );
}
