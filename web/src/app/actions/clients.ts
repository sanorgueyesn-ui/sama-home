"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { ClientSchema, type ClientFormState } from "@/lib/definitions";

function parseClientForm(formData: FormData) {
  return ClientSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    idDocumentType: formData.get("idDocumentType"),
    idDocumentNumber: formData.get("idDocumentNumber"),
    notes: formData.get("notes"),
  });
}

export async function createClient(
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  // Re-verified here even though every /clients route is already behind
  // proxy.ts + the page's own verifySession() call: a Server Action is a
  // public endpoint in its own right and must never trust the caller.
  await verifySession();

  const parsed = parseClientForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  let clientId: string;
  try {
    const client = await prisma.client.create({ data: parsed.data });
    clientId = client.id;
  } catch {
    return { message: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
  }

  revalidatePath("/clients");
  redirect(`/clients/${clientId}?created=1`);
}

export async function updateClient(
  id: string,
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  await verifySession();

  const parsed = parseClientForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await prisma.client.update({ where: { id }, data: parsed.data });
  } catch {
    return { message: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}?updated=1`);
}
