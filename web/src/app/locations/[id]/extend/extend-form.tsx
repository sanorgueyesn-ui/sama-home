"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkExtensionAvailability, extendRental } from "@/app/actions/rentals";
import { formatDuration, type DurationUnitValue } from "@/lib/duration";

type TariffOption = {
  id: string;
  label: string;
  durationValue: number;
  durationUnit: DurationUnitValue;
  amount: number;
};

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}

export function ExtendForm({
  rentalId,
  currentPlannedDeparture,
  tariffOptions,
}: {
  rentalId: string;
  currentPlannedDeparture: string; // ISO
  tariffOptions: TariffOption[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(tariffOptions[0]?.id ?? "");
  const [availability, setAvailability] = useState<{
    checking: boolean;
    available: boolean | null;
    message?: string;
    newEnd?: string;
  }>({ checking: false, available: null });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    // Every state update happens inside the timeout callback, never
    // synchronously in the effect body (see reservation-form.tsx for the
    // same pattern and why).
    debounceRef.current = setTimeout(async () => {
      if (!selectedId) {
        setAvailability({ checking: false, available: null });
        return;
      }
      setAvailability((prev) => ({ ...prev, checking: true }));
      const result = await checkExtensionAvailability({ rentalId, tariffId: selectedId });
      setAvailability({ checking: false, available: result.available, message: result.message, newEnd: result.newEnd });
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [rentalId, selectedId]);

  function handleConfirm() {
    if (!selectedId) return;
    setSubmitError(null);
    startTransition(async () => {
      const result = await extendRental(rentalId, selectedId);
      if (result.error) {
        setSubmitError(result.error);
      } else {
        router.push(`/locations/${rentalId}?extended=1`);
      }
    });
  }

  if (tariffOptions.length === 0) {
    return (
      <p className="rounded-xl bg-warning-bg px-4 py-3 text-sm font-semibold text-warning">
        Aucun tarif actif n&apos;est configuré pour ce logement — impossible de proposer une prolongation
        chiffrée. Ajoutez un tarif depuis la fiche du logement.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-paper px-4 py-3">
        <p className="text-xs font-bold text-navy/60">Fin actuelle</p>
        <p className="mt-0.5 text-lg font-extrabold text-navy">
          {new Date(currentPlannedDeparture).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold text-navy">Choisir une prolongation</p>
        <div className="flex flex-wrap gap-2">
          {tariffOptions.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedId(t.id)}
              className={`rounded-full px-4 py-2.5 text-xs font-bold ${
                selectedId === t.id ? "bg-navy text-white" : "bg-paper text-navy"
              }`}
            >
              +{formatDuration(t.durationValue, t.durationUnit)} — {fmtFcfa(t.amount)}
            </button>
          ))}
        </div>
      </div>

      {availability.checking ? (
        <p className="text-xs font-semibold text-navy/50">Vérification de la disponibilité...</p>
      ) : availability.available === true ? (
        <div className="flex items-center gap-2.5 rounded-xl bg-success-bg px-4 py-3 text-success">
          <span className="h-2 w-2 rounded-full bg-success" />
          <span className="text-sm font-extrabold">
            Disponible jusqu&apos;à{" "}
            {availability.newEnd
              ? new Date(availability.newEnd).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit" })
              : "—"}
          </span>
        </div>
      ) : availability.available === false ? (
        <div className="flex flex-col gap-1 rounded-xl bg-danger-bg px-4 py-3 text-danger">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-danger" />
            <span className="text-sm font-extrabold">Prolongation impossible</span>
          </div>
          {availability.message ? <p className="text-xs font-medium">{availability.message}</p> : null}
        </div>
      ) : null}

      {submitError ? (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {submitError}
        </p>
      ) : null}

      <button
        type="button"
        disabled={pending || availability.available !== true}
        onClick={handleConfirm}
        className="mt-1 h-14 rounded-2xl bg-navy text-base font-extrabold tracking-wide text-white disabled:opacity-40"
      >
        {pending ? "Enregistrement..." : "CONFIRMER LA PROLONGATION"}
      </button>
    </div>
  );
}
