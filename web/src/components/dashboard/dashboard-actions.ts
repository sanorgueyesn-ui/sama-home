import { BuildingIcon, CalendarIcon, CashIcon, ExpenseIcon, KeyIcon } from "@/components/ui/icons";
import type { QuickAction } from "@/components/dashboard/dashboard-ui";

// Actions rapides de chaque famille de mode. Chaque lien mène à une page qui existe et fonctionne
// (règle des guides : aucun raccourci vers une fonction absente). La première est l'action principale.

/** Résidence et Hôtel partagent le moteur d'hébergement : mêmes gestes, vocabulaire du séjour. */
export const STAY_ACTIONS: QuickAction[] = [
  { href: "/locations/new", label: "Nouveau séjour", shortLabel: "Séjour", hint: "Accueillir un client maintenant", icon: KeyIcon },
  { href: "/reservations/new", label: "Nouvelle réservation", shortLabel: "Réserver", hint: "Planifier une arrivée", icon: CalendarIcon },
  { href: "/caisse", label: "Encaisser un paiement", shortLabel: "Encaisser", hint: "Espèces, Wave, Orange Money", icon: CashIcon },
  { href: "/depenses", label: "Ajouter une dépense", shortLabel: "Dépense", hint: "Suivre vos dépenses", icon: ExpenseIcon },
];

export const AGENCY_ACTIONS: QuickAction[] = [
  { href: "/logements/new", label: "Nouveau bien", shortLabel: "Bien", hint: "Ajouter au portefeuille", icon: BuildingIcon },
  { href: "/locations/new", label: "Nouvelle location", shortLabel: "Location", hint: "Enregistrer un locataire", icon: KeyIcon },
  { href: "/caisse", label: "Encaisser un loyer", shortLabel: "Loyer", hint: "Espèces, Wave, Orange Money", icon: CashIcon },
  { href: "/depenses", label: "Ajouter une dépense", shortLabel: "Dépense", hint: "Suivre les dépenses", icon: ExpenseIcon },
];
