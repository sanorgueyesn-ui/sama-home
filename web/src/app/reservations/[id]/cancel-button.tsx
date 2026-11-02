"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelReservation } from "@/app/actions/reservations";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { isNextRedirectError } from "@/lib/reservation-filters";

export function CancelButton({ id, summary }: { id: string; summary: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await cancelReservation(id);
        if (result.error) {
          setError(result.error);
        } else {
          setConfirming(false);
          router.replace(`/reservations/${id}?cancelled=1`);
          router.refresh();
        }
      } catch (caught) {
        // Une redirection (arrivée réussie, session expirée) n'est pas un échec.
        if (isNextRedirectError(caught)) throw caught;
        setError("La connexion avec le serveur a échoué. Rien n'a été modifié : vérifiez votre connexion puis réessayez.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
        className="flex min-h-12 w-full items-center justify-center rounded-xl border border-danger/30 text-sm font-extrabold text-danger disabled:opacity-60"
      >
        Annuler la réservation
      </button>
      <ConfirmDialog
        open={confirming}
        title="Annuler cette réservation ?"
        confirmLabel="Oui, annuler"
        cancelLabel="Non, la conserver"
        danger
        pending={pending}
        error={error}
        onCancel={() => {
          setConfirming(false);
          setError(null);
        }}
        onConfirm={handleCancel}
      >
        <p>{summary}</p>
        <p className="mt-2 text-xs text-app-muted">
          Le créneau redeviendra disponible. Les paiements déjà encaissés (acompte) ne sont ni supprimés ni remboursés
          automatiquement.
        </p>
      </ConfirmDialog>
    </div>
  );
}
