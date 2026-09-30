"use client";

import { useTransition } from "react";
import { cancelReservation } from "@/app/actions/reservations";

export function CancelButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function handleCancel() {
    if (!confirm("Annuler cette réservation ? Le créneau redeviendra disponible.")) return;
    startTransition(() => cancelReservation(id));
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleCancel}
      className="flex h-14 items-center justify-center rounded-2xl border border-danger/30 text-sm font-extrabold text-danger disabled:opacity-60"
    >
      {pending ? "..." : "Annuler la réservation"}
    </button>
  );
}
