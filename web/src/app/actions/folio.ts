"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActiveEstablishment } from "@/lib/dal";
import { chargeKeepsTotalValid, parseCharge } from "@/lib/folio";
import { getRentalPaymentSummary } from "@/lib/payment-summary";
import { getT } from "@/lib/i18n/server";

/** `nonce` change à chaque ajout réussi : le formulaire s'en sert comme clé pour se vider. */
export type FolioState = { error?: string; ok?: boolean; nonce?: string } | undefined;

class FolioError extends Error {}

/**
 * Ajoute une ligne de folio (extra ou remise) à un séjour EN COURS d'un hôtel. La ligne et
 * l'augmentation de `Rental.amount` s'écrivent dans la même transaction sérialisable : le solde reste
 * juste partout (payment-summary lit `Rental.amount`). L'établissement vient de la session.
 */
export async function addRentalCharge(rentalId: string, _prev: FolioState, formData: FormData): Promise<FolioState> {
  const t = await getT();
  const access = await requireActiveEstablishment();
  if (!access.ok) return { error: t("Cet établissement ne peut pas enregistrer de nouvelle opération pour le moment.") };
  const { user } = access;
  if (!user.establishmentId) return { error: t("Votre compte n'est rattaché à aucun établissement.") };
  const establishmentId = user.establishmentId;

  const parsed = parseCharge({ label: formData.get("label"), amount: formData.get("amount"), reason: formData.get("reason") });
  if (!parsed.ok) return { error: parsed.error };
  const { label, amount, reason } = parsed.value;

  try {
    await prisma.$transaction(
      async (tx) => {
        const establishment = await tx.establishment.findUnique({ where: { id: establishmentId }, select: { businessMode: true } });
        if (establishment?.businessMode !== "HOTEL") throw new FolioError("Les extras sont réservés au mode Hôtel.");

        const rental = await tx.rental.findFirst({ where: { id: rentalId, establishmentId }, select: { id: true, status: true, amount: true } });
        if (!rental) throw new FolioError("Séjour introuvable.");
        if (rental.status !== "ACTIVE") throw new FolioError("Ce séjour n'est plus en cours : les extras ne peuvent plus être modifiés.");

        const summary = await getRentalPaymentSummary(tx, rentalId);
        if (!chargeKeepsTotalValid(rental.amount, summary.totalPaid, amount)) {
          throw new FolioError("Cette remise dépasserait ce qui reste à payer. Rembourser un paiement se fait depuis la caisse.");
        }

        await tx.rentalCharge.create({ data: { rentalId, establishmentId, label, amount, reason, createdByUserId: user.id } });
        await tx.rental.update({ where: { id: rentalId }, data: { amount: { increment: amount } } });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof FolioError) return { error: error.message };
    console.error("addRentalCharge() — échec de transaction :", error);
    return { error: t("L'extra n'a pas pu être enregistré. Rien n'a été modifié : réessayez.") };
  }

  revalidatePath(`/locations/${rentalId}`);
  revalidatePath("/locations");
  return { ok: true, nonce: crypto.randomUUID() };
}
