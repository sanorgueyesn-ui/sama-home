import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { COMPANY_LEGAL_INFO } from "@/lib/company-info";

export const metadata: Metadata = {
  title: "SAMA HOME — Logiciel Tout-en-Un de Gestion Hôtelière & Immobilière au Sénégal",
  description:
    "Pilotez vos résidences meublées, hôtels, auberges et appartements Airbnb à Dakar et au Sénégal. Réservations, séjours, contrats 1-clic, Wave/Orange Money et caisse étanche en temps réel.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#071612] text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* 1. Header / Navigation */}
      <header className="sticky top-0 z-50 border-b border-emerald-900/40 bg-[#071612]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/landing" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-emerald-600 font-bold text-slate-950 shadow-lg shadow-emerald-950/50">
              <span className="text-xl">S</span>
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white group-hover:text-amber-400 transition-colors">
                SAMA HOME
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80">
                Hospitality OS • Sénégal
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#fonctionnalites" className="hover:text-amber-400 transition-colors">
              Fonctionnalités
            </a>
            <a href="#modules" className="hover:text-amber-400 transition-colors">
              Modules
            </a>
            <a href="#avantages" className="hover:text-amber-400 transition-colors">
              Avantages
            </a>
            <a href="#contact" className="hover:text-amber-400 transition-colors">
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-950/40 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900/60 hover:border-emerald-500 transition-all shadow-sm"
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              className="hidden sm:inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500 transition-all"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section (Inspiré du Modèle 2 & 1) */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Glow de fond */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[140px]" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
            {/* Colonne Gauche : Titre, Slogan et Call to Action */}
            <div className="lg:col-span-7">
              {/* Trust Badge (Comme dans le modèle 2) */}
              <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-800/60 bg-emerald-950/50 px-3.5 py-1.5 text-xs font-medium text-emerald-300 mb-6 backdrop-blur-md">
                <div className="flex -space-x-1.5">
                  <span className="inline-block h-5 w-5 rounded-full bg-emerald-600 ring-2 ring-[#071612] text-center text-[10px] leading-5 text-white font-bold">D</span>
                  <span className="inline-block h-5 w-5 rounded-full bg-amber-600 ring-2 ring-[#071612] text-center text-[10px] leading-5 text-white font-bold">F</span>
                  <span className="inline-block h-5 w-5 rounded-full bg-cyan-600 ring-2 ring-[#071612] text-center text-[10px] leading-5 text-white font-bold">S</span>
                </div>
                <span>+ de 500 résidences et auberges nous font confiance</span>
              </div>

              {/* Titre Principal Impactant */}
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white leading-[1.12]">
                Prenez le contrôle de <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
                  vos résidences & hôtels
                </span>{" "}
                facilement
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-slate-300 leading-relaxed max-w-2xl">
                Une solution tout-en-un pour gérer vos réservations, séjours, contrats de bail, règlements (Wave, Orange Money, Espèces) et caisse en toute sérénité.
              </p>

              {/* Boutons d'Action Principaux */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3.5 text-base font-bold text-slate-950 shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-emerald-500 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <span>Accéder à l'application</span>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>

                <a
                  href="https://wa.me/221773386660?text=Bonjour%2C%20je%20souhaite%20une%20d%C3%A9monstration%20de%20SAMA%20HOME"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-700/60 bg-emerald-950/40 px-5 py-3.5 text-base font-semibold text-emerald-200 hover:bg-emerald-900/60 hover:text-white transition-all"
                >
                  <span className="text-emerald-400">💬</span>
                  <span>Démo WhatsApp</span>
                </a>
              </div>

              {/* Rassurance immédiate */}
              <div className="mt-8 flex items-center gap-6 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>100% sur le web & mobile</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Zéro installation requise</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Support 7j/7 à Dakar</span>
                </div>
              </div>
            </div>

            {/* Colonne Droite : Mockup Mobile & Laptop Réaliste (Inspiré Image 1 & 2) */}
            <div className="lg:col-span-5 relative flex justify-center">
              {/* Cadre Smartphone Haute-Fidélité avec la VRAIE interface SAMA HOME */}
              <div className="relative w-full max-w-[340px] rounded-[42px] border-4 border-slate-700/80 bg-slate-950 p-3 shadow-2xl shadow-emerald-950/60 ring-1 ring-emerald-500/20">
                {/* Dynamic Island / Notch */}
                <div className="absolute top-5 left-1/2 h-4 w-28 -translate-x-1/2 rounded-full bg-slate-900 z-20 flex items-center justify-end px-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500/80" />
                </div>

                {/* Écran Intérieur */}
                <div className="overflow-hidden rounded-[32px] bg-[#0b1b17] border border-emerald-900/60 p-4 pt-8 text-xs text-white">
                  {/* Header App */}
                  <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">SAMA HOME</p>
                      <h4 className="font-bold text-slate-100 text-sm">Résidence Terrou-Bi</h4>
                    </div>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/40">
                      ● Caisse Ouverte
                    </span>
                  </div>

                  {/* Carte Solde / Revenus (Comme modèle 2) */}
                  <div className="mt-4 rounded-2xl bg-gradient-to-br from-emerald-950/90 to-emerald-900/50 p-4 border border-emerald-600/30 shadow-md">
                    <p className="text-[10px] text-emerald-300/80 font-medium">Revenu du mois en cours</p>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-xl font-black text-white">8 450 000 FCFA</span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">+18.4%</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-emerald-800/40 text-[10px]">
                      <div>
                        <span className="text-slate-400 block">Taux d'occupation</span>
                        <span className="font-bold text-amber-300">89% (17/19 loués)</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Arrivées prévues</span>
                        <span className="font-bold text-white">4 check-ins</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Rapides */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-slate-900/80 p-2 text-center border border-emerald-900/40">
                      <span className="text-base">🔑</span>
                      <p className="mt-1 text-[9px] font-medium text-slate-300">Séjour</p>
                    </div>
                    <div className="rounded-xl bg-slate-900/80 p-2 text-center border border-emerald-900/40">
                      <span className="text-base">📅</span>
                      <p className="mt-1 text-[9px] font-medium text-slate-300">Réserver</p>
                    </div>
                    <div className="rounded-xl bg-slate-900/80 p-2 text-center border border-emerald-900/40">
                      <span className="text-base">💵</span>
                      <p className="mt-1 text-[9px] font-medium text-slate-300">Caisse</p>
                    </div>
                  </div>

                  {/* Dernières Activités Réelles */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 mb-2">
                      <span>Derniers Séjours & Règlements</span>
                      <span className="text-emerald-400">Voir tout</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between rounded-xl bg-slate-900/60 p-2.5 border border-emerald-900/30">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                            W
                          </div>
                          <div>
                            <p className="font-bold text-slate-100 text-[11px]">Chambre VIP 104</p>
                            <p className="text-[9px] text-slate-400">Wave • Amadou Diallo</p>
                          </div>
                        </div>
                        <span className="font-bold text-emerald-400 text-[11px]">+45 000 F</span>
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-slate-900/60 p-2.5 border border-emerald-900/30">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                            OM
                          </div>
                          <div>
                            <p className="font-bold text-slate-100 text-[11px]">Studio F2 CICES</p>
                            <p className="text-[9px] text-slate-400">Orange Money • Fatou Sow</p>
                          </div>
                        </div>
                        <span className="font-bold text-emerald-400 text-[11px]">+35 000 F</span>
                      </div>
                    </div>
                  </div>

                  {/* Bouton direct d'entrée */}
                  <Link
                    href="/login"
                    className="mt-4 block w-full rounded-xl bg-emerald-500 py-2.5 text-center font-bold text-slate-950 shadow-md hover:bg-emerald-400 transition-colors"
                  >
                    Ouvrir ma Session →
                  </Link>
                </div>
              </div>

              {/* Badge flottant interactif */}
              <div className="absolute -bottom-6 -left-6 hidden sm:flex items-center gap-3 rounded-2xl border border-emerald-600/40 bg-[#0e2720]/95 p-3.5 shadow-2xl backdrop-blur-xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 text-lg">
                  📑
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Contrat généré en 1 clic</p>
                  <p className="text-[11px] text-emerald-300">Conforme avec signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Bandeau de Pilules Fonctionnelles (Inspiré Modèle 2) */}
      <section className="border-y border-emerald-900/40 bg-[#0a1e19]/60 py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-emerald-400/80 mb-5">
            Approuvé par les propriétaires et gestionnaires d'hébergement au Sénégal
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-900/40 bg-emerald-950/40 px-3 py-2 text-xs text-slate-300">
              <span className="text-base text-emerald-400">🛡️</span>
              <span className="font-medium">Sécurité renforcée</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-900/40 bg-emerald-950/40 px-3 py-2 text-xs text-slate-300">
              <span className="text-base text-emerald-400">⚡</span>
              <span className="font-medium">Temps réel</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-900/40 bg-emerald-950/40 px-3 py-2 text-xs text-slate-300">
              <span className="text-base text-emerald-400">📅</span>
              <span className="font-medium">Anti-chevauchement</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-900/40 bg-emerald-950/40 px-3 py-2 text-xs text-slate-300">
              <span className="text-base text-emerald-400">💰</span>
              <span className="font-medium">Tarifs Nuitée / Heure</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-900/40 bg-emerald-950/40 px-3 py-2 text-xs text-slate-300">
              <span className="text-base text-emerald-400">💵</span>
              <span className="font-medium">Zéro fuite de caisse</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-900/40 bg-emerald-950/40 px-3 py-2 text-xs text-slate-300">
              <span className="text-base text-emerald-400">📱</span>
              <span className="font-medium">Mobile, Tablette & PC</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Chiffres Clés (Comme Modèle 2) */}
      <section className="py-16 sm:py-20 border-b border-emerald-900/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 text-center lg:grid-cols-4">
            <div className="p-4">
              <div className="text-3xl sm:text-4xl font-extrabold text-amber-400">100%</div>
              <div className="mt-1 text-sm font-semibold text-slate-200">Isolation Multi-Tenant</div>
              <div className="mt-1 text-xs text-slate-400">Chaque établissement est totalement étanche</div>
            </div>
            <div className="p-4">
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400">0 F CFA</div>
              <div className="mt-1 text-sm font-semibold text-slate-200">Écart de Caisse Toléré</div>
              <div className="mt-1 text-xs text-slate-400">Comptage mathématique à chaque quart</div>
            </div>
            <div className="p-4">
              <div className="text-3xl sm:text-4xl font-extrabold text-amber-400">1 Clic</div>
              <div className="mt-1 text-sm font-semibold text-slate-200">Contrat & Facture Client</div>
              <div className="mt-1 text-xs text-slate-400">Imprimable ou envoyé par WhatsApp</div>
            </div>
            <div className="p-4">
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400">24h / 24</div>
              <div className="mt-1 text-sm font-semibold text-slate-200">Suivi sur Smartphone</div>
              <div className="mt-1 text-xs text-slate-400">Contrôlez vos recettes où que vous soyez</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Section Détaillée 1 : Réservations & Arrivées (Inspiré Modèle 2 Milieu) */}
      <section className="py-20 lg:py-24" id="fonctionnalites">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Hospitalité Maîtrisée
              </span>
              <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl text-white leading-tight">
                Rejoignez les gestionnaires qui simplifient leurs réservations
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-300">
                Que vous louiez à la nuitée ou pour quelques heures (sieste / passage), SAMA HOME calcule automatiquement les tarifs, vérifie la disponibilité sans chevauchement et vous protège contre les litiges.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Tarification Double (Jour & Heures)</h4>
                    <p className="text-xs text-slate-400">
                      Définissez des forfaits horaires (3h, 6h) ou journaliers selon les habitudes de votre clientèle.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Enregistrement Rapide des Pièces d'Identité</h4>
                    <p className="text-xs text-slate-400">
                      Saisie du numéro de CNI ou Passeport pour vous conformer aux exigences de sécurité touristique.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Multi-Moyens de Règlements Locaux</h4>
                    <p className="text-xs text-slate-400">
                      Encaissement direct en Espèces, Wave, Orange Money ou virement bancaire, avec reçu instantané.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300"
                >
                  <span>Tester la prise de réservation</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            {/* Carte Visuelle de la Fonctionnalité Check-in */}
            <div className="lg:col-span-6">
              <div className="rounded-3xl border border-emerald-800/40 bg-gradient-to-br from-[#0c231c] to-[#071612] p-6 shadow-2xl">
                <div className="flex items-center justify-between pb-4 border-b border-emerald-900/40">
                  <span className="font-bold text-white text-sm">Formulaire d'Arrivée Express</span>
                  <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">
                    Temps estimé : 45s
                  </span>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">Choix du Logement</span>
                    <div className="rounded-xl bg-slate-900/90 border border-emerald-900/60 p-2.5 flex justify-between items-center text-white font-medium">
                      <span>Chambre Deluxe N° 203 (Disponible)</span>
                      <span className="text-emerald-400 font-bold">35 000 F / jour</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 block mb-1">Nom du Client</span>
                      <div className="rounded-xl bg-slate-900/90 border border-emerald-900/60 p-2.5 text-white">
                        Moussa DIOP
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Téléphone</span>
                      <div className="rounded-xl bg-slate-900/90 border border-emerald-900/60 p-2.5 text-white">
                        +221 77 123 45 67
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Mode de Règlement</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-emerald-500/20 border border-emerald-500/60 p-2 text-center font-bold text-emerald-300">
                        🌊 Wave
                      </div>
                      <div className="rounded-lg bg-slate-900 border border-emerald-900/40 p-2 text-center text-slate-400">
                        🍊 Orange Money
                      </div>
                      <div className="rounded-lg bg-slate-900 border border-emerald-900/40 p-2 text-center text-slate-400">
                        💵 Espèces
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white">Total Encaissé</p>
                        <p className="text-[10px] text-slate-400">Contrat PDF et Reçu prêts à l'impression</p>
                      </div>
                      <span className="text-base font-extrabold text-amber-300">70 000 FCFA</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Section Détaillée 2 : Caisse & Dépenses (Inspiré Modèle 2 Graphique) */}
      <section className="py-20 lg:py-24 bg-[#0a1e19]/40 border-y border-emerald-900/30" id="avantages">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6 order-2 lg:order-1">
              {/* Carte Graphique et Caisse */}
              <div className="rounded-3xl border border-emerald-800/40 bg-gradient-to-br from-[#0c231c] to-[#071612] p-6 shadow-2xl">
                <div className="flex items-center justify-between pb-4 border-b border-emerald-900/40">
                  <span className="font-bold text-white text-sm">Bilan Financier & Rentabilité Nette</span>
                  <span className="text-xs font-semibold text-emerald-400">Octobre 2026</span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-slate-900/80 border border-emerald-900/40 p-4">
                    <p className="text-xs text-slate-400">Recettes Totales</p>
                    <p className="text-xl font-black text-emerald-400 mt-1">11 250 000 F</p>
                    <p className="text-[10px] text-slate-500 mt-1">Séjours & Réservations</p>
                  </div>

                  <div className="rounded-2xl bg-slate-900/80 border border-emerald-900/40 p-4">
                    <p className="text-xs text-slate-400">Dépenses Exploitation</p>
                    <p className="text-xl font-black text-rose-400 mt-1">2 140 000 F</p>
                    <p className="text-[10px] text-slate-500 mt-1">Senelec, Eau, Ménage, Gaz</p>
                  </div>
                </div>

                {/* Résultat Net */}
                <div className="mt-4 rounded-2xl bg-gradient-to-r from-emerald-900/60 to-emerald-950/90 border border-emerald-500/40 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-300">Bénéfice Net Propriétaire</p>
                    <p className="text-xs text-emerald-300">Calcul automatique en temps réel</p>
                  </div>
                  <span className="text-2xl font-black text-amber-300">+9 110 000 FCFA</span>
                </div>

                {/* Journal de Caisse */}
                <div className="mt-4 pt-3 border-t border-emerald-900/30 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>🔒 Clôture de Caisse avec Rapprochement Bancaire</span>
                  <span className="text-emerald-400 font-semibold">100% Conforme</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Maîtrise Financière
              </span>
              <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl text-white leading-tight">
                Simplifiez vos finances, éliminez les écarts de caisse
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-300">
                Avec SAMA HOME, chaque franc qui entre dans l'établissement est lié à une session de caisse, un réceptionniste et une facture. Vous savez exactement où va chaque dépense.
              </p>

              <div className="mt-6 space-y-3.5 text-sm text-slate-300">
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Ouverture de caisse avec fond initial déclaré obligatoire</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Comptage physique des billets en fin de service</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Virements directs de la caisse vers vos comptes bancaires d'entreprise</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Suivi des charges d'entretien et de factures Senelec / Woyofal</span>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition-colors"
                >
                  <span>Consulter le module Caisse & Trésorerie</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Section ShowCase des Écrans (Inspiré Modèle 2 Bas : "Toute votre finance...") */}
      <section className="py-20 lg:py-28" id="modules">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Expérience Multi-Écrans
            </span>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl lg:text-5xl text-white">
              Toute votre gestion hôtelière dans une seule application
            </h2>
            <p className="mt-4 text-slate-300 text-base sm:text-lg">
              Une interface intuitive, pensée pour être maîtrisée par vos équipes en moins de 15 minutes, accessible sur n'importe quel appareil.
            </p>
          </div>

          {/* Rangée de 5 Écrans Smartphones (Comme en bas du modèle 2) */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {/* Écran 1 : Dashboard */}
            <div className="rounded-3xl border border-emerald-900/60 bg-[#0c231c] p-4 text-center transition-all hover:-translate-y-2 hover:border-emerald-500 shadow-xl">
              <div className="h-44 rounded-2xl bg-slate-950 p-3 text-left border border-emerald-900/40 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-emerald-400 font-bold">
                    <span>DASHBOARD</span>
                    <span>● LIVE</span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-white">Revenu Global</p>
                  <p className="text-base font-black text-amber-300">8 450 000 F</p>
                </div>
                <div className="rounded-lg bg-emerald-950/60 p-1.5 text-[9px] text-slate-300">
                  <span>Occupation : </span>
                  <span className="font-bold text-emerald-300">89%</span>
                </div>
              </div>
              <h3 className="mt-4 font-bold text-white text-sm">1. Tableau de Bord</h3>
              <p className="mt-1 text-xs text-slate-400">Vue globale, chiffre d'affaires et arrivées en direct.</p>
            </div>

            {/* Écran 2 : Parc Logements */}
            <div className="rounded-3xl border border-emerald-900/60 bg-[#0c231c] p-4 text-center transition-all hover:-translate-y-2 hover:border-emerald-500 shadow-xl">
              <div className="h-44 rounded-2xl bg-slate-950 p-3 text-left border border-emerald-900/40 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-emerald-400 font-bold">
                    <span>LOGEMENTS</span>
                    <span>18 Dispos</span>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    <div className="rounded bg-slate-900 p-1 text-[9px] flex justify-between">
                      <span className="text-white">Chambre 101</span>
                      <span className="text-emerald-400">Libre</span>
                    </div>
                    <div className="rounded bg-slate-900 p-1 text-[9px] flex justify-between">
                      <span className="text-white">Suite Almadies</span>
                      <span className="text-amber-400">Occupé</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-emerald-950/60 p-1.5 text-[9px] text-slate-300">
                  Tarifs : Jour & Heure
                </div>
              </div>
              <h3 className="mt-4 font-bold text-white text-sm">2. Parc Logements</h3>
              <p className="mt-1 text-xs text-slate-400">Chambres, suites et forfaits de tarification souples.</p>
            </div>

            {/* Écran 3 : Réservations */}
            <div className="rounded-3xl border border-emerald-900/60 bg-[#0c231c] p-4 text-center transition-all hover:-translate-y-2 hover:border-emerald-500 shadow-xl">
              <div className="h-44 rounded-2xl bg-slate-950 p-3 text-left border border-emerald-900/40 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-emerald-400 font-bold">
                    <span>CALENDRIER</span>
                    <span>Anti-Conflit</span>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-300">Planning Interactif</p>
                  <div className="mt-2 rounded bg-emerald-950/80 border border-emerald-500/30 p-1.5 text-[9px] text-emerald-300 font-medium">
                    0 double réservation garantie
                  </div>
                </div>
                <div className="rounded-lg bg-emerald-950/60 p-1.5 text-[9px] text-slate-300">
                  Acomptes & Arrhes
                </div>
              </div>
              <h3 className="mt-4 font-bold text-white text-sm">3. Réservations</h3>
              <p className="mt-1 text-xs text-slate-400">Calendrier intelligent et blocage des doublons.</p>
            </div>

            {/* Écran 4 : Caisse Journalière */}
            <div className="rounded-3xl border border-emerald-900/60 bg-[#0c231c] p-4 text-center transition-all hover:-translate-y-2 hover:border-emerald-500 shadow-xl">
              <div className="h-44 rounded-2xl bg-slate-950 p-3 text-left border border-emerald-900/40 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-emerald-400 font-bold">
                    <span>CAISSE</span>
                    <span>Contrôlée</span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-white">Fond Initial Déclaré</p>
                  <p className="text-xs font-semibold text-emerald-300 mt-1">25 000 FCFA</p>
                </div>
                <div className="rounded-lg bg-emerald-950/60 p-1.5 text-[9px] text-slate-300">
                  Espèces, Wave & OM
                </div>
              </div>
              <h3 className="mt-4 font-bold text-white text-sm">4. Caisse Journalière</h3>
              <p className="mt-1 text-xs text-slate-400">Session de quart et pointage des encaissements.</p>
            </div>

            {/* Écran 5 : Contrat & Reçu */}
            <div className="rounded-3xl border border-emerald-900/60 bg-[#0c231c] p-4 text-center transition-all hover:-translate-y-2 hover:border-emerald-500 shadow-xl">
              <div className="h-44 rounded-2xl bg-slate-950 p-3 text-left border border-emerald-900/40 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-emerald-400 font-bold">
                    <span>CONTRAT</span>
                    <span>PDF Prêt</span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-white">Bail Court Séjour</p>
                  <p className="text-[10px] text-slate-400 mt-1">Signature & Règles maison</p>
                </div>
                <div className="rounded-lg bg-emerald-950/60 p-1.5 text-[9px] text-slate-300">
                  Reçu WhatsApp
                </div>
              </div>
              <h3 className="mt-4 font-bold text-white text-sm">5. Contrats & Factures</h3>
              <p className="mt-1 text-xs text-slate-400">Édition instantanée aux couleurs de votre marque.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Bannière Call To Action Majeure */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-emerald-950 via-[#071612] to-slate-950 border-t border-emerald-900/50">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-b from-emerald-900/40 to-slate-900/90 p-8 sm:p-14 shadow-2xl relative overflow-hidden">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Prêt à professionnaliser la gestion de votre établissement ?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-slate-300">
              Rejoignez les gérants d'hébergement au Sénégal qui économisent des heures de travail chaque semaine et sécurisent leur trésorerie avec SAMA HOME.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-4 text-base font-bold text-slate-950 shadow-xl shadow-emerald-500/25 hover:from-emerald-400 hover:to-emerald-500 transition-all"
              >
                <span>Accéder à la Page de Connexion</span>
                <span>→</span>
              </Link>
              <a
                href="https://wa.me/221773386660?text=Bonjour%20M.%20GUEYE%2C%20je%20souhaite%20activer%20mon%20%C3%A9tablissement%20sur%20SAMA%20HOME"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-700/60 bg-emerald-950/60 px-6 py-4 text-base font-semibold text-emerald-200 hover:bg-emerald-900/80 transition-all"
              >
                <span>💬 Assistance Commerciale WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Pied de Page Institutionnel */}
      <footer className="border-t border-emerald-950 bg-black/90 py-12 text-xs text-slate-400" id="contact">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-bold text-sm">
                  S
                </div>
                <span className="font-extrabold text-white text-base">SAMA HOME</span>
              </div>
              <p className="mt-3 max-w-md text-slate-400 text-xs leading-relaxed">
                Plateforme logicielle éditée par <strong>{COMPANY_LEGAL_INFO.commercialName}</strong> ({COMPANY_LEGAL_INFO.sigle}). Entreprise immatriculée au Registre du Commerce et du Crédit Mobilier de Dakar (RCCM) et auprès de l'ANSD.
              </p>
              <div className="mt-3 inline-block rounded-md bg-emerald-950/60 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 border border-emerald-800/40">
                NINEA : {COMPANY_LEGAL_INFO.ninea} • RCCM : {COMPANY_LEGAL_INFO.rccm}
              </div>
            </div>

            <div>
              <p className="font-bold text-white text-sm mb-3">Navigation</p>
              <ul className="space-y-2">
                <li><Link href="/login" className="hover:text-amber-400 transition-colors">Connexion Utilisateur</Link></li>
                <li><Link href="/register" className="hover:text-amber-400 transition-colors">Créer un Établissement</Link></li>
                <li><Link href="/forgot-password" className="hover:text-amber-400 transition-colors">Mot de passe oublié</Link></li>
                <li><a href="#fonctionnalites" className="hover:text-amber-400 transition-colors">Fonctionnalités Clés</a></li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-white text-sm mb-3">Contact & Siège</p>
              <ul className="space-y-1.5 text-slate-400">
                <li>📍 {COMPANY_LEGAL_INFO.address}</li>
                <li>🇸🇳 {COMPANY_LEGAL_INFO.city}, {COMPANY_LEGAL_INFO.country}</li>
                <li>📞 Tél : <a href={`tel:${COMPANY_LEGAL_INFO.phone}`} className="text-emerald-400 hover:underline">{COMPANY_LEGAL_INFO.formattedPhone}</a></li>
                <li>✉️ Support : <a href={`mailto:${COMPANY_LEGAL_INFO.supportEmail}`} className="text-emerald-400 hover:underline">{COMPANY_LEGAL_INFO.supportEmail}</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-emerald-950 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <p>© 2026 {COMPANY_LEGAL_INFO.commercialName}. Tous droits réservés.</p>
            <p className="text-emerald-400/80">SAMA HOME — Conçu pour l'excellence de l'hospitalité en Afrique de l'Ouest</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
