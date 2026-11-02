import Image from "next/image";
import { T } from "@/components/i18n/i18n-provider";

// Aperçu illustratif de l'application, dessiné en code avec les jetons du thème : net à toute
// taille, suit le mode clair/sombre, aucune donnée réelle. Purement décoratif (aria-hidden) ;
// la légende sous l'aperçu précise que ce n'est pas une capture.

const KPI = [
  { label: "Disponibles", value: "6", tone: "text-emerald-600 dark:text-emerald-400" },
  { label: "Occupés", value: "3", tone: "text-fg" },
  { label: "Recettes", value: "85 000", unit: "FCFA", tone: "text-fg" },
] as const;

const HOMES = [
  { name: "Studio Mermoz", meta: "Occupé jusqu'au 18 oct.", price: "25 000", busy: true },
  { name: "Chambre Almadies 2", meta: "Disponible", price: "18 000", busy: false },
  { name: "Appartement Ngor", meta: "Réservé le 20 oct.", price: "45 000", busy: true },
  { name: "Chambre Point E", meta: "Disponible", price: "15 000", busy: false },
] as const;

function StatusDot({ busy }: { busy: boolean }) {
  return (
    <span
      className={`h-2 w-2 shrink-0 rounded-full ${busy ? "bg-(--accent)" : "bg-emerald-500"}`}
    />
  );
}

export function DashboardPreview() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-2xl border border-border/20 bg-surface-raised shadow-card"
    >
      <div className="flex items-center gap-1.5 border-b border-border/15 bg-surface-sunken px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-border/40" />
        <span className="h-2.5 w-2.5 rounded-full bg-border/40" />
        <span className="h-2.5 w-2.5 rounded-full bg-border/40" />
        <span className="ms-3 rounded-md bg-surface px-3 py-0.5 text-[10px] font-semibold text-muted">
          <T>Résidence Almadies</T>
        </span>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {KPI.map((item) => (
            <div key={item.label} className="rounded-xl border border-border/15 bg-surface p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted"><T>{item.label}</T></p>
              <p className={`mt-1 whitespace-nowrap text-lg font-extrabold tabular-nums sm:text-2xl ${item.tone}`}>
                {item.value}
                {"unit" in item ? <span className="ms-1 hidden text-[10px] font-bold text-muted min-[430px]:inline">{item.unit}</span> : null}
              </p>
            </div>
          ))}
        </div>

        <ul className="divide-y divide-border/10 rounded-xl border border-border/15 bg-surface">
          {HOMES.map((home) => (
            <li key={home.name} className="flex items-center gap-3 px-3.5 py-3">
              <StatusDot busy={home.busy} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-fg"><T>{home.name}</T></p>
                <p className="truncate text-xs text-muted">
                  <T>{home.meta}</T> · <span className="font-semibold tabular-nums">{home.price} <T>FCFA / nuit</T></span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function PhonePreview() {
  return (
    <div
      aria-hidden="true"
      className="w-52 overflow-hidden rounded-[1.75rem] border-[6px] border-surface-sunken bg-surface shadow-card ring-1 ring-border/25"
    >
      <div className="space-y-3 p-3.5">
        <p className="text-xs font-extrabold text-fg"><T>Caisse du jour</T></p>
        <div className="rounded-xl bg-(--accent) p-3 text-(--accent-ink)">
          <p className="text-[9px] font-bold uppercase tracking-wide opacity-80"><T>Encaissé</T></p>
          <p className="text-lg font-extrabold tabular-nums"><T>85 000 FCFA</T></p>
        </div>
        <ul className="space-y-2">
          {[
            { logo: "/images/payments/wave.png", name: "Wave", amount: "40 000" },
            { logo: "/images/payments/orange-money.png", name: "Orange Money", amount: "25 000" },
          ].map((row) => (
            <li key={row.name} className="flex items-center gap-2 rounded-lg border border-border/15 px-2 py-1.5">
              <Image src={row.logo} alt="" width={20} height={20} className="h-5 w-5 rounded-md" />
              <span className="flex-1 text-[10px] font-semibold text-fg"><T>{row.name}</T></span>
              <span className="text-[10px] font-bold tabular-nums text-fg">{row.amount}</span>
            </li>
          ))}
          <li className="flex items-center gap-2 rounded-lg border border-border/15 px-2 py-1.5">
            <span className="h-5 w-5 rounded-md bg-surface-sunken" />
            <span className="flex-1 text-[10px] font-semibold text-fg"><T>Espèces</T></span>
            <span className="text-[10px] font-bold tabular-nums text-fg">20 000</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

/** Mini-planning de la tuile « Réservations » : 4 logements × 7 jours, barres d'occupation. */
export function PlanningPreview() {
  const rows = [
    { name: "Studio Mermoz", start: 1, span: 4 },
    { name: "Chambre Almadies", start: 4, span: 3 },
    { name: "Appartement Ngor", start: 2, span: 5 },
    { name: "Chambre Point E", start: 1, span: 2 },
  ];
  return (
    <div aria-hidden="true" className="mt-5 space-y-2 rounded-xl border border-border/15 bg-surface p-3">
      {rows.map((row) => (
        <div key={row.name} className="grid grid-cols-[6.5rem_1fr] items-center gap-3 sm:grid-cols-[8rem_1fr]">
          <span className="truncate text-[11px] font-semibold text-muted"><T>{row.name}</T></span>
          <div className="grid h-5 grid-cols-7 gap-0.5 rounded-md bg-surface-sunken">
            <span
              className="rounded bg-(--accent)"
              style={{ gridColumn: `${row.start} / span ${row.span}` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
