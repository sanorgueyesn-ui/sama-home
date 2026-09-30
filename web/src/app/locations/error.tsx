"use client";

import { useEffect } from "react";

export default function LocationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-bg text-danger">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v4.5" />
          <path d="M10.3 3.9 1.9 18.5A1.8 1.8 0 0 0 3.5 21h17a1.8 1.8 0 0 0 1.6-2.5L13.7 3.9a1.8 1.8 0 0 0-3.4 0Z" />
        </svg>
      </div>
      <p className="text-base font-extrabold text-navy">Impossible de charger les locations</p>
      <p className="mt-1.5 max-w-xs text-sm text-navy/60">
        Une erreur inattendue est survenue. Vérifiez votre connexion et réessayez.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 h-11 rounded-xl bg-navy px-6 text-sm font-bold text-white"
      >
        RÉESSAYER
      </button>
    </div>
  );
}
