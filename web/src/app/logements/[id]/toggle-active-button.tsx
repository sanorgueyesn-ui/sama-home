"use client";

import { useState, useTransition } from "react";
import { toggleActive } from "@/app/actions/properties";
import { T } from "@/components/i18n/i18n-provider";

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
        className={`min-h-12 rounded-xl text-sm font-extrabold disabled:opacity-60 ${
          active ? "border border-danger/30 text-danger" : "bg-success text-white"
        }`}
      >
        {pending ? "..." : active ? <T>{"Désactiver ce logement"}</T> : <T>{"Réactiver ce logement"}</T>}
      </button>
      {error ? <p className="text-[10.5px] font-medium text-danger"><T>{error}</T></p> : null}
    </div>
  );
}
