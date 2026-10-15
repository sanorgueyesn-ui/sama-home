"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActiveEstablishment } from "@/lib/dal";
import { type BrandColors, normalizeHexColor } from "@/lib/brand-colors";

/**
 * Lot "Personnalisation libre" — remplace l'ancien setBrandPalette(paletteId)
 * (limité aux 5 palettes nommées) : accepte désormais n'importe quel triplet
 * de couleurs valide (saisie libre OU l'une des 5 palettes, le composant ne
 * fait plus de distinction à l'enregistrement), ou `null` pour restaurer la
 * palette par défaut. Même mécanique conservée de bout en bout :
 * verifySession() (aucun changement d'autorisation), verrou optimiste repris
 * de updateSettings() (src/app/actions/settings.ts, correction M1) —
 * relecture de `updatedAt` juste avant l'écriture, `updateMany` (pas
 * `update`) pour accepter ce filtre supplémentaire au-delà de la clé unique.
 * Aucun effet de bord à nettoyer en cas de conflit : les 3 colonnes de
 * couleur n'ont pas de ressource externe associée.
 *
 * Validation serveur systématique (jamais seulement côté client, même si
 * l'interface valide déjà) : `normalizeHexColor` est la SEULE source de
 * vérité sur le format `#RRGGBB` — une valeur invalide est refusée avant
 * toute écriture, jamais présentée comme un succès.
 *
 * Phase 3F / Lot D12-D — résolu par `establishmentId` (jamais depuis le
 * navigateur) plutôt que par l'ancien identifiant fixe `SETTINGS_ID` : ne
 * modifie jamais les couleurs d'un autre établissement.
 */
export async function saveBrandColors(colors: BrandColors | null): Promise<{ error?: string }> {
  // Phase 3G / Lot D12-P110 — gap découvert pendant la recherche exhaustive
  // demandée par ce lot (hors liste explicite de D12-P109, qui ne couvrait
  // pas ce fichier) : modifie les paramètres de l'établissement au même titre
  // que updateSettings(), gardée de façon identique.
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { error: "Votre compte n'est rattaché à aucun établissement — impossible d'enregistrer une palette." };
      case "INACTIVE":
        return { error: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { error: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { error: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const { user } = access;
  if (!user.establishmentId) {
    return { error: "Votre compte n'est rattaché à aucun établissement — impossible d'enregistrer une palette." };
  }

  let nextColors: { primaryColor: string | null; secondaryColor: string | null; accentColor: string | null };

  if (colors === null) {
    nextColors = { primaryColor: null, secondaryColor: null, accentColor: null };
  } else {
    const primary = normalizeHexColor(colors.primary);
    const secondary = normalizeHexColor(colors.secondary);
    const accent = normalizeHexColor(colors.accent);
    if (!primary || !secondary || !accent) {
      return { error: "Couleur invalide : utilisez le format #RRGGBB (6 chiffres hexadécimaux)." };
    }
    nextColors = { primaryColor: primary, secondaryColor: secondary, accentColor: accent };
  }

  const existing = await prisma.settings.findUnique({
    where: { establishmentId: user.establishmentId },
    select: { updatedAt: true },
  });

  if (!existing) {
    // Point bloquant signalé (Étape 5) : contrairement à updateSettings(),
    // cette action ne dispose pas des champs obligatoires de Settings
    // (establishmentName/phone/address) pour créer la ligne de cet
    // établissement si elle n'existe pas encore. Inventer des valeurs par
    // défaut pour les créer irait à l'encontre de "jamais de donnée
    // inventée" — la palette ne peut donc être choisie qu'après un premier
    // enregistrement des informations de l'établissement
    // (src/app/settings/settings-form.tsx).
    return { error: "Veuillez d'abord enregistrer les informations de l'établissement avant de choisir une palette de couleurs." };
  }

  const result = await prisma.settings.updateMany({
    where: { establishmentId: user.establishmentId, updatedAt: existing.updatedAt },
    data: nextColors,
  });

  if (result.count === 0) {
    // Même situation de conflit que updateSettings() — modifié entre notre
    // lecture et notre écriture.
    return { error: "Les paramètres ont été modifiés entre-temps par quelqu'un d'autre. Rechargez la page et réessayez." };
  }

  revalidatePath("/", "layout");
  return {};
}
