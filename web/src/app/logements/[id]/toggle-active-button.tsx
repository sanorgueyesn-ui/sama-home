"use client";

import { useState, useTransition } from "react";
import { toggleActive } from "@/app/actions/properties";

export function ToggleActiveButton({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await toggleActive(id, !active);
      if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={handleClick}
        className={`h-14 rounded-2xl text-sm font-extrabold disabled:opacity-60 ${
          active ? "border border-danger/30 text-danger" : "bg-success text-white"
        }`}
      >
        {pending ? "..." : active ? "Désactiver ce logement" : "Réactiver ce logement"}
      </button>
      {error ? <p className="text-[10.5px] font-medium text-danger">{error}</p> : null}
    </div>
  );
}
