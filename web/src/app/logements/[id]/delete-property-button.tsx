"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProperty } from "@/app/actions/properties";
import { TrashIcon, AlertCircleIcon } from "@/components/ui/icons";

export function DeletePropertyButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer définitivement le logement « ${name} » ?\n\nCette action est irréversible et supprimera le logement ainsi que ses tarifs.`
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteProperty(id);
      if (result.error) {
        setError(result.error);
      } else {
        router.push("/logements?deleted=1");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={handleDelete}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-sm font-extrabold text-rose-400 hover:bg-rose-500/20 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
      >
        <TrashIcon className="h-4 w-4" />
        <span>{pending ? "Suppression en cours..." : "Supprimer ce logement"}</span>
      </button>
      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/15 p-2.5 text-xs font-bold text-rose-300 flex items-center gap-1.5">
          <AlertCircleIcon className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
