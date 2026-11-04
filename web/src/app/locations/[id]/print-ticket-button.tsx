import { CashIcon } from "@/components/ui/icons";
import { T } from "@/components/i18n/i18n-provider";

/**
 * Ticket de caisse : « Imprimer » ouvre la page imprimable du ticket (taille de papier réglée par la page :
 * 80 ou 58 mm, jamais A4), dont la fenêtre d'impression s'ouvre toute seule. « Ouvrir le PDF » donne le
 * même ticket en PDF, à enregistrer ou envoyer.
 */
export function PrintTicketButton({ printHref, pdfHref }: { printHref: string; pdfHref: string }) {
  return (
    <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
      <a
        href={printHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-14 flex-1 items-center justify-center gap-2.5 rounded-2xl bg-brand-orange px-4 text-sm font-black text-ink shadow-lg shadow-brand-orange/25 transition-all hover:brightness-110 active:scale-98"
      >
        <CashIcon className="h-5 w-5" />
        <span><T>Imprimer le ticket de caisse</T></span>
      </a>
      <a
        href={pdfHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-14 items-center justify-center rounded-2xl border border-brand-orange/40 bg-surface-raised px-5 text-sm font-extrabold text-brand-orange transition-all hover:bg-brand-orange/10 active:scale-98"
      >
        <T>Ouvrir le PDF</T>
      </a>
    </div>
  );
}
