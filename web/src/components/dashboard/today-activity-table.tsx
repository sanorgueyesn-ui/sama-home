import Link from "next/link";
import type { ReactNode } from "react";
import { T } from "@/components/i18n/i18n-provider";
import { dateLocale } from "@/lib/i18n/date-locale";

export type ActivityRow = {
  id: string;
  href: string;
  time: Date;
  clientName: string;
  propertyName: string;
  typeLabel: string;
  amount: number;
  badge: ReactNode;
};

function fmtTime(d: Date) {
  return new Intl.DateTimeFormat(dateLocale(), { hour: "2-digit", minute: "2-digit" }).format(d);
}
function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}

/**
 * "Locations et réservations du jour" — maquette tablette (colonnes Heure/
 * Client/Logement/Type/Statut) vs PC (ajoute Montant). Un seul composant :
 * la colonne Montant est simplement masquée via `showAmount` plutôt que
 * dupliquer la table pour chaque largeur.
 */
export function TodayActivityTable({ rows, showAmount }: { rows: ActivityRow[]; showAmount: boolean }) {
  if (rows.length === 0) {
    return <p className="mt-2.5 text-sm font-medium text-fg/50"><T>Aucune activité aujourd&apos;hui.</T></p>;
  }
  return (
    // overflow-x-auto confiné à la table elle-même : un <table> en
    // table-layout:auto (défaut navigateur) ne se comprime jamais sous la
    // largeur minimale de son contenu, même avec width:100%. Plutôt que de
    // masquer un éventuel débordement (overflow-x-hidden sur la page, exclu),
    // on lui donne son propre défilement local — rien n'est jamais coupé, la
    // page elle-même ne peut plus être poussée plus large que l'écran.
    <div className="mt-2.5 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs font-bold text-fg/50">
            <th className="pb-2 pr-3 font-bold"><T>Heure</T></th>
            <th className="pb-2 pr-3 font-bold"><T>Client</T></th>
            <th className="pb-2 pr-3 font-bold"><T>Logement</T></th>
            <th className="pb-2 pr-3 font-bold"><T>Type</T></th>
            {showAmount ? <th className="pb-2 pr-3 font-bold"><T>Montant</T></th> : null}
            <th className="pb-2 font-bold"><T>Statut</T></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-border/10">
              <td className="py-2.5 pr-3 font-semibold text-fg">{fmtTime(row.time)}</td>
              <td className="py-2.5 pr-3">
                <Link href={row.href} className="font-bold text-fg hover:underline">
                  {row.clientName}
                </Link>
              </td>
              <td className="py-2.5 pr-3 text-fg/70">{row.propertyName}</td>
              <td className="py-2.5 pr-3 text-fg/70">{row.typeLabel}</td>
              {showAmount ? <td className="py-2.5 pr-3 font-semibold text-fg">{fmtFcfa(row.amount)}</td> : null}
              <td className="py-2.5">{row.badge}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
