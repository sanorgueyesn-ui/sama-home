// Réglages de la page d'accueil publique, au même endroit pour pouvoir les changer sans toucher au dessin.

/**
 * Vidéo de présentation, juste après l'en-tête de la page.
 * Tant que `src` est vide, la page affiche l'emplacement réservé « Bientôt disponible » (aucune vidéo
 * n'est inventée). Pour publier la vidéo : déposer le fichier dans `public/videos/` et renseigner
 * `src: "/videos/presentation.mp4"` (et `poster` pour l'image de couverture). Un lien YouTube ou Vimeo
 * « embed » (`https://www.youtube.com/embed/…`) est aussi accepté.
 */
export const LANDING_VIDEO: { src: string | null; poster: string | null } = {
  src: "/videos/presentation.mp4",
  poster: "/videos/presentation-poster.jpg",
};

/**
 * Le module Hôtel (ménage, planning à 14 jours, extras facturés au séjour) est livré dans l'application :
 * la page le présente comme disponible. Le module Agence immobilière reste suspendu (« bientôt »).
 */
export const HOTEL_MODULE_AVAILABLE = true;
