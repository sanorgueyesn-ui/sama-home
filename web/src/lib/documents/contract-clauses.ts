// Contenu des contrats : articles construits UNE fois à partir du document, quel que soit l'habillage.
// Module PUR. Les habillages (contract-themes) ne font que mettre ces articles en page.
//
// ⚠ Contenu juridique : rédigé d'après les sources recoupées de la recherche (voir
// web/docs/RECHERCHE_BIBLIOTHEQUE_DOCUMENTS.md) et volontairement prudent : aucun numéro d'article de loi
// n'est cité, aucune obligation n'est affirmée au-delà de ce qui est recoupé. Il DOIT être relu par un
// notaire ou un juriste sénégalais avant la mise en production.
import { amountInWordsCfaInline, fmtDate, fmtDateTime, fmtMoney } from "./format";
import type { ContractArticle, ContractDoc, ContractKind } from "./types";

/** Plafond au-dessous duquel la règle de la caution à deux mois s'applique (décret n° 2023-382, recoupé). */
export const DEPOSIT_RULE_RENT_CEILING = 500_000;
export const DEPOSIT_MAX_MONTHS = 2;
/** Délai de restitution de la caution : aucun délai légal trouvé, le contrat en fixe un. */
export const DEPOSIT_RETURN_DAYS = 30;

export function contractTitle(kind: ContractKind): { title: string; subtitle: string } {
  switch (kind) {
    case "HOTEL_STAY":
      return { title: "CONTRAT D'HÉBERGEMENT", subtitle: "Séjour en établissement hôtelier" };
    case "LEASE_3Y":
      return { title: "BAIL D'HABITATION MEUBLÉ", subtitle: "Durée de trois ans, reconductible" };
    case "LEASE_OPEN":
      return { title: "BAIL D'HABITATION MEUBLÉ", subtitle: "Durée indéterminée" };
  }
}

/** Fin d'un bail de trois ans : la veille du troisième anniversaire. */
export function leaseThreeYearEnd(start: Date): Date {
  const end = new Date(start.getFullYear() + 3, start.getMonth(), start.getDate());
  end.setDate(end.getDate() - 1);
  return end;
}

/** Nombre de nuits entre deux dates (jours calendaires), au moins 1. */
export function nightsBetween(start: Date, end: Date): number {
  const day = 24 * 60 * 60 * 1000;
  const from = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const to = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return Math.max(1, Math.round((to - from) / day));
}

export type DepositCheck = { ok: true } | { ok: false; message: string };

/**
 * Règle de la caution (recoupée, à confirmer par un juriste) : pour un loyer mensuel jusqu'à 500 000 FCFA,
 * la caution ne peut excéder deux mois de loyer. Au-dessus du plafond, aucun maximum n'est connu.
 */
export function checkLeaseDeposit(monthlyRent: number, deposit: number): DepositCheck {
  if (monthlyRent <= DEPOSIT_RULE_RENT_CEILING && deposit > monthlyRent * DEPOSIT_MAX_MONTHS) {
    return {
      ok: false,
      message: `La caution dépasse ${DEPOSIT_MAX_MONTHS} mois de loyer (${fmtMoney(monthlyRent * DEPOSIT_MAX_MONTHS)}), maximum pour un loyer de ${fmtMoney(DEPOSIT_RULE_RENT_CEILING)} ou moins.`,
    };
  }
  return { ok: true };
}

const money = (amount: number) => `${fmtMoney(amount)} (${amountInWordsCfaInline(amount)})`;

function identity(doc: ContractDoc): string {
  const { idType, idNumber } = doc.tenant;
  return idNumber
    ? `Le ${doc.kind === "HOTEL_STAY" ? "client" : "locataire"} déclare l'exactitude des informations d'identité fournies (${idType ?? "pièce d'identité"} n° ${idNumber}). Elles sont conservées par l'établissement pour la gestion du ${doc.kind === "HOTEL_STAY" ? "séjour" : "bail"} et la tenue de son registre.`
    : `Le ${doc.kind === "HOTEL_STAY" ? "client" : "locataire"} présente une pièce d'identité en cours de validité. Les informations recueillies ne servent qu'à la gestion du ${doc.kind === "HOTEL_STAY" ? "séjour" : "bail"}.`;
}

