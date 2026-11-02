// Identité du bailleur imprimée sur un contrat : celle de l'ÉTABLISSEMENT, jamais celle de SAMA HOME.
// Module PUR (aucune base, aucune session) : la règle se teste seule.
//
// Avant ce module, un établissement sans coordonnées enregistrées voyait son contrat imprimé avec le
// téléphone, l'adresse et l'e-mail de SAMA HOME : un contrat signé avec de fausses coordonnées pour le
// bailleur. Désormais, si le nom, le téléphone ou l'adresse manque, le contrat n'est PAS généré ; on
// demande de renseigner l'établissement. Rien n'est inventé ni emprunté à un autre.

export type ContractSettingsInput = {
  establishmentName?: string | null;
  phone?: string | null;
  secondaryPhone?: string | null;
  address?: string | null;
  email?: string | null;
} | null;

export type ContractLessor = {
  establishmentName: string;
  phone: string;
  secondaryPhone: string | null;
  address: string;
  email: string | null;
};

export type MissingLessorField = "name" | "phone" | "address";

export type ContractLessorResult = { ok: true; lessor: ContractLessor } | { ok: false; missing: MissingLessorField[] };

const text = (value: string | null | undefined): string => (typeof value === "string" ? value.trim() : "");

/**
 * Nom : celui des paramètres, sinon le nom enregistré de l'établissement (une donnée réelle de CET
 * établissement). Téléphone et adresse : obligatoires, sans valeur de repli.
 */
export function resolveContractLessor(settings: ContractSettingsInput, registeredName: string | null | undefined): ContractLessorResult {
  const name = text(settings?.establishmentName) || text(registeredName);
  const phone = text(settings?.phone);
  const address = text(settings?.address);

  const missing: MissingLessorField[] = [];
  if (!name) missing.push("name");
  if (!phone) missing.push("phone");
  if (!address) missing.push("address");
  if (missing.length > 0) return { ok: false, missing };

  return {
    ok: true,
    lessor: {
      establishmentName: name,
      phone,
      secondaryPhone: text(settings?.secondaryPhone) || null,
      address,
      email: text(settings?.email) || null,
    },
  };
}
