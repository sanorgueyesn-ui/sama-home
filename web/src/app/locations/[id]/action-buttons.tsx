"use client";

import { useState, useTransition } from "react";
import { completeRental, cancelRental } from "@/app/actions/rentals";
import { T } from "@/components/i18n/i18n-provider";

export function CompleteButton({ id, hotel = false }: { id: string; hotel?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleComplete() {
    if (!confirm(hotel ? "Terminer ce séjour ? La chambre passera à nettoyer." : "Terminer cette location ? Le logement redeviendra disponible.")) return;
    setError(null);
    startTransition(async () => {
      const result = await completeRental(id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div>
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
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCancel() {
    if (!confirm(hotel ? "Annuler ce séjour ? La chambre redeviendra disponible." : "Annuler cette location ? Le logement redeviendra disponible.")) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelRental(id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div>
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
