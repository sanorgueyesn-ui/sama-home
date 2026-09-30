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

/**
 * Phase 12, Bloc 6 — "+ Nouveau client" launched from mid-reservation/
 * mid-location (see reservation-form.tsx/rental-form.tsx) carries a
 * `returnTo` hidden field so the manager lands back on a fresh form with
 * the new client pre-selected, instead of being dropped on the client's
 * profile and having to re-find them in the picker. `returnTo` is
 * attacker-controllable form data (Bloc 23: never trust the browser), so it
 * is only ever honored against this exact allowlist — never redirected to
 * verbatim — to rule out an open redirect.
 */
const RETURN_TO_PATTERN = /^\/(reservations|locations)\/new(\?[\w=&%.-]*)?$/;

function safeReturnTo(formData: FormData): string | null {
  const value = formData.get("returnTo");
  if (typeof value !== "string" || !RETURN_TO_PATTERN.test(value)) {
    return null;
  }
  return value;
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
  const returnTo = safeReturnTo(formData);

  let clientId: string;
  try {
    const client = await prisma.client.create({ data: parsed.data });
    clientId = client.id;
  } catch {
    return { message: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
  }

  revalidatePath("/clients");
  if (returnTo) {
    const separator = returnTo.includes("?") ? "&" : "?";
    redirect(`${returnTo}${separator}clientId=${clientId}`);
  }
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
