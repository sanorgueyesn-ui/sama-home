"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  suspendEstablishment,
  reactivateEstablishment,
  deleteEstablishment,
} from "@/app/actions/establishment-approval";

export function EstablishmentLifecycleButtons({
  establishmentId,
  establishmentName,
  status,
}: {
  establishmentId: string;
  establishmentName: string;
  status: "ACTIVE" | "SUSPENDED";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingSuspend, setConfirmingSuspend] = useState(false);
  const [confirmingReactivate, setConfirmingReactivate] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handleSuspend() {
    setError(null);
    startTransition(async () => {
      const result = await suspendEstablishment(establishmentId);
      if (result.error) {
        setError(result.error);
      } else {
        setConfirmingSuspend(false);
      }
      router.refresh();
    });
  }

  function handleReactivate() {
    setError(null);
    startTransition(async () => {
      const result = await reactivateEstablishment(establishmentId);
      if (result.error) {
        setError(result.error);
      } else {
        setConfirmingReactivate(false);
      }
      router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteEstablishment(establishmentId);
      if (result.error) {
        setError(result.error);
      } else {
        setConfirmingDelete(false);
      }
      router.refresh();
    });
  }

  if (confirmingDelete) {
    return (
      <div className="flex w-full flex-col gap-2 rounded-2xl border border-danger/60 bg-danger/10 p-3 sm:w-64">
        <p className="text-xs font-bold text-white">
          Supprimer définitivement <span className="text-danger">« {establishmentName} »</span> ?
        </p>
        <p className="text-[11px] leading-relaxed text-white/60">
          Cette action est irréversible. L&apos;établissement et tous ses comptes associés seront supprimés.
        </p>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmingDelete(false)}
            className="h-8 flex-1 rounded-lg border border-white/20 text-xs font-semibold text-white/80 hover:bg-white/10"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleDelete}
            className="h-8 flex-1 rounded-lg bg-danger text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "..." : "Oui, Supprimer"}
          </button>
        </div>
        {error ? <p className="text-[10.5px] font-medium text-danger">{error}</p> : null}
      </div>
    );
  }

  if (confirmingSuspend) {
    return (
      <div className="flex w-full flex-col gap-2 rounded-2xl border border-danger/40 bg-white/5 p-3 sm:w-64">
        <p className="text-xs font-bold text-white">
          Suspendre <span className="text-danger">« {establishmentName} »</span> ?
        </p>
        <p className="text-[11px] leading-relaxed text-white/60">
          Son accès aux fonctionnalités métier sera immédiatement bloqué.
        </p>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmingSuspend(false)}
            className="h-8 flex-1 rounded-lg border border-white/20 text-xs font-semibold text-white/80 hover:bg-white/10"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleSuspend}
            className="h-8 flex-1 rounded-lg border border-danger/30 bg-danger-bg text-xs font-bold text-danger hover:bg-danger/20 disabled:opacity-50"
          >
            {pending ? "..." : "Oui, Suspendre"}
          </button>
        </div>
        {error ? <p className="text-[10.5px] font-medium text-danger">{error}</p> : null}
      </div>
    );
  }

  if (confirmingReactivate) {
    return (
      <div className="flex w-full flex-col gap-2 rounded-2xl border border-brand-orange/40 bg-white/5 p-3 sm:w-64">
        <p className="text-xs font-bold text-white">
          Réactiver <span className="text-brand-orange">« {establishmentName} »</span> ?
        </p>
        <p className="text-[11px] leading-relaxed text-white/60">
          Son accès dépendra de l&apos;état réel de son abonnement.
        </p>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmingReactivate(false)}
            className="h-8 flex-1 rounded-lg border border-white/20 text-xs font-semibold text-white/80 hover:bg-white/10"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleReactivate}
            className="h-8 flex-1 rounded-lg bg-brand-orange text-xs font-bold text-ink hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "..." : "Oui, Réactiver"}
          </button>
        </div>
        {error ? <p className="text-[10.5px] font-medium text-danger">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {status === "ACTIVE" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setConfirmingSuspend(true);
              setConfirmingReactivate(false);
              setConfirmingDelete(false);
            }}
            className="h-9 rounded-xl border border-danger/40 px-3 text-xs font-extrabold text-danger transition-colors hover:bg-danger/10 disabled:opacity-60"
          >
            Suspendre
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setConfirmingReactivate(true);
              setConfirmingSuspend(false);
              setConfirmingDelete(false);
            }}
            className="h-9 rounded-xl bg-brand-orange px-3 text-xs font-extrabold text-ink transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            Réactiver
          </button>
        )}

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setConfirmingDelete(true);
            setConfirmingSuspend(false);
            setConfirmingReactivate(false);
          }}
          title="Supprimer définitivement cet établissement"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/40 transition-colors hover:border-danger/40 hover:bg-danger/10 hover:text-danger disabled:opacity-50"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>
      {error ? <p className="max-w-56 text-right text-[10.5px] font-medium text-danger">{error}</p> : null}
    </div>
  );
}

