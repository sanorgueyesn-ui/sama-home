"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Vignette = le vrai PDF, sans barre d'outils. Le clic l'agrandit dans la page (pas de nouvel onglet) ;
 * Échap, la croix ou un clic hors du document referme. Le lecteur PDF ajoute une barre de défilement et
 * un liseré sombre : l'iframe, un peu plus grande, est rognée par le cadre pour ne montrer que la page.
 */
export function DocumentThumbnail({ src, title, ratio }: { src: string; title: string; ratio: string }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <div className={`relative overflow-hidden rounded-xl border border-border/15 bg-white ${ratio}`}>
        <iframe
          src={`${src}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
          title={title}
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
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div className="relative flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-border/15 px-4 py-2.5">
              <p className="truncate text-sm font-bold text-fg">{title}</p>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer l'aperçu"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-lg font-bold text-fg/70 hover:bg-fg/10 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <iframe src={`${src}#toolbar=0&navpanes=0&view=FitH`} title={title} className="min-h-0 w-full flex-1 bg-white" />
          </div>
        </div>
      ) : null}
    </>
  );
}
