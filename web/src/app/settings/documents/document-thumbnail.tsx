"use client";

import { useEffect, useRef, useState } from "react";
import { T, useT } from "@/components/i18n/i18n-provider";

/**
 * Vignette = le vrai PDF, sans barre d'outils. Le clic l'agrandit dans la page (pas de nouvel onglet), dans
 * un <dialog> natif : le focus clavier reste enfermé dedans, Échap le ferme, et le reste de la page est
 * inerte. Un clic hors du document ou la croix referme aussi. Le lecteur PDF ajoute une barre de défilement
 * et un liseré sombre : l'iframe de la vignette, un peu plus grande, est rognée par son cadre.
 */
export function DocumentThumbnail({ src, title, ratio }: { src: string; title: string; ratio: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const trigger = triggerRef.current;
    if (!dialog.open) dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onClose = () => setOpen(false);
    dialog.addEventListener("close", onClose);
    return () => {
      dialog.removeEventListener("close", onClose);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <div className={`relative overflow-hidden rounded-xl border border-border/15 bg-white ${ratio}`}>
        <iframe
          src={`${src}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
          title={t(title)}
          loading="lazy"
          tabIndex={-1}
          className="pointer-events-none absolute -left-1.5 -top-1.5 h-[calc(100%+26px)] w-[calc(100%+26px)] max-w-none"
        />
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Agrandir : ${title}`}
          className="absolute inset-0 cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-orange"
        />
      </div>

      {open ? (
        <dialog
          ref={dialogRef}
          aria-label={t(title)}
          className="m-auto h-[92dvh] w-[min(100%-1.5rem,48rem)] max-w-none overflow-hidden rounded-2xl border-0 bg-surface p-0 text-app-text backdrop:bg-black/70"
          onClick={(event) => {
            if (event.target === dialogRef.current) dialogRef.current?.close();
          }}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-border/15 px-4 py-2.5">
              <p className="truncate text-sm font-bold"><T>{title}</T></p>
              <button
                type="button"
                autoFocus
                onClick={() => dialogRef.current?.close()}
                aria-label={t("Fermer l'aperçu")}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-lg font-bold text-app-text-2 hover:bg-fg/10 hover:text-app-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <iframe src={`${src}#toolbar=0&navpanes=0&view=FitH`} title={t(title)} className="min-h-0 w-full flex-1 bg-white" />
          </div>
        </dialog>
      ) : null}
    </>
  );
}
