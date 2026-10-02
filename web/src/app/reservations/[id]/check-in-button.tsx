"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkInReservation } from "@/app/actions/rentals";
import { checkRetroactiveArrival, RETROACTIVE_TOLERANCE_MINUTES } from "@/lib/retroactive-checkin";

function nowDateIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function nowTimeIso() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Bloc 21 — arrivée rétroactive. Cas normal inchangé : un clic, confirm(),
 * "maintenant" (aucune option passée à checkInReservation). Le lien "Heure
 * d'arrivée différente ?" déplie un petit formulaire ; dès que l'heure
 * saisie sort de la tolérance technique, le bandeau + la justification
 * apparaissent. Ce contrôle client (checkRetroactiveArrival) n'est qu'un
 * retour visuel immédiat — le serveur revalide intégralement et reste la
 * seule source de vérité.
 */
export function CheckInButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showRetroactive, setShowRetroactive] = useState(false);
  const [date, setDate] = useState(nowDateIso());
  const [time, setTime] = useState(nowTimeIso());
  const [reason, setReason] = useState("");

  // IMPORTANT : `isRetroactive` (affiche le champ justification) est dérivé
  // INDÉPENDAMMENT de `retroCheck.ok` (bloque la soumission). Sinon, tant que
  // la justification est vide, checkRetroactiveArrival renvoie `ok:false` et
  // le champ qui sert justement à la remplir n'apparaîtrait jamais — un
  // verrou. Le champ doit apparaître dès que l'écart dépasse la tolérance,
  // quelle que soit la justification actuelle.
  const isRetroactive = useMemo(() => {
    const actual = new Date(`${date}T${time}:00`);
    if (Number.isNaN(actual.getTime())) return false;
    return new Date().getTime() - actual.getTime() > RETROACTIVE_TOLERANCE_MINUTES * 60_000;
  }, [date, time]);

  const retroCheck = useMemo(() => {
    const actual = new Date(`${date}T${time}:00`);
    if (Number.isNaN(actual.getTime())) return null;
    return checkRetroactiveArrival(new Date(), actual, reason);
  }, [date, time, reason]);

  const blockedMessage = retroCheck?.ok === false ? retroCheck.message : null;

  function handleCheckInNow() {
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

  function handleCheckInRetroactive() {
    if (!confirm("Confirmer l'enregistrement de cette arrivée ?")) return;
    setError(null);
    startTransition(async () => {
      const actual = new Date(`${date}T${time}:00`);
      const result = await checkInReservation(id, {
        actualArrivalAt: actual.toISOString(),
        reason,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  if (!showRetroactive) {
    return (
      <div>
        <button
          type="button"
          disabled={pending}
          onClick={handleCheckInNow}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-navy text-sm font-extrabold text-white disabled:opacity-60"
        >
          {pending ? "..." : "Faire entrer"}
        </button>
        <button
          type="button"
          onClick={() => setShowRetroactive(true)}
          className="mt-2 w-full text-center text-xs font-bold text-navy underline"
        >
          Heure d&apos;arrivée différente ?
        </button>
        {error ? <p className="mt-1.5 text-center text-xs font-medium text-danger">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-navy/15 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-extrabold text-navy">Heure réelle d&apos;arrivée</p>
        <button
          type="button"
          onClick={() => setShowRetroactive(false)}
          className="text-xs font-bold text-navy/50 underline"
        >
          Annuler
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-3 text-sm text-navy outline-none focus:border-navy"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-3 text-sm text-navy outline-none focus:border-navy"
        />
      </div>

      {isRetroactive ? (
        <>
          <div className="rounded-xl bg-warning-bg px-3 py-2.5">
            <p className="text-xs font-extrabold text-warning">Arrivée rétroactive</p>
            <p className="mt-0.5 text-xs font-medium text-warning">
              Cette arrivée sera enregistrée avec l&apos;heure réelle saisie. Maximum autorisé : 24 heures en
              arrière.
            </p>
          </div>
          <div>
            <label htmlFor="checkin-reason" className="mb-1.5 block text-xs font-bold text-navy">
              Justification
            </label>
            <textarea
              id="checkin-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex. Client arrivé avant l'enregistrement."
              className="min-h-16 w-full resize-none rounded-xl border border-navy/15 bg-paper px-3 py-2 text-sm text-navy outline-none focus:border-navy"
            />
          </div>
        </>
      ) : null}

      {blockedMessage ? <p className="text-xs font-medium text-danger">{blockedMessage}</p> : null}

      <button
        type="button"
        disabled={pending || Boolean(blockedMessage)}
        onClick={handleCheckInRetroactive}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-navy text-sm font-extrabold text-white disabled:opacity-40"
      >
        {pending ? "..." : "Confirmer l'arrivée"}
      </button>
      {error ? <p className="text-center text-xs font-medium text-danger">{error}</p> : null}
    </div>
  );
}
