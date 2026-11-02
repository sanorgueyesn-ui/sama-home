// Étapes de mise en route affichées sur la vue d'ensemble des paramètres. Module PUR : il reçoit des
// chiffres déjà lus par les services existants et n'invente rien. Une étape est « faite » d'après une
// donnée réelle (nom enregistré, logo présent, au moins un logement, au moins une catégorie).

export type SetupStep = {
  id: "identity" | "logo" | "properties" | "categories";
  label: string;
  hint: string;
  href: string;
  cta: string;
  done: boolean;
};

export type SetupProgress = {
  steps: SetupStep[];
  done: number;
  total: number;
  complete: boolean;
};

export function buildSetupSteps(input: {
  establishmentName: string | null | undefined;
  hasLogo: boolean;
  propertiesCount: number;
  expenseCategoriesCount: number;
  /** Les catégories de dépenses ne se gèrent que côté administrateur : l'étape n'existe pas pour les autres. */
  isAdmin: boolean;
}): SetupProgress {
  const steps: SetupStep[] = [
    {
      id: "identity",
      label: "Renseigner votre établissement",
      hint: "Nom, téléphone et adresse figurent sur vos contrats.",
      href: "/settings/etablissement",
      cta: "Renseigner",
      done: Boolean(input.establishmentName?.trim()),
    },
    {
      id: "logo",
      label: "Ajouter votre logo",
      hint: "Il apparaît sur le contrat de location en PDF.",
      href: "/settings/etablissement",
      cta: "Ajouter",
      done: input.hasLogo,
    },
    {
      id: "properties",
      label: "Ajouter vos logements",
      hint: "Sans logement, il n'y a rien à louer ni à réserver.",
      href: "/logements/new",
      cta: "Ajouter",
      done: input.propertiesCount > 0,
    },
  ];
  if (input.isAdmin) {
    steps.push({
      id: "categories",
      label: "Créer vos catégories de dépenses",
      hint: "Elles classent chaque dépense dans vos rapports.",
      href: "/settings/expense-categories/new",
      cta: "Créer",
      done: input.expenseCategoriesCount > 0,
    });
  }
  const done = steps.filter((step) => step.done).length;
  return { steps, done, total: steps.length, complete: done === steps.length };
}
