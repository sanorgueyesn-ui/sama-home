"use client";

import { useState, useTransition } from "react";
import { cancelReservation } from "@/app/actions/reservations";

export function CancelButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCancel() {
    if (!confirm("Annuler cette réservation ? Le créneau redeviendra disponible.")) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelReservation(id);
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
        {pending ? "..." : "Annuler la réservation"}
      </button>
      {error ? <p className="mt-1.5 text-center text-xs font-medium text-danger">{error}</p> : null}
    </div>
  );
}
