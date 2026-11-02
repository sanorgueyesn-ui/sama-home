// Indicateurs hôteliers : calculs purs (aucune base). Les recettes sont celles de la page Rapports
// (paiements réellement encaissés dans la période) : ce sont donc des indicateurs de CAISSE, pas des
// chiffres comptables.
import { coversDay, planningDays } from "@/lib/planning";

export type StayInterval = { propertyId: string; start: Date; end: Date };

export type HotelKpis = {
  /** Jours écoulés de la période (jusqu'à aujourd'hui inclus), au plus. */
  elapsedDays: number;
  availableNights: number;
  occupiedNights: number;
  /** Pourcentage entier, 0 si aucune nuit disponible. */
  occupancyPercent: number;
  /** Recette moyenne par nuit occupée ; null si aucune nuit occupée. */
  revenuePerOccupiedNight: number | null;
  /** Recette par chambre disponible (RevPAR) ; null si aucune nuit disponible. */
  revenuePerAvailableNight: number | null;
};

const DAY_MS = 86_400_000;

/** Nombre de jours de [from, to) déjà écoulés à `now`, borné à [0, durée]. */
export function elapsedDaysInRange(from: Date, to: Date, now: Date): number {
  const end = Math.min(to.getTime(), now.getTime() + DAY_MS); // le jour en cours compte
  const startDay = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const endDay = Date.UTC(new Date(end).getUTCFullYear(), new Date(end).getUTCMonth(), new Date(end).getUTCDate());
  return Math.max(0, Math.round((Math.min(endDay, to.getTime()) - startDay) / DAY_MS));
}

export function computeHotelKpis(input: { from: Date; to: Date; now: Date; propertyCount: number; stays: StayInterval[]; revenue: number }): HotelKpis {
  const elapsedDays = elapsedDaysInRange(input.from, input.to, input.now);
  const days = planningDays(input.from, elapsedDays);
  const nightsPerProperty = new Map<string, Set<number>>();
  for (const stay of input.stays) {
    if (stay.end.getTime() <= stay.start.getTime()) continue;
    const set = nightsPerProperty.get(stay.propertyId) ?? new Set<number>();
    days.forEach((day, index) => {
      if (coversDay(stay, day)) set.add(index);
    });
    nightsPerProperty.set(stay.propertyId, set);
  }
  // Une chambre n'est occupée qu'une fois par jour, même si deux séjours se chevauchent par erreur.
  let occupiedNights = 0;
  for (const set of nightsPerProperty.values()) occupiedNights += set.size;

  const availableNights = input.propertyCount * elapsedDays;
  occupiedNights = Math.min(occupiedNights, availableNights);
  return {
    elapsedDays,
    availableNights,
    occupiedNights,
    occupancyPercent: availableNights === 0 ? 0 : Math.round((occupiedNights / availableNights) * 100),
    revenuePerOccupiedNight: occupiedNights === 0 ? null : Math.round(input.revenue / occupiedNights),
    revenuePerAvailableNight: availableNights === 0 ? null : Math.round(input.revenue / availableNights),
  };
}
