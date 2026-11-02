import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { getRentalPaymentSummary } from "@/lib/payment-summary";
import { resolveImagePdfSource } from "@/lib/object-storage";
import { getS3Client, getBucketName } from "@/lib/s3-client";
import { resolveBrandColors } from "@/lib/brand-colors";
import { resolveContractLessor, type MissingLessorField } from "@/lib/contract-settings";

/**
 * Lot "Contrat de location PDF" — lecture agrégée, dédiée au contrat,
 * volontairement SÉPARÉE de `getRentalById` (src/lib/rentals-data.ts) :
 * plutôt que d'élargir le `select` d'une fonction déjà utilisée par la page
 * de détail de location (risque de régression hors périmètre), cette
 * fonction effectue sa propre lecture, strictement en lecture, qui n'altère
 * aucune donnée et ne touche à aucune des fonctions déjà utilisées ailleurs.
 * Aucune logique métier de réservation/location n'est exécutée ici — chaque
 * valeur est lue telle qu'enregistrée (jamais recalculée), le montant total
 * dû/payé/restant provient du même calcul central que le reste de l'app
 * (`getRentalPaymentSummary`, src/lib/payment-summary.ts).
 *
 * Phase 3C / Lot C2 — la location est désormais lue par `findFirst` avec un
 * filtre `establishmentId` explicite : une location d'un autre établissement
 * est traitée comme introuvable, jamais renvoyée.
 *
 * Phase 3F / Lot D12-F — `Settings` n'est plus lu via l'ancien identifiant
 * fixe `SETTINGS_ID`, mais par `establishmentId` (désormais obligatoire et
 * unique sur `Settings`, migration Lot D12-C) : le logo et les couleurs de
 * marque intégrés au PDF sont maintenant ceux de l'établissement réel de la
 * location, jamais ceux d'un autre. `establishmentId` provient exclusivement
 * de `getCurrentUser()`, jamais du navigateur. Le logement associé est en
 * outre revérifié explicitement ci-dessous (défense en profondeur) : bien
 * qu'un `Rental` et sa `Property` soient normalement toujours rattachés au
 * même établissement par construction, cette vérification garantit qu'une
 * éventuelle incohérence de données ne ferait jamais fuiter le logement ou
 * les paramètres d'un autre établissement — traitée comme "introuvable".
 */
export async function getRentalContractData(rentalId: string) {
  const user = await getCurrentUser();
  if (!user.establishmentId) return null;

  const [rental, settings] = await Promise.all([
    prisma.rental.findFirst({
      where: { id: rentalId, establishmentId: user.establishmentId },
      include: {
        client: true,
        property: { select: { id: true, name: true, type: true, description: true, establishmentId: true } },
        tariff: { select: { id: true, label: true } },
        establishment: { select: { id: true, name: true } },
      },
    }),
    prisma.settings.findUnique({ where: { establishmentId: user.establishmentId } }),
  ]);

  if (!rental) return null;
  if (rental.property.establishmentId !== user.establishmentId) return null;

  // Le bailleur est l'établissement lui-même. Sans nom, téléphone et adresse, le contrat n'est pas
  // généré : jamais de coordonnées de repli (voir lib/contract-settings.ts).
  const lessor = resolveContractLessor(settings, rental.establishment?.name);
  if (!lessor.ok) return { missing: lessor.missing };

  const [summary, logoImage] = await Promise.all([
    getRentalPaymentSummary(prisma, rentalId),
    settings?.logoUrl ? resolveImagePdfSource(getS3Client(), getBucketName(), settings.logoUrl) : Promise.resolve(null),
  ]);

  const brandColors = resolveBrandColors(settings);

  return { rental, settings: lessor.lessor, summary, logoImage, brandColors };
}

/** Champs manquants pour imprimer le bailleur : le contrat est alors refusé, avec renvoi vers les Paramètres. */
export type ContractIncomplete = { missing: MissingLessorField[] };