function hotelArticles(doc: ContractDoc): ContractArticle[] {
  const { brand, tenant, property, period, money: m } = doc;
  const nights = period.end ? nightsBetween(period.start, period.end) : null;
  const rules = doc.houseRules?.filter((rule) => rule.trim()) ?? [];
  return [
    {
      title: "Objet",
      paragraphs: [
        `${brand.name} (adresse : ${brand.address}), ci-après « l'établissement », met à la disposition de ${tenant.name}, ci-après « le client », ${property.typeLabel.toLowerCase()} « ${property.name} », meublé, pour la durée et aux conditions ci-après.`,
        ...(property.description ? [property.description] : []),
      ],
    },
    {
      title: "Durée du séjour",
      paragraphs: [
        period.end
          ? `Le séjour commence le ${fmtDateTime(period.start)} et prend fin le ${fmtDateTime(period.end)}, soit ${nights} nuit${(nights ?? 0) > 1 ? "s" : ""}.`
          : `Le séjour commence le ${fmtDateTime(period.start)} et prend fin au départ du client.`,
        "Toute prolongation est convenue avec l'établissement et dépend de la disponibilité du logement.",
      ],
    },
    {
      title: "Prix et paiement",
      paragraphs: [`Le prix du séjour est fixé à ${money(m.amount)}. Il est payable aux moyens de paiement acceptés par l'établissement.`],
    },
    {
      title: "Acompte et solde",
      paragraphs: [
        m.paid > 0 ? `À la date du présent contrat, le client a versé ${money(m.paid)}${m.deposit > 0 ? `, dont un acompte de ${fmtMoney(m.deposit)}` : ""}.` : "Aucun versement n'a été reçu à la date du présent contrat.",
        m.remaining > 0 ? `Le solde restant dû, ${money(m.remaining)}, est payable au plus tard au départ du client.` : "Le séjour est intégralement réglé.",
        "Un reçu est remis pour tout paiement.",
      ],
    },
    {
      title: "Obligations du client",
      paragraphs: [],
      bullets: [
        "Utiliser le logement paisiblement et conformément à sa destination.",
        "Respecter la tranquillité des autres clients et du voisinage.",
        "Prendre soin du mobilier et des équipements, et répondre des dégradations qui lui sont imputables.",
        "Libérer le logement à la date et à l'heure de départ convenues.",
        ...rules,
      ],
    },
    {
      title: "Obligations de l'établissement",
      paragraphs: [],
      bullets: [
        "Remettre un logement propre et en bon état de fonctionnement.",
        "Assurer l'accueil et l'assistance pendant le séjour.",
        "Remettre un reçu pour tout paiement.",
      ],
    },
    { title: "Identité", paragraphs: [identity(doc)] },
    {
      title: "Objets personnels",
      paragraphs: ["Le client est invité à garder ses objets de valeur sous sa garde. La responsabilité de l'établissement s'apprécie conformément à la loi."],
    },
    {
      title: "Annulation et modification",
      paragraphs: ["Les conditions d'annulation et de modification sont celles communiquées par l'établissement au moment de la réservation."],
    },
    {
      title: "Droit applicable et litiges",
      paragraphs: ["Le présent contrat est soumis au droit sénégalais. En cas de difficulté, les parties recherchent d'abord une solution amiable ; à défaut, les juridictions compétentes sont saisies."],
    },
  ];
}

