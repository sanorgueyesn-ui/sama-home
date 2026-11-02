// Grille des chambres : règles pures (aucune base). Un jour est « pris » quand un séjour ou une
// réservation recouvre l'intervalle [début du jour, début du jour suivant). Le Sénégal est en UTC
// toute l'année (pas d'heure d'été) : les jours calendaires sont donc des jours UTC.

export type PlanningBooking = {
  id: string;
  kind: "STAY" | "RESERVATION";
  propertyId: string;
  start: Date;
  end: Date;
};

export type PlanningCell = {
  /** Séjour en cours ou réservation confirmée ; « STAY » l'emporte si les deux touchent le jour. */
  state: "FREE" | "STAY" | "RESERVED";
  /** Réservation ou séjour qui occupe le jour (le premier, par heure de début). */
  bookingId: string | null;
  kind: PlanningBooking["kind"] | null;
};

const DAY_MS = 86_400_000;

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function planningDays(from: Date, count: number): Date[] {
  const first = startOfUtcDay(from).getTime();
  return Array.from({ length: count }, (_, index) => new Date(first + index * DAY_MS));
}

/** Recouvrement semi-ouvert [début, fin) : un séjour qui se termine à minuit pile n'occupe pas le jour suivant. */
export function coversDay(booking: Pick<PlanningBooking, "start" | "end">, day: Date): boolean {
  const dayStart = day.getTime();
  const dayEnd = dayStart + DAY_MS;
  return booking.start.getTime() < dayEnd && booking.end.getTime() > dayStart;
}

export function buildPlanningGrid(propertyIds: string[], bookings: PlanningBooking[], days: Date[]): Map<string, PlanningCell[]> {
  const byProperty = new Map<string, PlanningBooking[]>();
  for (const booking of bookings) {
    if (booking.end.getTime() <= booking.start.getTime()) continue; // intervalle vide ou inversé : ignoré
    const list = byProperty.get(booking.propertyId) ?? [];
    list.push(booking);
    byProperty.set(booking.propertyId, list);
  }
  const grid = new Map<string, PlanningCell[]>();
  for (const propertyId of propertyIds) {
    const list = (byProperty.get(propertyId) ?? []).slice().sort((a, b) => a.start.getTime() - b.start.getTime());
    grid.set(
      propertyId,
      days.map((day): PlanningCell => {
        const hits = list.filter((booking) => coversDay(booking, day));
        const stay = hits.find((booking) => booking.kind === "STAY");
        const chosen = stay ?? hits[0];
        if (!chosen) return { state: "FREE", bookingId: null, kind: null };
        return { state: chosen.kind === "STAY" ? "STAY" : "RESERVED", bookingId: chosen.id, kind: chosen.kind };
      }),
    );
  }
  return grid;
}

/** Part des cases occupées (séjour ou réservation) sur la période affichée, en pourcentage entier. */
export function occupiedShare(grid: Map<string, PlanningCell[]>): number {
  let total = 0;
  let occupied = 0;
  for (const cells of grid.values()) {
    for (const cell of cells) {
      total += 1;
      if (cell.state !== "FREE") occupied += 1;
    }
  }
  return total === 0 ? 0 : Math.round((occupied / total) * 100);
}
