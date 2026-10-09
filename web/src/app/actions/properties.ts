"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { PropertySchema, type PropertyFormState } from "@/lib/definitions";

function parsePropertyForm(formData: FormData, active: boolean) {
  return PropertySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    description: formData.get("description"),
    capacity: formData.get("capacity"),
    photo: formData.get("photo"),
    active,
  });
}

export async function createProperty(
  _prevState: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  await verifySession();

  // New listings always start active — there's no reason to ask, and no
  // "active" control is rendered on the create form.
  const parsed = parsePropertyForm(formData, true);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  let propertyId: string;
  try {
    const property = await prisma.property.create({ data: parsed.data });
    propertyId = property.id;
  } catch (error) {
    console.error("createProperty() — échec inattendu de la création du logement :", error);
    return { message: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
  }

  revalidatePath("/logements");
  redirect(`/logements/${propertyId}?created=1`);
}

export async function updateProperty(
  id: string,
  _prevState: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  await verifySession();

  const parsed = parsePropertyForm(formData, formData.get("active") === "on");
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await prisma.property.update({ where: { id }, data: parsed.data });
  } catch (error) {
    console.error(`updateProperty(${id}) — échec inattendu de la mise à jour du logement :`, error);
    return { message: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
  }

  revalidatePath("/logements");
  revalidatePath(`/logements/${id}`);
  redirect(`/logements/${id}?updated=1`);
}

export async function toggleActive(id: string, nextActive: boolean) {
  await verifySession();

  await prisma.property.update({ where: { id }, data: { active: nextActive } });

  revalidatePath("/logements");
  revalidatePath(`/logements/${id}`);
}
