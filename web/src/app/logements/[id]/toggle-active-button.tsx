"use client";

import { useTransition } from "react";
import { toggleActive } from "@/app/actions/properties";

export function ToggleActiveButton({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => toggleActive(id, !active))}
      className={`h-14 rounded-2xl text-sm font-extrabold disabled:opacity-60 ${
        active ? "border border-danger/30 text-danger" : "bg-success text-white"
      }`}
    >
      {pending ? "..." : active ? "Désactiver ce logement" : "Réactiver ce logement"}
    </button>
  );
}