function leaseArticles(doc: ContractDoc): ContractArticle[] {
  const { brand, tenant, property, period, money: m } = doc;
  const threeYears = doc.kind === "LEASE_3Y";
  const end = period.end ?? (threeYears ? leaseThreeYearEnd(period.start) : null);
  const rules = doc.houseRules?.filter((rule) => rule.trim()) ?? [];
  const capApplies = m.amount <= DEPOSIT_RULE_RENT_CEILING;

  return [
    {
      title: "Objet",
      paragraphs: [
        `${brand.name} (adresse : ${brand.address}), ci-après « le bailleur », donne en location meublée à ${tenant.name}, ci-après « le locataire », qui l'accepte, ${property.typeLabel.toLowerCase()} « ${property.name} », à usage exclusif d'habitation.`,
        ...(property.description ? [property.description] : []),
      ],
    },
    {
      title: "Durée",
      paragraphs: threeYears
        ? [
            `Le bail est conclu pour une durée de trois (3) ans à compter du ${fmtDate(period.start)}, soit jusqu'au ${fmtDate(end as Date)}.`,
            "À l'issue de chaque période de trois ans, il est reconduit tacitement pour une nouvelle période de trois ans, sauf congé donné dans les conditions de l'article « Fin du bail et préavis ».",
          ]
        : [`Le bail est conclu pour une durée indéterminée à compter du ${fmtDate(period.start)}.`],
    },
    {
      title: "Loyer",
      paragraphs: [
        `Le loyer mensuel est fixé à ${money(m.amount)}.`,
        "Il est payable à terme échu, c'est-à-dire à la fin de chaque mois, sans paiement d'avance.",
        "Le bailleur remet une quittance à chaque paiement, et un reçu en cas de paiement partiel.",
      ],
    },
    {
      title: "Dépôt de garantie",
      paragraphs: [
        m.deposit > 0 ? `Un dépôt de garantie de ${money(m.deposit)} est constitué en garantie de l'exécution des obligations du locataire.` : "Aucun dépôt de garantie n'est exigé.",
        ...(m.deposit > 0 && capApplies
          ? [`Le loyer mensuel n'excédant pas ${fmtMoney(DEPOSIT_RULE_RENT_CEILING)}, le dépôt ne peut excéder ${DEPOSIT_MAX_MONTHS} mois de loyer ; un mois est exigible à l'entrée dans les lieux et le solde est étalé sur les douze mensualités suivantes.`]
          : []),
        ...(m.deposit > 0
          ? [`Il est restitué dans un délai de ${DEPOSIT_RETURN_DAYS} jours après la remise des clés et l'état des lieux de sortie, déduction faite des sommes dues.`]
          : []),
      ],
    },
    {
      title: "Charges et consommations",
      paragraphs: ["Eau, électricité et internet :", "[   ] inclus dans le loyer     [   ] à la charge du locataire, sur justificatifs"],
    },
    {
      title: "État des lieux et inventaire",
      paragraphs: ["Un état des lieux et un inventaire du mobilier sont dressés contradictoirement à l'entrée et à la sortie du locataire, et annexés au présent bail."],
    },
    {
      title: "Obligations du bailleur",
      paragraphs: [],
      bullets: [
        "Délivrer le logement en bon état et garantir au locataire une jouissance paisible.",
        "Assurer les grosses réparations et celles dues à la vétusté ou à la force majeure.",
        "Remettre une quittance à chaque paiement du loyer.",
      ],
    },
    {
      title: "Obligations du locataire",
      paragraphs: [],
      bullets: [
        "Payer le loyer et les charges aux échéances convenues.",
        "User paisiblement du logement, conformément à sa destination d'habitation.",
        "Assurer l'entretien courant et les menues réparations, et répondre des dégradations qui lui sont imputables.",
        "Restituer le logement et le mobilier dans l'état décrit à l'entrée, hors usure normale.",
        ...rules,
      ],
    },
    {
      title: "Sous-location et cession",
      paragraphs: ["Toute sous-location et toute cession du bail sont interdites sans l'accord écrit préalable du bailleur."],
    },
    {
      title: "Fin du bail et préavis",
      paragraphs: threeYears
        ? [
            "Le locataire qui ne souhaite pas la reconduction du bail donne congé par écrit six (6) mois avant la fin de la période en cours.",
            "Le bailleur ne peut s'opposer à la reconduction que dans les cas et selon les formes prévus par la loi.",
            `En cas de manquement grave d'une partie, la résiliation est demandée au juge, après une mise en demeure restée sans effet pendant trente (30) jours.`,
          ]
        : [
            "Le locataire peut mettre fin au bail par écrit, moyennant un préavis de deux (2) mois.",
            "Le bailleur ne peut mettre fin au bail que dans les cas et selon les formes prévus par la loi.",
            `En cas de manquement grave d'une partie, la résiliation est demandée au juge, après une mise en demeure restée sans effet pendant trente (30) jours.`,
          ],
    },
    { title: "Identité", paragraphs: [identity(doc)] },
    {
      title: "Enregistrement",
      paragraphs: ["Les formalités d'enregistrement éventuelles sont accomplies conformément à la législation fiscale en vigueur."],
    },
    {
      title: "Droit applicable et litiges",
      paragraphs: ["Le présent bail est soumis au droit sénégalais. En cas de difficulté, les parties recherchent d'abord une solution amiable ; à défaut, les juridictions compétentes sont saisies."],
    },
  ];
}

export function buildContractArticles(doc: ContractDoc): ContractArticle[] {
  return doc.kind === "HOTEL_STAY" ? hotelArticles(doc) : leaseArticles(doc);
}
