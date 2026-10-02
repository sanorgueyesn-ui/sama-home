// Jeu d'icônes dédié aux cartes statistiques du dashboard — même langage
// visuel (trait fin, coins arrondis) que les icônes déjà existantes dans
// AppShell/PropertyHero, sans dépendance à elles (ce sont des fonctions
// locales non exportées, propres à la navigation). Aucune nouvelle
// dépendance : SVG inline uniquement.
import type { SVGProps } from "react";

function base(props: SVGProps<SVGSVGElement>) {
  return {
    // Taille pilotée par la classe CSS passée par l'appelant (StatCard), pas
    // par des attributs XML fixes — nécessaire pour un dimensionnement
    // responsive (h-4 w-4 md:h-3.5 md:w-3.5) avec une seule instance d'icône.
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

/** Logements disponibles — porte + coche. */
export function AvailableIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="3" width="10" height="18" rx="1" />
      <path d="M11.5 12h.01" />
      <circle cx="18.5" cy="17.5" r="4" />
      <path d="M16.8 17.6l1.1 1.1 2-2.2" />
    </svg>
  );
}

/** Logements occupés — silhouette. */
export function OccupiedIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c0-3.6 2.8-5.6 7-5.6s7 2 7 5.6" />
    </svg>
  );
}

/** Réservations — calendrier. */
export function ReservationsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 9.5h16" />
      <path d="M8 3v3M16 3v3" />
      <circle cx="9" cy="14" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Recettes — portefeuille + flèche entrante. */
export function RevenueIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="6.5" width="15" height="12" rx="2" />
      <path d="M3.5 10h15" />
      <path d="M20.5 4.5v5M20.5 9.5l-2.2-2.2M20.5 9.5l2.2-2.2" />
    </svg>
  );
}

/** Dépenses — portefeuille + flèche sortante. */
export function ExpenseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="6.5" width="15" height="12" rx="2" />
      <path d="M3.5 10h15" />
      <path d="M20.5 9.5v-5M20.5 4.5l-2.2 2.2M20.5 4.5l2.2 2.2" />
    </svg>
  );
}

/** Solde — balance à deux plateaux. */
export function BalanceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 3v15" />
      <path d="M6 7h12" />
      <path d="M9 18h6" />
      <path d="M3.5 11.5 6 7l2.5 4.5a2.5 2.5 0 0 1-5 0Z" />
      <path d="M15.5 11.5 18 7l2.5 4.5a2.5 2.5 0 0 1-5 0Z" />
    </svg>
  );
}
