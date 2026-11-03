import { CheckIcon } from "@/components/ui/icons";
import { PlayIcon } from "@/components/landing/landing-icons";
import { LANDING_VIDEO } from "@/lib/landing-config";
import { T } from "@/components/i18n/i18n-provider";
import { tSync } from "@/lib/i18n/sync";

const CHAPTERS = [
  "Créer ses logements et ses tarifs",
  "Enregistrer une réservation et accueillir le client",
  "Encaisser un paiement et suivre les soldes",
  "Clôturer la caisse et lire les rapports",
] as const;

function isEmbed(src: string): boolean {
  return /^https:\/\/(www\.)?(youtube\.com\/embed|player\.vimeo\.com\/video)\//.test(src);
}

/** Emplacement de la vidéo de présentation. Sans vidéo publiée, un cadre « bientôt disponible » réserve la place. */
export function VideoSection() {
  const { src, poster } = LANDING_VIDEO;
  const t = tSync();
  return (
    <section id="video" aria-labelledby="video-titre" className="scroll-mt-16 border-t border-border/10 bg-surface-raised/40 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-[1.55fr_1fr] lg:gap-14">
        <figure>
          {src ? (
            isEmbed(src) ? (
              <iframe
                src={src}
                title={t("Présentation de SAMA HOME")}
                loading="lazy"
                allow="encrypted-media; picture-in-picture; fullscreen"
                className="aspect-video w-full rounded-2xl border border-border/20 shadow-card"
              />
            ) : (
              <video controls preload="none" poster={poster ?? undefined} className="aspect-video w-full rounded-2xl border border-border/20 bg-black shadow-card">
                <source src={src} />
              </video>
            )
          ) : (
            <div
              role="img"
              aria-label={t("Emplacement de la vidéo de présentation, bientôt disponible")}
              className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border/20 bg-surface shadow-card"
            >
              <div className="flex items-center gap-1.5 border-b border-border/15 bg-surface-sunken px-4 py-2.5" aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full bg-border/40" />
                <span className="h-2.5 w-2.5 rounded-full bg-border/40" />
                <span className="h-2.5 w-2.5 rounded-full bg-border/40" />
              </div>
              <div className="absolute inset-0 top-9 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--accent)_14%,transparent),transparent_65%)] px-6 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-(--accent) text-(--accent-ink) shadow-card sm:h-20 sm:w-20" aria-hidden>
                  <PlayIcon className="h-7 w-7 sm:h-8 sm:w-8" />
                </span>
                <p className="text-sm font-extrabold text-fg sm:text-base"><T>Vidéo de présentation</T></p>
                <span className="rounded-full bg-fg/8 px-3 py-1 text-xs font-bold text-muted"><T>Bientôt disponible</T></span>
              </div>
            </div>
          )}
        </figure>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-(--accent-text)"><T>Découvrir</T></p>
          <h2 id="video-titre" className="mt-3 text-balance text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
            <T>SAMA HOME en action</T>
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted">
            <T>En quelques minutes, voyez comment on crée un logement, enregistre un séjour, encaisse et clôture la caisse.</T>
          </p>
          <ul className="mt-6 space-y-3">
            {CHAPTERS.map((chapter, index) => (
              <li key={chapter} className="flex items-start gap-3 text-sm font-semibold text-fg">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--accent)/15 text-(--accent-text)" aria-hidden>
                  <CheckIcon className="h-3 w-3" />
                </span>
                <span>
                  <span className="text-muted tabular-nums">0{index + 1}</span> <T>{chapter}</T>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
