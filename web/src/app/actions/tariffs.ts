"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import {
  TariffSchema,
  type TariffFormState,
  type TARIFF_TYPE_VALUES,
  type DURATION_UNIT_VALUES,
} from "@/lib/definitions";

type TariffTypeValue = (typeof TARIFF_TYPE_VALUES)[number];
type DurationUnitValue = (typeof DURATION_UNIT_VALUES)[number];

function parseTariffForm(formData: FormData, active: boolean) {
  return TariffSchema.safeParse({
    label: formData.get("label"),
    type: formData.get("type"),
    durationValue: formData.get("durationValue"),
    durationUnit: formData.get("durationUnit"),
    amount: formData.get("amount"),
    active,
  });
}

const DUPLICATE_MESSAGE =
  "Un tarif actif existe déjà pour ce type et cette durée sur ce logement. Désactivez-le d'abord, ou modifiez celui-ci plutôt que d'en créer un nouveau.";

async function hasConflictingActiveTariff(
  propertyId: string,
  data: { type: TariffTypeValue; durationValue: number; durationUnit: DurationUnitValue },
  excludeId?: string,
) {
  const conflict = await prisma.tariff.findFirst({
    where: {
      propertyId,
      type: data.type,
      durationValue: data.durationValue,
      durationUnit: data.durationUnit,
      active: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  return Boolean(conflict);
}

export async function createTariff(
  propertyId: string,
  _prevState: TariffFormState,
  formData: FormData,
): Promise<TariffFormState> {
  await verifySession();

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) {
    return { message: "Logement introuvable." };
  }

  // New tariffs start active — no toggle rendered on the create form.
  const parsed = parseTariffForm(formData, true);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  if (await hasConflictingActiveTariff(propertyId, parsed.data)) {
    return { message: DUPLICATE_MESSAGE };
  }

  try {
    await prisma.tariff.create({ data: { ...parsed.data, propertyId } });
  } catch {
    return { message: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
  }

  revalidatePath(`/logements/${propertyId}`);
  redirect(`/logements/${propertyId}?tariffCreated=1`);
}

export async function updateTariff(
  tariffId: string,
  _prevState: TariffFormState,
  formData: FormData,
): Promise<TariffFormState> {
  await verifySession();

  const existing = await prisma.tariff.findUnique({ where: { id: tariffId } });
  if (!existing) {
    return { message: "Tarif introuvable." };
  }

  const parsed = parseTariffForm(formData, formData.get("active") === "on");
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  if (
    parsed.data.active &&
    (await hasConflictingActiveTariff(existing.propertyId, parsed.data, tariffId))
  ) {
    return { message: DUPLICATE_MESSAGE };
  }

  try {
    await prisma.tariff.update({ where: { id: tariffId }, data: parsed.data });
  } catch {
    return { message: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
  }

  revalidatePath(`/logements/${existing.propertyId}`);
  redirect(`/logements/${existing.propertyId}?tariffUpdated=1`);
}

/**
 * Deactivation is always safe (never conflicts). Reactivation can conflict
 * with another active tariff for the same type+duration — reported back as
 * `{ error }` rather than thrown, so the quick-toggle button can show it
 * inline without a full error-boundary crash for what is a normal,
 * expected validation case.
 */
export async function toggleTariffActive(
  id: string,
  nextActive: boolean,
): Promise<{ error?: string }> {
  await verifySession();

  const existing = await prisma.tariff.findUniqueOrThrow({ where: { id } });

  if (nextActive && (await hasConflictingActiveTariff(existing.propertyId, existing, id))) {
    return { error: DUPLICATE_MESSAGE };
  }

  await prisma.tariff.update({ where: { id }, data: { active: nextActive } });
  revalidatePath(`/logements/${existing.propertyId}`);
  return {};
}

/**
 * Phase 6, Bloc 14: now that Reservation -> Tariff exists, a tariff
 * referenced by any reservation (of any status, including CANCELLED — the
 * historical record must still be able to display what it booked) can never
 * be physically deleted. Deactivation remains the safe, always-available
 * alternative, which the UI leads with.
 *
 * Phase 7 update: Rental -> Tariff now exists too (`onDelete: Restrict` in
 * the schema would otherwise let a Rental-referenced tariff pass this
 * application check and then fail with a raw Prisma foreign-key error
 * instead of this friendly message) — same rule, extended to Rental.
 */
export async function deleteTariff(id: string): Promise<{ error?: string }> {
  await verifySession();

  const existing = await prisma.tariff.findUniqueOrThrow({ where: { id } });

  const [referencingReservation, referencingRental] = await Promise.all([
    prisma.reservation.findFirst({ where: { tariffId: id }, select: { id: true } }),
    prisma.rental.findFirst({ where: { tariffId: id }, select: { id: true } }),
  ]);
  if (referencingReservation || referencingRental) {
    return {
      error:
        "Ce tarif est référencé par au moins une réservation ou une location et ne peut pas être supprimé. Désactivez-le à la place.",
    };
  }

  await prisma.tariff.delete({ where: { id } });

  revalidatePath(`/logements/${existing.propertyId}`);
  return {};
}
