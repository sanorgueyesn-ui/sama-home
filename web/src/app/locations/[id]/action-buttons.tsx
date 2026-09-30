"use client";

import { useState, useTransition } from "react";
import { completeRental, cancelRental } from "@/app/actions/rentals";

export function CompleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleComplete() {
    if (!confirm("Terminer cette location ? Le logement redeviendra disponible.")) return;
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
        {pending ? "..." : "Terminer la location"}
      </button>
      {error ? <p className="mt-1.5 text-center text-xs font-medium text-danger">{error}</p> : null}
    </div>
  );
}

export function CancelRentalButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCancel() {
    if (!confirm("Annuler cette location ? Le logement redeviendra disponible.")) return;
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
        {pending ? "..." : "Annuler la location"}
      </button>
      {error ? <p className="mt-1.5 text-center text-xs font-medium text-danger">{error}</p> : null}
    </div>
  );
}
