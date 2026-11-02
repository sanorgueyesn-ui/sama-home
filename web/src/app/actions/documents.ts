"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";
import { parseDocumentSelection } from "@/lib/documents/selection";

export type DocumentChoiceState = { error?: string; ok?: boolean } | undefined;

/**
 * Choisit la présentation des documents de l'établissement (ADMIN uniquement). L'établissement vient
 * de la session ; numéro et papier sont revalidés. N'écrit que sur la ligne de paramètres existante :
 * sans paramètres enregistrés, on demande de les renseigner d'abord plutôt que d'en inventer.
 */
export async function chooseDocumentPresentation(
  kind: "contract" | "ticket",
  theme: number,
  paper: string | null,
  _prev: DocumentChoiceState,
  _formData: FormData,
): Promise<DocumentChoiceState> {
  const user = await requireAdmin();
  if (!user.establishmentId) return { error: "Votre compte n'est rattaché à aucun établissement." };

  const parsed = parseDocumentSelection({ kind, theme, paper: paper ?? undefined });
  if (!parsed.ok) return { error: parsed.error };

  const data =
    parsed.value.kind === "contract"
      ? { documentContractTheme: parsed.value.theme }
      : { documentTicketTheme: parsed.value.theme, documentTicketPaper: parsed.value.paper };
  const result = await prisma.settings.updateMany({ where: { establishmentId: user.establishmentId }, data });
  if (result.count === 0) return { error: "Renseignez d'abord les informations de l'établissement (Paramètres)." };

  revalidatePath("/settings/documents");
  return { ok: true };
}
