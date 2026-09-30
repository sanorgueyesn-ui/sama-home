"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkInReservation } from "@/app/actions/rentals";

export function CheckInButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCheckIn() {
    if (!confirm("Faire entrer ce client maintenant ?")) return;
    setError(null);
    startTransition(async () => {
      const result = await checkInReservation(id);
      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={handleCheckIn}
        className="flex h-14 w-full items-center justify-center rounded-2xl bg-navy text-sm font-extrabold text-white disabled:opacity-60"
      >
        {pending ? "..." : "Faire entrer"}
      </button>
      {error ? <p className="mt-1.5 text-center text-xs font-medium text-danger">{error}</p> : null}
    </div>
  );
}
