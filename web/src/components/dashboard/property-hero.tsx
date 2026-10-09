import { existsSync } from "node:fs";
import { join } from "node:path";

// Audit Dashboard/Identité visuelle — bandeau "hero" en tête du tableau de
// bord. Règle validée, inchangée : premier logement ACTIF possédant une
// photo (tri identique à listProperties(), déjà appliqué par l'appelant).
// Nouvelle logique à 3 niveaux (toujours sans modifier PropertyPhoto ni le
// choix du logement) :
//   1. property.photo existe -> vraie photo du logement.
//   2. sinon, l'asset de marque fourni existe sur disque -> image par défaut
//      SAMA HOME (asset local réel, voir public/images/hero/).
//   3. sinon (asset pas encore livré) -> repli minimal temporaire, pour
//      n'avoir jamais d'image cassée.
export type HeroProperty = { name: string; type: "ROOM" | "APARTMENT"; photo: string | null } | null;

const DEFAULT_HERO_PUBLIC_PATH = "/images/hero/sama-home-default-hero.png";
// Vérifié une fois par rendu serveur (simple stat disque, aucune dépendance) :
// le fichier existe déjà dans ce projet (ajouté séparément, comme annoncé).
const defaultHeroExists = existsSync(join(process.cwd(), "public", "images", "hero", "sama-home-default-hero.png"));

/**
 * Scène d'intérieur en trait fin (fenêtre, fauteuil, lit, chevet + lampe,
 * plante) — remplace l'icône bâtiment isolée, jugée trop institutionnelle en
 * large écran. Un seul SVG, panoramique, recadré via `preserveAspectRatio`
 * selon la largeur du conteneur : même balisage sur les 3 largeurs, c'est le
 * recadrage qui fait varier ce qui est visible (centré/étroit en mobile,
 * étalé en PC). Pure illustration décorative du repli — aucune donnée.
 */
function RoomIllustration() {
  return (
    <svg
      viewBox="0 0 900 300"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Fenêtre à petits-bois, avec rideaux esquissés */}
      <rect x="50" y="50" width="130" height="160" rx="4" />
      <path d="M115 50v160M50 130h130" />
      <path d="M50 60q-22 70 0 140M180 60q22 70 0 140" />

      {/* Fauteuil */}
      <path d="M210 260v-70a18 18 0 0 1 18-18h64a18 18 0 0 1 18 18v70" />
      <path d="M210 230h-14v30h14M310 230h14v30h-14" />
      <path d="M210 260h114M222 260v18M298 260v18" />

      {/* Lit : tête de lit, matelas, oreiller, plaid */}
      <rect x="380" y="90" width="46" height="170" rx="6" />
      <rect x="380" y="220" width="260" height="46" rx="6" />
      <rect x="402" y="188" width="92" height="38" rx="10" />
      <path d="M520 226q40 14 82 0" />

      {/* Table de chevet + lampe */}
      <rect x="672" y="222" width="70" height="44" rx="4" />
      <path d="M707 222v-58" />
      <path d="M683 128h48l10 36h-68z" />

      {/* Petite plante, pour la chaleur */}
      <path d="M826 262v-34" />
      <path d="M812 254q14-26 14-26M840 254q-14-26-14-26M826 238q0-20 10-30M826 238q0-20-10-30" />
      <path d="M804 262h44l-6 20h-32z" />
    </svg>
  );
}

export function PropertyHero({ property }: { property: HeroProperty }) {
  const heroImageSrc = property?.photo ?? (defaultHeroExists ? DEFAULT_HERO_PUBLIC_PATH : null);

  return (
    <div className="relative mt-4 h-[96px] w-full overflow-hidden rounded-2xl md:h-[190px] lg:h-[240px]">
      {heroImageSrc ? (
        <>
          {/* Plain <img>, pas next/image : même choix que PropertyPhoto (URL
              collée par le gestionnaire, pas de service d'upload — Phase 4). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroImageSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/75 via-navy/10 to-transparent" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-navy to-[#1E4B70]" />
          <div className="absolute inset-0 text-white opacity-[0.14] md:opacity-[0.17] lg:opacity-[0.20]">
            <RoomIllustration />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-navy/10 to-transparent" />
        </>
      )}
      <div className="absolute inset-x-0 bottom-0 px-4 py-3">
        <p className="text-sm font-extrabold tracking-wide text-white">SAMA HOME</p>
        <p className="mt-0.5 text-xs font-semibold text-white/75">Gestion de logements meublés</p>
      </div>
    </div>
  );
}
