"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { checkInReservation } from "@/app/actions/rentals";
import { checkRetroactiveArrival, RETROACTIVE_TOLERANCE_MINUTES } from "@/lib/retroactive-checkin";
import { classifyArrivalTiming, isNextRedirectError } from "@/lib/reservation-filters";
import { computeDepartureTime, formatDuration, type DurationUnitValue } from "@/lib/duration";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { T, useT } from "@/components/i18n/i18n-provider";
import { dateLocale } from "@/lib/i18n/date-locale";

type ClientOption = { id: string; name: string; phone: string };

export type CheckInSummary = {
  clientName: string | null;
  propertyName: string;
  /** Arrivée prévue (ISO) — jamais modifiée par l'arrivée réelle. */
  plannedArrivalIso: string;
  durationValue: number;
  durationUnit: DurationUnitValue;
};

const fmtDateTime = (d: Date) =>
  d.toLocaleString(dateLocale(), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function nowDateIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function nowTimeIso() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Bloc 21 — arrivée rétroactive. Cas normal inchangé : un clic + confirmation intégrée (ConfirmDialog),
 * "maintenant" (aucune option passée à checkInReservation). Le lien "Heure
 * d'arrivée différente ?" déplie un petit formulaire ; dès que l'heure
 * saisie sort de la tolérance technique, le bandeau + la justification
 * apparaissent. Ce contrôle client (checkRetroactiveArrival) n'est qu'un
 * retour visuel immédiat — le serveur revalide intégralement et reste la
 * seule source de vérité.
 *
 * Mini-lot "Check-in — identifier le client manquant" : quand `needsClient`
 * est vrai (réservation courte sans client, voir reservations/[id]/page.tsx),
 * un petit écran de sélection de client précède les deux parcours
 * ci-dessus — ni l'un ni l'autre n'est accessible tant qu'un client n'a pas
 * été choisi. Le flux "maintenant" et le flux rétroactif réutilisent
 * ensuite exactement les mêmes handlers, avec clientId en plus.
 */
export function CheckInButton({
  id,
  needsClient,
  clients,
  initialClientId,
  summary,
}: {
  id: string;
  summary: CheckInSummary;
  /** Vrai uniquement si la réservation n'a pas encore de client (séjour
   * court, lot "Reservation — client facultatif") — jamais recalculé ici,
   * toujours transmis par la page serveur. */
  needsClient: boolean;
  clients: ClientOption[];
  /** Pré-sélectionné au retour de "+ Nouveau client" (searchParam clientId). */
  initialClientId?: string;
}) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showRetroactive, setShowRetroactive] = useState(false);
  const [date, setDate] = useState(nowDateIso());
  const [time, setTime] = useState(nowTimeIso());
  const [reason, setReason] = useState("");
  const [clientId, setClientId] = useState(initialClientId ?? "");
  // Confirmation intégrée (remplace window.confirm) : quel parcours attend
  // la validation, et à quel instant la fenêtre a été ouverte (pour les
  // indications "avance / retard", figées pendant l'affichage).
  const [confirming, setConfirming] = useState<{ mode: "now" | "retro"; openedAt: number } | null>(null);

  const selectedClient = clients.find((c) => c.id === clientId);
  const newClientHref = `/clients/new?returnTo=${encodeURIComponent(pathname)}`;

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

  function runCheckIn(mode: "now" | "retro") {
    setError(null);
    const retroArrival = new Date(`${date}T${time}:00`);
    if (mode === "retro" && Number.isNaN(retroArrival.getTime())) {
      setError("Heure d'arrivée invalide : renseignez une date et une heure.");
      return;
    }
    startTransition(async () => {
      try {
        const result =
          mode === "now"
            ? await checkInReservation(id, needsClient ? { clientId } : undefined)
            : await checkInReservation(id, {
                actualArrivalAt: retroArrival.toISOString(),
                reason,
                ...(needsClient ? { clientId } : {}),
              });
        if (result?.error) {
          setError(result.error);
        } else {
          setConfirming(null);
          router.refresh();
        }
      } catch (caught) {
        // Une redirection (arrivée réussie, session expirée) n'est pas un échec.
        if (isNextRedirectError(caught)) throw caught;
        setError("La connexion avec le serveur a échoué. Rien n'a été enregistré : vérifiez votre connexion puis réessayez.");
      }
    });
  }

  const plannedArrival = new Date(summary.plannedArrivalIso);
  const actualForDialog = confirming
    ? confirming.mode === "now"
      ? new Date(confirming.openedAt)
      : new Date(`${date}T${time}:00`)
    : null;
  const timing = actualForDialog && !Number.isNaN(actualForDialog.getTime())
    ? classifyArrivalTiming(plannedArrival, actualForDialog)
    : "ON_TIME";
  const estimatedDeparture =
    actualForDialog && !Number.isNaN(actualForDialog.getTime())
      ? computeDepartureTime(actualForDialog, summary.durationValue, summary.durationUnit)
      : null;

  const dialog = (
    <ConfirmDialog
      open={confirming !== null}
      title="Enregistrer l'arrivée du client"
      confirmLabel="Confirmer l'arrivée"
      pending={pending}
      error={error}
      onCancel={() => {
        setConfirming(null);
        setError(null);
      }}
      onConfirm={() => confirming && runCheckIn(confirming.mode)}
    >
      <p>
        <strong>{summary.clientName ?? selectedClient?.name ?? <T>{"Client"}</T>}</strong> — {summary.propertyName}
      </p>
      <p className="mt-1"><T>Arrivée prévue :</T> {fmtDateTime(plannedArrival)}</p>
      {actualForDialog ? <p><T>Arrivée enregistrée :</T> {fmtDateTime(actualForDialog)}</p> : null}
      {timing === "EARLY" ? (
        <p className="mt-2 rounded-xl bg-warning-bg px-3 py-2 text-xs font-bold text-warning">
          <T>Arrivée anticipée. Le séjour (</T>{formatDuration(summary.durationValue, summary.durationUnit)}<T>) est compté à partir de
          l&apos;arrivée réelle</T>{estimatedDeparture ? `, départ prévu ${fmtDateTime(estimatedDeparture)}` : ""}<T>. Le tarif et
          l&apos;acompte ne changent pas.</T>
        </p>
      ) : null}
      {timing === "LATE" ? (
        <p className="mt-2 rounded-xl bg-warning-bg px-3 py-2 text-xs font-bold text-warning">
          <T>Arrivée tardive. Le séjour (</T>{formatDuration(summary.durationValue, summary.durationUnit)}<T>) est compté à partir de
          l&apos;arrivée réelle</T>{estimatedDeparture ? `, départ prévu ${fmtDateTime(estimatedDeparture)}` : ""}<T>. Le tarif et
          l&apos;acompte ne changent pas.</T>
        </p>
      ) : null}
      <p className="mt-2 text-xs text-app-muted">
        <T>Une location sera créée si le logement est libre sur cette période ; sinon l&apos;arrivée sera refusée avec le détail
        du conflit.</T>
      </p>
    </ConfirmDialog>
  );

  // Réservation sans client : choisir d'abord un client avant d'offrir
  // "Faire entrer" ou l'arrivée rétroactive.
  if (needsClient && !clientId) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-app-line-strong p-4">
        <p className="text-sm font-bold text-fg"><T>Cette réservation n&apos;a pas encore de client.</T></p>
        <div>
          <label htmlFor="checkin-clientId" className="mb-1.5 block text-xs font-bold text-fg">
            <T>Choisir un client</T>
          </label>
          <select
            id="checkin-clientId"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="h-12 w-full rounded-xl border border-app-line-strong bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
          >
            <option value=""><T>Sélectionner un client...</T></option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <Link href={newClientHref} className="text-center text-xs font-bold text-fg underline">
          <T>+ Nouveau client</T>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {dialog}
      {needsClient && selectedClient ? (
        <div className="flex items-center justify-between rounded-xl bg-surface-sunken px-4 py-3">
          <div>
            <p className="text-[11px] font-bold text-app-muted">CLIENT</p>
            <p className="text-sm font-bold text-fg">{selectedClient.name}</p>
            <p className="text-xs font-semibold text-app-muted">{selectedClient.phone}</p>
          </div>
          <button type="button" onClick={() => setClientId("")} className="text-xs font-bold text-fg underline">
            <T>Changer</T>
          </button>
        </div>
      ) : null}

      {!showRetroactive ? (
        <div>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              setConfirming({ mode: "now", openedAt: Date.now() });
            }}
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-orange text-sm font-extrabold text-ink disabled:opacity-60"
          >
            {pending ? "..." : <T>{"Faire entrer"}</T>}
          </button>
          <button
            type="button"
            onClick={() => setShowRetroactive(true)}
            className="mt-2 w-full text-center text-xs font-bold text-fg underline"
          >
            <T>Heure d&apos;arrivée différente ?</T>
          </button>
          {error && !confirming ? <p role="alert" className="mt-1.5 text-center text-xs font-medium text-danger"><T>{error}</T></p> : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border border-app-line-strong p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-extrabold text-fg"><T>Heure réelle d&apos;arrivée</T></p>
            <button
              type="button"
              onClick={() => setShowRetroactive(false)}
              className="text-xs font-bold text-app-muted underline"
            >
              <T>Annuler</T>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 w-full rounded-xl border border-app-line-strong bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-12 w-full rounded-xl border border-app-line-strong bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
            />
          </div>

          {isRetroactive ? (
            <>
              <div className="rounded-xl bg-warning-bg px-3 py-2.5">
                <p className="text-xs font-extrabold text-warning"><T>Arrivée rétroactive</T></p>
                <p className="mt-0.5 text-xs font-medium text-warning">
                  <T>Cette arrivée sera enregistrée avec l&apos;heure réelle saisie. Maximum autorisé : 24 heures en
                  arrière.</T>
                </p>
              </div>
              <div>
                <label htmlFor="checkin-reason" className="mb-1.5 block text-xs font-bold text-fg">
                  <T>Justification</T>
                </label>
                <textarea
                  id="checkin-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("Ex. Client arrivé avant l'enregistrement.")}
                  className="min-h-16 w-full resize-none rounded-xl border border-app-line-strong bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
                />
              </div>
            </>
          ) : null}

          {blockedMessage ? <p className="text-xs font-medium text-danger">{blockedMessage}</p> : null}

          <button
            type="button"
            disabled={pending || Boolean(blockedMessage)}
            onClick={() => {
              setError(null);
              setConfirming({ mode: "retro", openedAt: Date.now() });
            }}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-brand-orange text-sm font-extrabold text-ink disabled:opacity-40"
          >
            {pending ? "..." : <T>{"Confirmer l'arrivée"}</T>}
          </button>
          {error && !confirming ? <p role="alert" className="text-center text-xs font-medium text-danger"><T>{error}</T></p> : null}
        </div>
      )}
    </div>
  );
}
