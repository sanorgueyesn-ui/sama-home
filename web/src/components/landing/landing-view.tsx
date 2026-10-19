import Link from "next/link";
import { COMPANY_LEGAL_INFO } from "@/lib/company-info";

export function LandingView() {
  return (
    <div className="min-h-screen bg-[#060f15] text-[#f7f8f6] font-sans selection:bg-emerald-500 selection:text-white antialiased">
      {/* 1. Header / Navigation */}
      <header className="sticky top-0 z-50 border-b border-[#1f2d36]/80 bg-[#060f15]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-emerald-600 font-black text-slate-950 shadow-lg shadow-emerald-950/60">
              <span className="text-xl">S</span>
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-[#f7f8f6] group-hover:text-amber-400 transition-colors">
                SAMA HOME
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                Hospitality OS • Sénégal
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#presentation" className="hover:text-amber-400 transition-colors">
              Présentation
            </a>
            <a href="#fonctionnalites" className="hover:text-amber-400 transition-colors">
              Fonctionnalités
            </a>
            <a href="#modules" className="hover:text-amber-400 transition-colors">
              Modules
            </a>
            <a href="#pour-qui" className="hover:text-amber-400 transition-colors">
              Pour qui ?
            </a>
            <a href="#contact" className="hover:text-amber-400 transition-colors">
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-emerald-500/50 bg-[#0e2720] px-4 py-2 text-sm font-bold text-white shadow-md shadow-emerald-950/50 hover:bg-emerald-600 hover:text-slate-950 transition-all"
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              className="hidden sm:inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section (Inspiré Modèle 2 & 1) */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28" id="presentation">
        {/* Glows d'ambiance Nocturne */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[140px]" />
        <div className="pointer-events-none absolute top-40 right-10 h-[300px] w-[300px] rounded-full bg-amber-500/5 blur-[120px]" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
            
            {/* Colonne Gauche : Titre, Slogan et Call to Action */}
            <div className="lg:col-span-7">
              {/* Trust Badge (Comme dans le modèle 2) */}
              <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-700/50 bg-[#0b1b17] px-3.5 py-1.5 text-xs font-semibold text-emerald-300 mb-6 shadow-sm">
                <div className="flex -space-x-1.5">
                  <span className="inline-block h-5 w-5 rounded-full bg-emerald-600 ring-2 ring-[#060f15] text-center text-[10px] leading-5 text-white font-bold">D</span>
                  <span className="inline-block h-5 w-5 rounded-full bg-amber-600 ring-2 ring-[#060f15] text-center text-[10px] leading-5 text-white font-bold">F</span>
                  <span className="inline-block h-5 w-5 rounded-full bg-blue-600 ring-2 ring-[#060f15] text-center text-[10px] leading-5 text-white font-bold">S</span>
                </div>
                <span>+ de 500 résidences et auberges nous font confiance au Sénégal</span>
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
                La solution tout-en-un pour gérer vos réservations, séjours, contrats de bail, règlements (Wave, Orange Money, Espèces) et caisse en toute sérénité.
              </p>

              {/* Boutons d'Action Principaux avec redirection vers /login */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-7 py-4 text-base font-bold text-slate-950 shadow-xl shadow-emerald-500/25 hover:from-emerald-400 hover:to-emerald-500 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <span>Accéder à la plateforme</span>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>

                <a
                  href="https://wa.me/221773386660?text=Bonjour%2C%20je%20souhaite%20une%20d%C3%A9monstration%20de%20SAMA%20HOME"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-700/60 bg-[#0b1b17] px-5 py-4 text-base font-semibold text-emerald-200 hover:bg-[#122e26] hover:text-white transition-all shadow-md"
                >
                  <span className="text-emerald-400">💬</span>
                  <span>Démo WhatsApp (+221 77 338 66 60)</span>
                </a>
              </div>

              {/* Rassurance immédiate */}
              <div className="mt-8 flex flex-wrap items-center gap-6 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>100% sur mobile & PC</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Zéro installation requise</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Support 7j/7 à Dakar</span>
                </div>
              </div>
            </div>

            {/* Colonne Droite : Mockup Mobile Haute-Fidélité avec la VRAIE interface SAMA HOME */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-full max-w-[340px] rounded-[42px] border-4 border-slate-700/80 bg-slate-950 p-3 shadow-2xl shadow-emerald-950/80 ring-1 ring-emerald-500/20">
                {/* Dynamic Island */}
                <div className="absolute top-5 left-1/2 h-4 w-28 -translate-x-1/2 rounded-full bg-slate-900 z-20 flex items-center justify-end px-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500/80" />
                </div>

                {/* Écran Intérieur */}
                <div className="overflow-hidden rounded-[32px] bg-[#0b141a] border border-[#1f2d36] p-4 pt-8 text-xs text-white">
                  {/* Header App */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#1f2d36]">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">SAMA HOME</p>
                      <h4 className="font-bold text-slate-100 text-sm">Résidence Terrou-Bi</h4>
                    </div>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/40">
                      ● Caisse Active
                    </span>
                  </div>

                  {/* Carte Solde / Revenus (Comme modèle 2) */}
                  <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#121e26] to-[#0b141a] p-4 border border-[#1f2d36] shadow-md">
                    <p className="text-[10px] text-slate-400 font-medium">Revenu du mois en cours</p>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-xl font-black text-white">8 450 000 FCFA</span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">+18.4%</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-[#1f2d36] text-[10px]">
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
                    <div className="rounded-xl bg-[#121e26] p-2 text-center border border-[#1f2d36]">
                      <span className="text-base">🔑</span>
                      <p className="mt-1 text-[9px] font-medium text-slate-300">Séjour</p>
                    </div>
                    <div className="rounded-xl bg-[#121e26] p-2 text-center border border-[#1f2d36]">
                      <span className="text-base">📅</span>
                      <p className="mt-1 text-[9px] font-medium text-slate-300">Réserver</p>
                    </div>
                    <div className="rounded-xl bg-[#121e26] p-2 text-center border border-[#1f2d36]">
                      <span className="text-base">💵</span>
                      <p className="mt-1 text-[9px] font-medium text-slate-300">Caisse</p>
                    </div>
                  </div>

                  {/* Dernières Activités Réelles */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 mb-2">
                      <span>Derniers Règlements</span>
                      <span className="text-emerald-400">Voir tout</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between rounded-xl bg-[#121e26] p-2.5 border border-[#1f2d36]">
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

                      <div className="flex items-center justify-between rounded-xl bg-[#121e26] p-2.5 border border-[#1f2d36]">
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
                    className="mt-4 block w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-2.5 text-center font-bold text-slate-950 shadow-md hover:from-emerald-400 hover:to-emerald-500 transition-colors"
                  >
                    Se Connecter →
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
      <section className="border-y border-[#1f2d36]/80 bg-[#0b141a]/80 py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-emerald-400/80 mb-5">
            Approuvé par les propriétaires et gestionnaires d'hébergement au Sénégal
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="flex items-center gap-2.5 rounded-xl border border-[#1f2d36] bg-[#121e26] px-3 py-2 text-xs text-slate-300">
              <span className="text-base text-emerald-400">🛡️</span>
              <span className="font-medium">Sécurité renforcée</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-[#1f2d36] bg-[#121e26] px-3 py-2 text-xs text-slate-300">
              <span className="text-base text-emerald-400">⚡</span>
              <span className="font-medium">Temps réel</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-[#1f2d36] bg-[#121e26] px-3 py-2 text-xs text-slate-300">
              <span className="text-base text-emerald-400">📅</span>
              <span className="font-medium">Anti-chevauchement</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-[#1f2d36] bg-[#121e26] px-3 py-2 text-xs text-slate-300">
              <span className="text-base text-emerald-400">💰</span>
              <span className="font-medium">Tarifs Nuitée / Heure</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-[#1f2d36] bg-[#121e26] px-3 py-2 text-xs text-slate-300">
              <span className="text-base text-emerald-400">💵</span>
              <span className="font-medium">Zéro fuite de caisse</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-[#1f2d36] bg-[#121e26] px-3 py-2 text-xs text-slate-300">
              <span className="text-base text-emerald-400">📱</span>
              <span className="font-medium">Mobile, Tablette & PC</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Chiffres Clés (Comme Modèle 2) */}
      <section className="py-16 sm:py-20 border-b border-[#1f2d36]/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 text-center lg:grid-cols-4">
            <div className="p-4 rounded-2xl bg-[#0b141a] border border-[#1f2d36]">
              <div className="text-3xl sm:text-4xl font-black text-amber-400">100%</div>
              <div className="mt-1 text-sm font-bold text-slate-200">Isolation Multi-Tenant</div>
              <div className="mt-1 text-xs text-slate-400">Vos données sont strictement étanches</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#0b141a] border border-[#1f2d36]">
              <div className="text-3xl sm:text-4xl font-black text-emerald-400">0 F CFA</div>
              <div className="mt-1 text-sm font-bold text-slate-200">Écart de Caisse Toléré</div>
              <div className="mt-1 text-xs text-slate-400">Comptage mathématique à chaque quart</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#0b141a] border border-[#1f2d36]">
              <div className="text-3xl sm:text-4xl font-black text-amber-400">1 Clic</div>
              <div className="mt-1 text-sm font-bold text-slate-200">Contrat & Facture Client</div>
              <div className="mt-1 text-xs text-slate-400">Imprimable ou envoyé par WhatsApp</div>
            </div>
            <div className="p-4 rounded-2xl bg-[#0b141a] border border-[#1f2d36]">
              <div className="text-3xl sm:text-4xl font-black text-emerald-400">24h / 24</div>
              <div className="mt-1 text-sm font-bold text-slate-200">Suivi sur Smartphone</div>
              <div className="mt-1 text-xs text-slate-400">Contrôlez vos recettes où que vous soyez</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Section : À quoi sert SAMA HOME & Ce que ça fait */}
      <section className="py-20 lg:py-24" id="fonctionnalites">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Pourquoi choisir SAMA HOME ?
            </span>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl text-white">
              Dites adieu aux cahiers papier et aux pertes de recettes
            </h2>
            <p className="mt-4 text-slate-300 text-base sm:text-lg">
              Une transition simple qui transforme votre quotidien et sécurise vos finances.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Avant SAMA HOME */}
            <div className="rounded-3xl border border-rose-900/40 bg-gradient-to-br from-rose-950/20 to-[#0b141a] p-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 font-black text-lg">✕</span>
                <h3 className="text-xl font-bold text-rose-300">Sans SAMA HOME (Méthode Manuelle)</h3>
              </div>
              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>Cahiers papier tachés, perdus ou illisibles par le gérant.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>Écarts de caisse inexpliqués à la fin du quart des réceptionnistes.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>Double réservation le week-end provoquant la colère des clients.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>Absence de contrat écrit : litiges sur les cautions et dégradations.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>Impossibilité pour le propriétaire de connaître ses gains quand il voyage.</span>
                </li>
              </ul>
            </div>

            {/* Avec SAMA HOME */}
            <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 to-[#0b141a] p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-lg">✓</span>
                <h3 className="text-xl font-bold text-emerald-300">Avec SAMA HOME (Gestion Digitale)</h3>
              </div>
              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Toutes les données sauvegardées en temps réel dans le Cloud sécurisé.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Pointage mathématique de la caisse (Wave, OM, Espèces) au franc près.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Calendrier anti-conflit bloquant toute attribution de chambre déjà louée.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Contrats de bail et reçus clients générés et imprimés en un clic.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Suivi en direct depuis votre téléphone, 24h/24, partout dans le monde.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Section Pour Qui ? */}
      <section className="py-16 bg-[#0b141a]/60 border-y border-[#1f2d36]" id="pour-qui">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Cibles Professionnelles
            </span>
            <h2 className="mt-2 text-3xl font-extrabold text-white">
              Une solution adaptée à tous les types d'hébergement
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#1f2d36] bg-[#121e26] p-6 text-center hover:border-emerald-500 transition-colors">
              <span className="text-3xl block mb-3">🏨</span>
              <h4 className="font-bold text-white text-base">Hôtels & Auberges</h4>
              <p className="mt-2 text-xs text-slate-400">Gestion des chambres, check-in express, passage/sieste, room service et facturation.</p>
            </div>
            <div className="rounded-2xl border border-[#1f2d36] bg-[#121e26] p-6 text-center hover:border-emerald-500 transition-colors">
              <span className="text-3xl block mb-3">🛋️</span>
              <h4 className="font-bold text-white text-base">Résidences Meublées</h4>
              <p className="mt-2 text-xs text-slate-400">Courts et moyens séjours, caution, contrat de bail et calendrier des réservations.</p>
            </div>
            <div className="rounded-2xl border border-[#1f2d36] bg-[#121e26] p-6 text-center hover:border-emerald-500 transition-colors">
              <span className="text-3xl block mb-3">🏢</span>
              <h4 className="font-bold text-white text-base">Agences Immobilières</h4>
              <p className="mt-2 text-xs text-slate-400">Gestion de biens multiples pour différents propriétaires et calcul des commissions.</p>
            </div>
            <div className="rounded-2xl border border-[#1f2d36] bg-[#121e26] p-6 text-center hover:border-emerald-500 transition-colors">
              <span className="text-3xl block mb-3">🌴</span>
              <h4 className="font-bold text-white text-base">Maisons d'Hôtes & Villas</h4>
              <p className="mt-2 text-xs text-slate-400">Suivi des disponibilités, accueil personnalisé et bilan des dépenses d'entretien.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Section ShowCase des 5 Écrans Réels (Inspiré Modèle 2 Bas : "Toute votre finance...") */}
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

          {/* Rangée de 5 Écrans Smartphones */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {/* Écran 1 */}
            <div className="rounded-3xl border border-[#1f2d36] bg-[#0b141a] p-4 text-center transition-all hover:-translate-y-2 hover:border-emerald-500 shadow-xl">
              <div className="h-44 rounded-2xl bg-[#121e26] p-3 text-left border border-[#1f2d36] flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-emerald-400 font-bold">
                    <span>DASHBOARD</span>
                    <span>● LIVE</span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-white">Revenu Global</p>
                  <p className="text-base font-black text-amber-300">8 450 000 F</p>
                </div>
                <div className="rounded-lg bg-emerald-950/60 p-1.5 text-[9px] text-slate-300">
                  Occupation : <span className="font-bold text-emerald-300">89%</span>
                </div>
              </div>
              <h3 className="mt-4 font-bold text-white text-sm">1. Tableau de Bord</h3>
              <p className="mt-1 text-xs text-slate-400">Vue globale, chiffre d'affaires et arrivées en direct.</p>
            </div>

            {/* Écran 2 */}
            <div className="rounded-3xl border border-[#1f2d36] bg-[#0b141a] p-4 text-center transition-all hover:-translate-y-2 hover:border-emerald-500 shadow-xl">
              <div className="h-44 rounded-2xl bg-[#121e26] p-3 text-left border border-[#1f2d36] flex flex-col justify-between">
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
                  Tarifs : Nuitée & Sieste (Heure)
                </div>
              </div>
              <h3 className="mt-4 font-bold text-white text-sm">2. Parc Logements</h3>
              <p className="mt-1 text-xs text-slate-400">Chambres, suites et forfaits de tarification souples.</p>
            </div>

            {/* Écran 3 */}
            <div className="rounded-3xl border border-[#1f2d36] bg-[#0b141a] p-4 text-center transition-all hover:-translate-y-2 hover:border-emerald-500 shadow-xl">
              <div className="h-44 rounded-2xl bg-[#121e26] p-3 text-left border border-[#1f2d36] flex flex-col justify-between">
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

            {/* Écran 4 */}
            <div className="rounded-3xl border border-[#1f2d36] bg-[#0b141a] p-4 text-center transition-all hover:-translate-y-2 hover:border-emerald-500 shadow-xl">
              <div className="h-44 rounded-2xl bg-[#121e26] p-3 text-left border border-[#1f2d36] flex flex-col justify-between">
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

            {/* Écran 5 */}
            <div className="rounded-3xl border border-[#1f2d36] bg-[#0b141a] p-4 text-center transition-all hover:-translate-y-2 hover:border-emerald-500 shadow-xl">
              <div className="h-44 rounded-2xl bg-[#121e26] p-3 text-left border border-[#1f2d36] flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-emerald-400 font-bold">
                    <span>CONTRAT</span>
                    <span>PDF Prêt</span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-white">Bail Court Séjour</p>
                  <p className="text-[10px] text-slate-400 mt-1">Signature & Règles maison</p>
                </div>
                <div className="rounded-lg bg-emerald-950/60 p-1.5 text-[9px] text-slate-300">
                  Reçu WhatsApp instantané
                </div>
              </div>
              <h3 className="mt-4 font-bold text-white text-sm">5. Contrats & Factures</h3>
              <p className="mt-1 text-xs text-slate-400">Édition instantanée aux couleurs de votre établissement.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Bannière Call To Action Majeure avec Bouton Direct vers /login */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-[#0b141a] via-[#060f15] to-[#121e26] border-t border-[#1f2d36]">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-b from-[#122e26]/80 to-[#0b141a] p-8 sm:p-14 shadow-2xl relative overflow-hidden">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Prêt à professionnaliser la gestion de votre établissement ?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-slate-300">
              Rejoignez les gestionnaires d'hébergement au Sénégal qui économisent du temps et sécurisent leur trésorerie avec SAMA HOME.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-4 text-base font-bold text-slate-950 shadow-xl shadow-emerald-500/25 hover:from-emerald-400 hover:to-emerald-500 transition-all"
              >
                <span>Se Connecter à l'Application</span>
                <span>→</span>
              </Link>
              <a
                href="https://wa.me/221773386660?text=Bonjour%20M.%20GUEYE%2C%20je%20souhaite%20activer%20mon%20%C3%A9tablissement%20sur%20SAMA%20HOME"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-700/60 bg-[#0b1b17] px-6 py-4 text-base font-semibold text-emerald-200 hover:bg-[#122e26] transition-all"
              >
                <span>💬 Assistance Commerciale WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Pied de Page Institutionnel */}
      <footer className="border-t border-[#1f2d36] bg-[#03080b] py-12 text-xs text-slate-400" id="contact">
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
              <div className="mt-3 inline-block rounded-md bg-[#0e2720] px-2.5 py-1 text-[11px] font-semibold text-emerald-300 border border-emerald-800/40">
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

          <div className="mt-8 border-t border-[#1f2d36] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <p>© 2026 {COMPANY_LEGAL_INFO.commercialName}. Tous droits réservés.</p>
            <p className="text-emerald-400/80">SAMA HOME — Conçu pour l'excellence de l'hospitalité en Afrique de l'Ouest</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
