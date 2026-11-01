import type { ReservationStatus } from "@/generated/prisma/client";

/**
 * Vues temporelles de la liste des réservations. Module pur (aucun accès
 * base, aucun `server-only`) pour que la logique de chaque vue soit testable
 * isolément ; `listReservations()` (reservations-data.ts) n'y ajoute que
 * l'établissement, le logement, le client, le statut et la recherche.
 *
 * - today     : arrivée prévue aujourd'hui (jour calendaire), tous statuts.
 * - upcoming  : "à venir" = arrivée future, OU réservation encore CONFIRMÉE
 *               dont l'arrivée prévue est dépassée mais dont le départ prévu
 *               ne l'est pas (client en retard / arrivée oubliée) — elle ne
 *               doit pas disparaître tant qu'une arrivée légitime est possible.
 * - pending   : "en attente d'arrivée" = CONFIRMÉE dont l'arrivée prévue est
 *               dépassée, quelle que soit la date de départ (régularisation).
 * - past      : départ prévu dépassé, hors annulées.
 * - cancelled : annulées.
 * - all       : aucune contrainte temporelle.
 */
export type ReservationTimeFilter = "today" | "upcoming" | "pending" | "past" | "cancelled" | "all";

export const RESERVATION_TIME_FILTERS: ReservationTimeFilter[] = [
  "upcoming",
  "pending",
  "today",
  "past",
  "cancelled",
  "all",
];

export type ReservationTimeWhere = {
  date?: { gte: Date; lt: Date };
  arrivalTime?: { gte?: Date; lt?: Date };
  departureTime?: { gte?: Date; lt?: Date };
  status?: ReservationStatus | { not: ReservationStatus };
  OR?: ReservationTimeWhere[];
};

export function buildReservationTimeWhere(filter: ReservationTimeFilter, now: Date): ReservationTimeWhere {
  switch (filter) {
    case "today": {
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(startOfToday);
      endOfToday.setDate(endOfToday.getDate() + 1);
      return { date: { gte: startOfToday, lt: endOfToday } };
    }
    case "upcoming":
      return {
        status: { not: "CANCELLED" },
        OR: [
          { arrivalTime: { gte: now } },
          { status: "CONFIRMED", arrivalTime: { lt: now }, departureTime: { gte: now } },
        ],
      };
    case "pending":
      return { status: "CONFIRMED", arrivalTime: { lt: now } };
    case "past":
      return { departureTime: { lt: now }, status: { not: "CANCELLED" } };
    case "cancelled":
      return { status: "CANCELLED" };
    case "all":
      return {};
  }
}

/** Réservation confirmée dont l'heure d'arrivée prévue est dépassée (arrivée à enregistrer). */
export function isArrivalOverdue(status: string, arrivalTime: Date, now: Date): boolean {
  return status === "CONFIRMED" && arrivalTime.getTime() < now.getTime();
}

export type ArrivalTiming = "EARLY" | "ON_TIME" | "LATE";

/** Écart toléré (minutes) avant de parler d'arrivée anticipée / tardive. */
export const ARRIVAL_TIMING_TOLERANCE_MINUTES = 5;

export function classifyArrivalTiming(plannedArrival: Date, actualArrival: Date): ArrivalTiming {
  const diffMin = (actualArrival.getTime() - plannedArrival.getTime()) / 60_000;
  if (diffMin < -ARRIVAL_TIMING_TOLERANCE_MINUTES) return "EARLY";
  if (diffMin > ARRIVAL_TIMING_TOLERANCE_MINUTES) return "LATE";
  return "ON_TIME";
}

/**
 * Message affichable pour un échec de transaction (arrivée / annulation).
 * Aucune donnée interne (SQL, trace, identifiants) n'est jamais renvoyée.
 */
export function describeTransactionFailure(error: unknown, fallback: string): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
  const message = error instanceof Error ? error.message : "";
  if (code === "P2034" || /serializ|write conflict|deadlock/i.test(message)) {
    return "Une autre opération est en cours sur ce logement. Rien n'a été enregistré : réessayez dans quelques secondes.";
  }
  if (code === "P2002") {
    return "Cette réservation a déjà donné lieu à une arrivée.";
  }
  return fallback;
}

/**
 * `redirect()` appelé dans une Server Action fait REJETER la promesse côté
 * client (Next 16 : server-action-reducer) avec une erreur dont le `digest`
 * commence par "NEXT_REDIRECT". Un `catch` générique doit la relancer : ce
 * n'est ni une panne réseau ni une erreur serveur, c'est une réussite qui
 * déclenche la navigation.
 */
export function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
