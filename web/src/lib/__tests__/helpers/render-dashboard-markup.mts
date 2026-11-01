// Rendu réel des trois tableaux de bord (Résidence, Hôtel, Agence), exécuté dans un processus enfant
// SANS la condition `react-server` (indisponible pour `react-dom/server`). Aucune base, aucune session :
// chaque vue est un composant de présentation pur qui reçoit un `DashboardOverview`. Ici, un jeu de
// données fixe et un espace vide. Sortie : JSON { scénario: balisage HTML }, lue par
// `dashboard-views.test.mts`.
//
// Les chiffres attendus par ce test viennent de ce jeu de données :
//   - recettes du jour 272 000 ; soldes à recouvrer 10 000 + 6 000 = 16 000 (2 séjours) ;
//   - 3 logements exploitables dont 2 occupés = 67 % (le 4e est indisponible, donc hors calcul) ;
//   - « Awa Diop » occupe la chambre r1 : son nom ne doit PAS apparaître dans les dernières occupations
//     de l'Hôtel.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DashboardResidenceView } from "../../../components/dashboard/dashboard-residence-view";
import { DashboardHotelView } from "../../../components/dashboard/dashboard-hotel-view";
import { DashboardAgencyView } from "../../../components/dashboard/dashboard-agency-view";
import { countUnits, pickRecentOccupied, summarizeReceivables } from "../../dashboard-metrics";
import type { DashboardOverview, DashboardStay, DashboardUnit } from "../../dashboard-overview";

// Jeudi 29 octobre 2026, 10 h (heure locale du processus).
const NOW = new Date(2026, 9, 29, 10, 0, 0);

function weekly(values: { revenue: number; expense: number }[]): DashboardOverview["weekly"] {
  return values.map((value, index) => ({ date: new Date(2026, 9, 23 + index), ...value }));
}

const units: DashboardUnit[] = [
  { id: "r1", name: "Chambre 1", type: "ROOM", status: "OCCUPIED" },
  { id: "r2", name: "Chambre 2", type: "ROOM", status: "OCCUPIED" },
  { id: "r3", name: "Chambre 3", type: "ROOM", status: "AVAILABLE" },
  { id: "a1", name: "Appartement A", type: "APARTMENT", status: "UNAVAILABLE" },
];

const activeStays: DashboardStay[] = [
  {
    id: "s1",
    propertyName: "Chambre 1",
    clientName: "Awa Diop",
    type: "ROOM",
    arrivalAt: new Date(2026, 9, 27, 14, 0),
    plannedDepartureAt: new Date(2026, 9, 30, 12, 0),
    amount: 60_000,
    remaining: 10_000,
  },
  {
    id: "s2",
    propertyName: "Chambre 2",
    clientName: "Cheikh Fall",
    type: "ROOM",
    arrivalAt: new Date(2026, 9, 28, 15, 0),
    plannedDepartureAt: new Date(2026, 9, 29, 12, 0),
    amount: 40_000,
    remaining: 6_000,
  },
];

function overviewOf(base: {
  spaceName: string;
  units: DashboardUnit[];
  activeStays: DashboardStay[];
  arrivals: DashboardOverview["arrivals"];
  upcomingReservations: number;
  revenue: DashboardOverview["revenue"];
  expenses: DashboardOverview["expenses"];
  weekly: DashboardOverview["weekly"];
  clientCount: number;
}): DashboardOverview {
  const receivables = summarizeReceivables(base.activeStays);
  return {
    spaceName: base.spaceName,
    userName: "Fatou Ndiaye",
    now: NOW,
    units: base.units,
    counts: countUnits(base.units),
    activeStays: base.activeStays,
    arrivals: base.arrivals,
    // Départs du jour : les séjours dont le départ prévu tombe aujourd'hui.
    departures: base.activeStays.filter((stay) => stay.plannedDepartureAt.toDateString() === NOW.toDateString()),
    upcomingReservations: base.upcomingReservations,
    revenue: base.revenue,
    expenses: base.expenses,
    receivables: { total: receivables.total, count: receivables.count, top: receivables.top },
    recentRooms: pickRecentOccupied(base.activeStays, "ROOM"),
    recentApartments: pickRecentOccupied(base.activeStays, "APARTMENT"),
    weekly: base.weekly,
    clientCount: base.clientCount,
  };
}

const filled = overviewOf({
  spaceName: "Résidence Almadies",
  units,
  activeStays,
  arrivals: [
    { id: "res1", propertyName: "Chambre 3", clientName: "Ibrahima Sarr", arrivalTime: new Date(2026, 9, 29, 16, 0), status: "CONFIRMED" },
  ],
  upcomingReservations: 3,
  revenue: { today: 272_000, month: 1_450_000, year: 9_800_000, paymentCountToday: 4 },
  expenses: { today: 15_000, month: 120_000 },
  weekly: weekly([
    { revenue: 90_000, expense: 10_000 },
    { revenue: 0, expense: 0 },
    { revenue: 150_000, expense: 25_000 },
    { revenue: 60_000, expense: 0 },
    { revenue: 210_000, expense: 40_000 },
    { revenue: 35_000, expense: 5_000 },
    { revenue: 272_000, expense: 15_000 },
  ]),
  clientCount: 12,
});

const empty = overviewOf({
  spaceName: "Espace vide",
  units: [],
  activeStays: [],
  arrivals: [],
  upcomingReservations: 0,
  revenue: { today: 0, month: 0, year: 0, paymentCountToday: 0 },
  expenses: { today: 0, month: 0 },
  weekly: weekly(Array.from({ length: 7 }, () => ({ revenue: 0, expense: 0 }))),
  clientCount: 0,
});

const out: Record<string, string> = {
  residence: renderToStaticMarkup(createElement(DashboardResidenceView, { overview: filled })),
  hotel: renderToStaticMarkup(createElement(DashboardHotelView, { overview: filled })),
  agency: renderToStaticMarkup(createElement(DashboardAgencyView, { overview: filled })),
  residenceEmpty: renderToStaticMarkup(createElement(DashboardResidenceView, { overview: empty })),
  hotelEmpty: renderToStaticMarkup(createElement(DashboardHotelView, { overview: empty })),
  agencyEmpty: renderToStaticMarkup(createElement(DashboardAgencyView, { overview: empty })),
};

process.stdout.write(JSON.stringify(out));
