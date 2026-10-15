/** Reprend 4 fonctionnalités réellement livrées dans ce projet — jamais une promesse inventée. */
const FEATURES = [
  {
    label: "Réservations en ligne",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 9h18M8 2v4M16 2v4" />
      </svg>
    ),
  },
  {
    label: "Gestion de vos logements",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M6 10v9.5a.5.5 0 0 0 .5.5H10v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20h3.5a.5.5 0 0 0 .5-.5V10" />
      </svg>
    ),
  },
  {
    label: "Suivi des locataires",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3.2" />
        <path d="M2.8 19.5c0-3.6 2.8-5.6 6.2-5.6s6.2 2 6.2 5.6" />
        <circle cx="17" cy="8.5" r="2.4" />
        <path d="M15.6 14c2.7.3 4.6 2.1 4.6 5.3" />
      </svg>
    ),
  },
  {
    label: "Rapports et revenus",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V10M12 20V4M20 20v-7" />
      </svg>
    ),
  },
];

export function FeatureList() {
  return (
    <ul className="mt-7 flex flex-col gap-3.5">
      {FEATURES.map((feature) => (
        <li key={feature.label} className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
            {feature.icon}
          </span>
          <span className="text-sm font-semibold text-white/90">{feature.label}</span>
        </li>
      ))}
    </ul>
  );
}
