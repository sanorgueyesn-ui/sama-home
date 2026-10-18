"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActiveEstablishment } from "@/lib/dal";
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
 *
 * Mini-lot "Check-in — identifier le client manquant" : élargi pour
 * accepter aussi une fiche réservation (`/reservations/<id>`), d'où "+
 * Nouveau client" peut désormais être lancé depuis le sélecteur de check-in
 * — même garde-fou, juste un segment de chemin supplémentaire dans le même
 * groupe `reservations/...`, toujours ancré, toujours sans caractère `/`
 * permis dans le segment final (donc jamais `/reservations/<id>/edit` ou
 * `/reservations/<id>/pay`, qui ne matchent pas ce motif).
 */
const RETURN_TO_PATTERN = /^\/(reservations\/[a-zA-Z0-9]+|locations\/new)(\?[\w=&%.-]*)?$/;

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
  // Phase 3G / Lot D12-P110 — faille confirmée en D12-P109 : createClient()
  // n'était gardée que par getCurrentUser(), jamais par
  // requireActiveEstablishment(), contrairement à updateClient() dans ce même
  // fichier (D12-O4). Même emplacement et mêmes messages, jamais reformulés.
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { message: "Votre compte n'est rattaché à aucun établissement — impossible de créer un client." };
      case "INACTIVE":
        return { message: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { message: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { message: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const { user } = access;

  const parsed = parseClientForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }
  const returnTo = safeReturnTo(formData);

  let clientId: string;
  try {
    const client = await prisma.client.create({ data: { ...parsed.data, establishmentId: user.establishmentId } });
    clientId = client.id;
  } catch (error) {
    console.error("createClient() — échec inattendu de la création du client :", error);
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
  // Phase 3G / Lot D12-O4 — deuxième câblage de requireActiveEstablishment()
  // après le pilote createExpense (D12-O2) : fichier à 2 fonctions, aucun
  // effet de bord (pas de S3, pas de transaction, pas de verrou optimiste),
  // risque métier le plus faible des candidates examinées (voir audit
  // D12-O3). Remplace l'ancien contrôle `!user.establishmentId` seul :
  // couvre désormais aussi le statut de l'établissement et celui de
  // l'abonnement, strictement séparés (voir dal.ts).
  const access = await requireActiveEstablishment();
  if (!access.ok) {
    switch (access.reason) {
      case "NO_ESTABLISHMENT":
        return { message: "Votre compte n'est rattaché à aucun établissement — impossible de modifier ce client." };
      case "INACTIVE":
        return { message: "Cet établissement est inactif — les fonctionnalités de gestion sont bloquées." };
      case "NO_SUBSCRIPTION":
        return { message: "Aucun abonnement n'est configuré pour cet établissement — une régularisation est nécessaire." };
      case "EXPIRED":
        return { message: "L'abonnement de cet établissement a expiré — un renouvellement est nécessaire." };
    }
  }
  const { user } = access;

  // Validations inchangées (idDocumentType/idDocumentNumber inclus, aucun
  // fichier associé à un client — seul `Property`/`Settings` ont des
  // téléversements S3, hors périmètre ici).
  const parsed = parseClientForm(formData);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  // Phase 3D / Lot D3 — `updateMany` (pas `update`, qui n'accepte que la clé
  // unique) : un client d'un autre établissement est désormais indistinguable
  // d'un id inexistant (même message "Client introuvable.", même chemin de
  // code), là où l'ancien `update` aurait levé une erreur Prisma générique
  // non distinguée pour un id inexistant — amélioration nécessaire pour
  // satisfaire cette règle, pas un changement de comportement pour le cas
  // normal (même établissement, succès inchangé).
  let result: { count: number };
  try {
    result = await prisma.client.updateMany({
      where: { id, establishmentId: user.establishmentId },
      data: parsed.data,
    });
  } catch (error) {
    console.error(`updateClient(${id}) — échec inattendu de la mise à jour du client :`, error);
    return { message: "Une erreur est survenue pendant l'enregistrement. Veuillez réessayer." };
  }
  if (result.count === 0) {
    return { message: "Client introuvable." };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}?updated=1`);
}
