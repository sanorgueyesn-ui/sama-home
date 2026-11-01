// Messages en FRANÇAIS — langue source et langue de repli de toute la plateforme.
//
// Organisation : un espace de noms par domaine (`common`, `landing`, puis plus tard `auth`,
// `dashboard`, `residence`, `hotel`, `agency`, `installed`…). Les autres langues (en.ts, ar.ts)
// reprennent la même forme, en version partielle : tout ce qui manque s'affiche en français.
//
// Règle de contenu : aucune promesse, aucun chiffre et aucun témoignage non vérifiés. Ce qui
// n'existe pas encore est dit honnêtement (« bientôt disponible », « prévu »).

export const fr = {
  common: {
    language: "Langue",
    languageSoon: "bientôt disponible",
    languagePreview: "aperçu de la mise en page, traduction non terminée",
    skipToContent: "Aller au contenu",
    menu: "Menu",
    closeMenu: "Fermer le menu",
    logIn: "Se connecter",
    createAccount: "Créer un compte",
    soon: "Bientôt disponible",
    available: "Disponible",
    backToTop: "Haut de page",
    themeToLight: "Passer en mode clair",
    themeToDark: "Passer en mode sombre",
  },
  landing: {
    meta: {
      title: "SAMA HOME — Gestion simple pour résidences, hôtels et agences",
      description:
        "SAMA HOME réunit réservations, séjours, paiements et caisse. La Résidence (appartements et chambres meublés) est disponible ; les modules Hôtel et Agence immobilière arrivent bientôt.",
    },
    nav: {
      label: "Navigation principale",
      offers: "Activités",
      pricing: "Tarifs",
      roles: "Rôles",
      app: "Application",
      contact: "Contact",
    },
    floating: {
      label: "Accès rapide",
      demo: "Voir la démo",
      demoShort: "Démo",
      useApp: "Utiliser l'application",
      open: "Ouvrir",
    },
    hero: {
      eyebrow: "Logiciel professionnel pour résidences, hôtels & agences",
      title: "Gérez vos logements, réservations et paiements en toute sérénité.",
      subtitle:
        "SAMA HOME réunit vos plannings, vos clients, vos quittances et votre caisse au même endroit. Accessible partout sur le Web, pensé pour la réalité du terrain et la continuité de votre activité.",
      note: "1 mois d'essai gratuit · Opérationnel immédiatement sur le Web · Version PC en préparation",
    },
    offers: {
      title: "Choisissez votre activité",
      subtitle: "Chaque activité a son propre espace et ses propres outils. Rien n'est mélangé.",
      plannedLabel: "Prévu :",
      residence: {
        name: "Résidence",
        tagline: "Appartements et chambres meublés",
        description: "Logements, tarifs, réservations, locations, paiements, caisse et contrats.",
        cta: "Commencer avec la Résidence",
      },
      hotel: {
        name: "Hôtel",
        tagline: "Chambres, séjours, ménage et occupation",
        planned: "chambres et catégories, réservations par nuit, séjours, ménage et maintenance, rapports d'occupation.",
        cta: "Être informé",
        whatsappMessage: "Bonjour, je souhaite être informé de l'arrivée du module Hôtel de SAMA HOME.",
      },
      agency: {
        name: "Agence immobilière",
        tagline: "Biens, propriétaires, visites, mandats et loyers",
        planned: "biens à vendre ou à louer, propriétaires, prospects, mandats, visites, baux et loyers, commissions.",
        cta: "Être informé",
        whatsappMessage: "Bonjour, je souhaite être informé de l'arrivée du module Agence immobilière de SAMA HOME.",
      },
    },
    residence: {
      title: "La Résidence est disponible dès aujourd'hui",
      subtitle: "Voici ce que vous pouvez faire avec le module Résidence :",
      items: [
        {
          title: "Logements et tarifs",
          text: "Ajoutez vos chambres et appartements, avec des tarifs à l'heure, à la nuit, à la semaine ou au mois.",
        },
        {
          title: "Réservations et locations",
          text: "Enregistrez une réservation, accueillez le client, prolongez son séjour et gardez l'historique.",
        },
        {
          title: "Disponibilité",
          text: "Le logiciel vérifie qu'un logement n'est pas déjà occupé avant de confirmer.",
        },
        {
          title: "Paiements et caisse",
          text: "Notez les paiements en espèces, Wave ou Orange Money et suivez votre caisse.",
        },
        {
          title: "Dépenses",
          text: "Enregistrez vos dépenses par catégorie pour savoir où va votre argent.",
        },
        {
          title: "Contrats et reçus",
          text: "Éditez un contrat de location ou un reçu au format PDF.",
        },
      ],
      footnote: "Ces outils sont ceux de la Résidence. L'Hôtel et l'Agence auront leurs propres outils.",
    },
    roles: {
      title: "Chacun voit ce dont il a besoin",
      subtitle: "Vous décidez qui peut faire quoi dans votre établissement.",
      admin: {
        name: "Administrateur",
        text: "Il gère tout son établissement : logements, tarifs, équipe, caisse et paramètres.",
      },
      employee: {
        name: "Employé",
        text: "Il voit seulement les outils que l'administrateur lui autorise. Le reste lui reste fermé.",
      },
    },
    start: {
      title: "Créez votre espace ou connectez-vous",
      newTitle: "Nouveau sur SAMA HOME",
      newText: "Créez le compte de votre établissement. Vous pourrez ensuite inviter votre équipe.",
      existingTitle: "Vous avez déjà un compte",
      existingText: "Retrouvez votre établissement avec votre adresse e-mail et votre mot de passe.",
      otherWays: "Autres façons de se connecter",
      google: "Continuer avec Google",
      googleNote: "Google confirme votre adresse e-mail, puis vous saisissez votre mot de passe SAMA HOME.",
      microsoft: "Continuer avec Microsoft",
      microsoftSoon: "Bientôt",
    },
    demo: {
      title: "Voir SAMA HOME en action",
      subtitle: "Un aperçu de ce que vous ferez au quotidien avec la Résidence.",
      placeholderTitle: "Vidéo de démonstration",
      placeholderText: "La vidéo de démonstration n'est pas encore prête. En attendant, voici les étapes d'une journée type.",
      soon: "Bientôt disponible",
      mockupLabel: "Maquette illustrative : ce n'est pas une capture de l'application.",
      steps: [
        { title: "1. Ajoutez vos logements", text: "Chambres ou appartements, avec leurs tarifs." },
        { title: "2. Enregistrez une réservation", text: "Choisissez le logement, le client et les dates." },
        { title: "3. Accueillez le client", text: "Arrivée, location et prolongation en quelques gestes." },
        { title: "4. Encaissez et suivez la caisse", text: "Paiements, dépenses et contrat au même endroit." },
      ],
    },
    download: {
      title: "L'application SAMA HOME",
      subtitle:
        "Aujourd'hui, SAMA HOME s'utilise dans votre navigateur, sur téléphone, tablette et ordinateur. Une application à installer est en préparation.",
      button: "Télécharger",
      windows: "Windows",
      mac: "Mac",
      web: "Navigateur",
      webText: "Disponible : ouvrez SAMA HOME dans votre navigateur.",
      webCta: "Ouvrir SAMA HOME",
      appSoonText: "Application en préparation, pas encore disponible.",
      mobileTitle: "Sur votre téléphone",
      mobileText: "Ouvrez SAMA HOME dans le navigateur de votre téléphone. Rien à installer.",
      appsTitle: "Applications Windows et Mac",
      appsText: "En préparation : elles ne sont pas encore disponibles.",
      installableSoon: "Version web installable : à venir.",
    },
    contact: {
      title: "Une question ? Contactez-nous",
      subtitle: "Choisissez le moyen qui vous convient : WhatsApp, téléphone ou e-mail.",
      whatsappTitle: "WhatsApp",
      whatsappText: "Le plus simple pour poser une question ou demander une démonstration.",
      call: "Appeler",
      write: "Écrire",
      phone2: "Deuxième numéro",
      address: "Adresse",
      whatsapp: "Écrire sur WhatsApp",
      whatsappMessage: "Bonjour, j'ai une question sur SAMA HOME.",
      phone: "Téléphone",
      email: "E-mail",
      publisher: "Plateforme éditée par",
      rights: "Tous droits réservés.",
    },
  },
};

export type Messages = typeof fr;
