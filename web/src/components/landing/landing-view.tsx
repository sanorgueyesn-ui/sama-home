"use client";

import { useState } from "react";
import Link from "next/link";
import { COMPANY_LEGAL_INFO } from "@/lib/company-info";

export function LandingView() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-[#060f15] text-[#f7f8f6] font-sans selection:bg-amber-400 selection:text-slate-950 antialiased overflow-x-hidden">
      
      {/* 
        Arrière-plan Haute Couture :
        Image de la suite d'hôtel de luxe SAMA HOME avec opacité des couleurs réduite
        pour que la chambre, les lampes et la literie soient bien visibles tout en restant élégantes.
      */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero/sama-home-default-hero.png"
          alt=""
          className="h-full w-full object-cover opacity-45 scale-105 filter blur-[1.5px] transition-transform duration-1000"
        />
        {/* Voile feutré dégradé à opacité allégée pour laisser transparaître nettement la suite */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#060f15]/50 via-[#0b141a]/60 to-[#060f15]/75 backdrop-blur-[0.5px]" />
        
        {/* Halos lumineux discrets et apaisés */}
        <div className="absolute -top-32 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[150px]" />
        <div className="absolute top-[45%] -left-32 h-[450px] w-[450px] rounded-full bg-orange-600/5 blur-[160px]" />
        <div className="absolute top-[65%] -right-32 h-[500px] w-[500px] rounded-full bg-amber-500/8 blur-[170px]" />
      </div>

      {/* 1. Header / Navigation Flottante SAMA HOME (Glassmorphism Feutré & Responsive Mobile) */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#060f15]/90 backdrop-blur-xl transition-all">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3.5 py-3 sm:px-6 lg:px-8">
          
          {/* Logo SAMA HOME */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 font-black text-slate-950 shadow-md shadow-amber-950/40 transition-transform group-hover:scale-105">
              <span className="text-xl sm:text-2xl">S</span>
            </div>
            <div className="min-w-0">
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-white group-hover:text-amber-300 transition-colors block truncate">
                SAMA HOME
              </span>
              <span className="hidden xs:block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-300/80 truncate">
                Hospitality Platform • Sénégal
              </span>
            </div>
          </Link>

          {/* Navigation Liens Desktop (Masquée sur Mobile / Tablette) */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300">
            <a href="#presentation" className="hover:text-amber-300 transition-colors">Présentation</a>
            <a href="#fonctionnalites" className="hover:text-amber-300 transition-colors">Fonctionnalités</a>
            <a href="#modules" className="hover:text-amber-300 transition-colors">Modules en direct</a>
            <a href="#tarifs" className="hover:text-amber-300 transition-colors">Avantages</a>
            <a href="#contact" className="hover:text-amber-300 transition-colors">Contact</a>
          </nav>

          {/* Actions Droite */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-200 backdrop-blur-md shadow-sm hover:bg-white/10 hover:border-amber-300/40 hover:text-white transition-all whitespace-nowrap"
            >
              Se connecter
            </Link>
            
            <Link
              href="/register"
              className="hidden sm:inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-300 hover:to-orange-400 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
            >
              Créer un compte
            </Link>

            {/* Bouton Hamburger Menu Mobile / Tablette */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 p-2 text-slate-200 hover:bg-white/10 hover:text-white transition-all"
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Menu Déroulant Mobile & Tablette */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/10 bg-[#060f15]/95 backdrop-blur-2xl px-4 py-5 shadow-2xl animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col space-y-3 pb-4 border-b border-white/10 text-sm font-medium text-slate-200">
              <a
                href="#presentation"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-3 rounded-lg hover:bg-white/5 hover:text-amber-300 transition-colors"
              >
                Présentation
              </a>
              <a
                href="#fonctionnalites"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-3 rounded-lg hover:bg-white/5 hover:text-amber-300 transition-colors"
              >
                Fonctionnalités
              </a>
              <a
                href="#modules"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-3 rounded-lg hover:bg-white/5 hover:text-amber-300 transition-colors"
              >
                Modules en direct
              </a>
              <a
                href="#tarifs"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-3 rounded-lg hover:bg-white/5 hover:text-amber-300 transition-colors"
              >
                Avantages
              </a>
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-3 rounded-lg hover:bg-white/5 hover:text-amber-300 transition-colors"
              >
                Contact
              </a>
            </nav>

            <div className="pt-4 flex flex-col gap-2.5">
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 py-3 text-sm font-bold text-slate-950 shadow-md"
              >
                Créer un compte établissement
              </Link>
              <div className="mt-2 flex flex-col gap-2 text-xs font-semibold text-slate-300">
                <a
                  href={`tel:${COMPANY_LEGAL_INFO.phone}`}
                  className="flex items-center justify-center gap-2 rounded-lg bg-white/5 py-2 border border-white/10 text-amber-300"
                >
                  📞 Ligne 1 : {COMPANY_LEGAL_INFO.formattedPhone}
                </a>
                <a
                  href={`tel:${COMPANY_LEGAL_INFO.phoneSecondary}`}
                  className="flex items-center justify-center gap-2 rounded-lg bg-white/5 py-2 border border-white/10 text-amber-300"
                >
                  📞 Ligne 2 : {COMPANY_LEGAL_INFO.formattedPhoneSecondary}
                </a>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section Principale (Parfaitement Aligné & Calibré pour Mobile / Tablette) */}
      <section className="relative z-10 pt-8 sm:pt-14 lg:pt-20 pb-16 sm:pb-24 lg:pb-32" id="presentation">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-8">
            
            {/* Colonne Gauche : Pitch & Call to Action */}
            <div className="lg:col-span-7 text-center sm:text-left">
              
              {/* Badge Social Proof discret et adouci */}
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-amber-200 mb-6 shadow-sm backdrop-blur-md max-w-full text-left">
                <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                  <div className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[8px] font-black text-slate-950 ring-2 ring-[#060f15]">
                    SN
                  </div>
                  <div className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[8px] font-black text-white ring-2 ring-[#060f15]">
                    DK
                  </div>
                  <div className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-700 text-[8px] font-black text-white ring-2 ring-[#060f15]">
                    TH
                  </div>
                </div>
                <span className="truncate">+ de 500 établissements et résidences au Sénégal</span>
              </div>

              {/* Titre Majeur Percutant aux Couleurs Nobles & Feutrées */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.18] sm:leading-[1.14]">
                Prenez le contrôle de{" "}
                <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-orange-300 bg-clip-text text-transparent">
                  vos résidences & hôtels
                </span>{" "}
                facilement
              </h1>

              <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-slate-300/90 leading-relaxed max-w-2xl font-normal">
                Une solution tout-en-un pour piloter vos chambres, séjours, réservations, règlements (<strong className="text-amber-300 font-semibold">Wave, Orange Money, Espèces</strong>) et clôtures de caisse sans aucune erreur.
              </p>

              {/* Boutons d'Action Principaux (Organisés & Ajustés pour Mobile / Tablette) */}
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <Link
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-6 sm:px-7 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-300 hover:to-orange-400 hover:scale-[1.02] active:scale-[0.98] transition-all text-center"
                >
                  <span>Accéder à l'application</span>
                  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>

                <a
                  href="https://wa.me/221773386660?text=Bonjour%2C%20je%20souhaite%20une%20d%C3%A9monstration%20de%20SAMA%20HOME"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 backdrop-blur-md px-5 sm:px-6 py-3.5 sm:py-4 text-sm sm:text-base font-semibold text-slate-200 hover:bg-white/10 hover:text-white hover:border-amber-300/40 transition-all shadow-sm text-center"
                >
                  <span>💬 Démo WhatsApp</span>
                  <span className="hidden sm:inline">({COMPANY_LEGAL_INFO.formattedPhone})</span>
                </a>
              </div>

              {/* Les 2 Numéros de Contact Direct Officiels (Adaptés Mobile) */}
              <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 text-xs font-semibold text-slate-300">
                <div className="flex items-center justify-center sm:justify-start gap-2 rounded-lg bg-white/5 px-3 py-2 border border-white/10 backdrop-blur-sm">
                  <span className="text-amber-300">📞 Ligne 1 :</span>
                  <a href={`tel:${COMPANY_LEGAL_INFO.phone}`} className="hover:text-amber-300 transition-colors font-bold text-white">
                    {COMPANY_LEGAL_INFO.formattedPhone}
                  </a>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-2 rounded-lg bg-white/5 px-3 py-2 border border-white/10 backdrop-blur-sm">
                  <span className="text-amber-300">📞 Ligne 2 :</span>
                  <a href={`tel:${COMPANY_LEGAL_INFO.phoneSecondary}`} className="hover:text-amber-300 transition-colors font-bold text-white">
                    {COMPANY_LEGAL_INFO.formattedPhoneSecondary}
                  </a>
                </div>
              </div>

              {/* Rassurance discrète */}
              <div className="mt-6 flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-6 text-xs font-medium text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-300">✓</span>
                  <span>100% sur mobile & PC</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-300">✓</span>
                  <span>Zéro installation requise</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-300">✓</span>
                  <span>Support 7j/7 Dakar</span>
                </div>
              </div>
            </div>

            {/* Colonne Droite : Mockup 3D Smartphone Flagship (Sans Débordement) */}
            <div className="lg:col-span-5 relative flex justify-center mt-6 lg:mt-0 px-2 sm:px-0">
              
              {/* Le Smartphone Flagship SAMA HOME */}
              <div className="relative w-full max-w-[310px] sm:max-w-[340px] rounded-[38px] sm:rounded-[44px] border-[4px] border-slate-700/70 bg-slate-950/95 p-2.5 sm:p-3 shadow-2xl shadow-black/80 ring-1 ring-amber-400/20 backdrop-blur-xl mx-auto">
                {/* Dynamic Island */}
                <div className="absolute top-4 left-1/2 h-3.5 sm:h-4 w-24 sm:w-28 -translate-x-1/2 rounded-full bg-slate-900 z-20 flex items-center justify-end px-2">
                  <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-amber-400 animate-pulse" />
                </div>

                {/* Écran Intérieur */}
                <div className="overflow-hidden rounded-[30px] sm:rounded-[34px] bg-[#0b141a]/95 border border-white/10 p-3 sm:p-4 pt-7 sm:pt-8 text-xs text-white">
                  {/* Header App */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-amber-300 font-extrabold">SAMA HOME</p>
                      <h4 className="font-extrabold text-slate-100 text-xs sm:text-sm">Résidence Terrou-Bi</h4>
                    </div>
                    <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-amber-300 border border-amber-400/20 shrink-0">
                      ● Caisse Active
                    </span>
                  </div>

                  {/* Carte Solde & Revenus du Mois */}
                  <div className="mt-3 sm:mt-4 rounded-2xl bg-gradient-to-br from-[#162734]/90 to-[#0b141a]/90 p-3.5 sm:p-4 border border-amber-400/20 shadow-md">
                    <p className="text-[10px] text-slate-300/80 font-medium">Revenu du mois (Octobre)</p>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-xl sm:text-2xl font-black text-white">8 450 000 F</span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/25">+18.4%</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[9px] sm:text-[10px]">
                      <div>
                        <span className="text-slate-400 block font-normal">Occupation</span>
                        <span className="font-bold text-amber-300">89% (17/19 loués)</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-normal">Arrivées</span>
                        <span className="font-bold text-white">4 check-ins</span>
                      </div>
                    </div>
                  </div>

                  {/* Boutons d'Action Rapide SAMA HOME */}
                  <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
                    <div className="rounded-xl bg-white/5 p-2 text-center border border-white/10 hover:border-amber-400/40 transition-colors">
                      <span className="text-sm sm:text-base block">🔑</span>
                      <p className="mt-1 text-[9px] font-bold text-slate-200">Séjour</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2 text-center border border-white/10 hover:border-amber-400/40 transition-colors">
                      <span className="text-sm sm:text-base block">📅</span>
                      <p className="mt-1 text-[9px] font-bold text-slate-200">Réserver</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2 text-center border border-white/10 hover:border-amber-400/40 transition-colors">
                      <span className="text-sm sm:text-base block">💵</span>
                      <p className="mt-1 text-[9px] font-bold text-slate-200">Caisse</p>
                    </div>
                  </div>

                  {/* Dernières Transactions Récents */}
                  <div className="mt-3 sm:mt-4">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-2">
                      <span>Derniers Règlements Encaissés</span>
                      <span className="text-amber-300">Voir tout</span>
                    </div>

                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="flex items-center justify-between rounded-xl bg-white/5 p-2 sm:p-2.5 border border-white/10">
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                          <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                            🌊
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-100 text-[10px] sm:text-[11px] truncate">Chambre VIP 104</p>
                            <p className="text-[8px] sm:text-[9px] text-slate-400 truncate">Wave • Amadou Diallo</p>
                          </div>
                        </div>
                        <span className="font-extrabold text-amber-300 text-[11px] sm:text-xs shrink-0">+45 000 F</span>
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-white/5 p-2 sm:p-2.5 border border-white/10">
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                          <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                            🍊
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-100 text-[10px] sm:text-[11px] truncate">Studio F2 CICES</p>
                            <p className="text-[8px] sm:text-[9px] text-slate-400 truncate">Orange Money • Fatou Sow</p>
                          </div>
                        </div>
                        <span className="font-extrabold text-amber-300 text-[11px] sm:text-xs shrink-0">+35 000 F</span>
                      </div>
                    </div>
                  </div>

                  {/* Bouton d'Entrée Direct vers /login */}
                  <Link
                    href="/login"
                    className="mt-3 sm:mt-4 block w-full rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 py-2.5 text-center font-bold text-slate-950 text-xs sm:text-sm shadow-md hover:from-amber-300 hover:to-orange-400 transition-colors"
                  >
                    Se Connecter à l'Application →
                  </Link>
                </div>
              </div>

              {/* Notification Flottante 1 (Haut Droite - Cachée sur Petit Mobile pour Éviter Débordement) */}
              <div className="hidden sm:flex absolute -top-4 right-0 lg:-right-4 items-center gap-2.5 rounded-2xl border border-amber-400/30 bg-[#121e26]/95 p-2.5 sm:p-3 shadow-xl backdrop-blur-xl">
                <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-amber-400 text-slate-950 font-black text-xs shrink-0">
                  ✓
                </span>
                <div>
                  <p className="text-[10px] sm:text-[11px] font-bold text-white">Wave Reçu : 45 000 F</p>
                  <p className="text-[8px] sm:text-[9px] text-amber-200/80">Chambre 104 • Check-in validé</p>
                </div>
              </div>

              {/* Notification Flottante 2 (Bas Gauche - Cachée sur Petit Mobile pour Éviter Débordement) */}
              <div className="hidden sm:flex absolute -bottom-5 left-0 lg:-left-6 items-center gap-2.5 rounded-2xl border border-white/15 bg-[#121e26]/95 p-2.5 sm:p-3 shadow-xl backdrop-blur-xl">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300 text-sm font-bold shrink-0">
                  📄
                </div>
                <div>
                  <p className="text-[11px] sm:text-xs font-bold text-white">Contrat généré en 1 clic</p>
                  <p className="text-[9px] sm:text-[10px] text-amber-300/80">Signature & Reçu WhatsApp</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. Bandeau de Pilules Fonctionnelles SAMA HOME (Feutré & Calibré) */}
      <section className="relative z-10 border-y border-white/10 bg-[#0b141a]/80 backdrop-blur-lg py-5 sm:py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-300/80 mb-4 sm:mb-5">
            Fonctionnalités essentielles conçues pour le marché ouest-africain
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            <div className="flex items-center justify-center sm:justify-start gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2 text-xs text-slate-200 hover:border-amber-400/40 transition-colors">
              <span className="text-sm sm:text-base text-amber-300">🛡️</span>
              <span className="font-semibold text-[11px] sm:text-xs text-center sm:text-left">Multi-tenant étanche</span>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2 text-xs text-slate-200 hover:border-amber-400/40 transition-colors">
              <span className="text-sm sm:text-base text-amber-300">⚡</span>
              <span className="font-semibold text-[11px] sm:text-xs text-center sm:text-left">Temps réel Cloud</span>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2 text-xs text-slate-200 hover:border-amber-400/40 transition-colors">
              <span className="text-sm sm:text-base text-amber-300">📅</span>
              <span className="font-semibold text-[11px] sm:text-xs text-center sm:text-left">Anti-chevauchement</span>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2 text-xs text-slate-200 hover:border-amber-400/40 transition-colors">
              <span className="text-sm sm:text-base text-amber-300">💰</span>
              <span className="font-semibold text-[11px] sm:text-xs text-center sm:text-left">Tarifs Nuitée / Heures</span>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2 text-xs text-slate-200 hover:border-amber-400/40 transition-colors">
              <span className="text-sm sm:text-base text-amber-300">💵</span>
              <span className="font-semibold text-[11px] sm:text-xs text-center sm:text-left">Zéro écart de caisse</span>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2 text-xs text-slate-200 hover:border-amber-400/40 transition-colors">
              <span className="text-sm sm:text-base text-amber-300">📱</span>
              <span className="font-semibold text-[11px] sm:text-xs text-center sm:text-left">Mobile & Ordinateur</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Les 4 Chiffres Clés SAMA HOME (Cartes Glassmorphism Proportions Mobile / Tablette) */}
      <section className="relative z-10 py-12 sm:py-16 lg:py-20 border-b border-white/10 bg-black/20" id="tarifs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-3 sm:gap-6 text-center lg:grid-cols-4">
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#0b141a]/80 backdrop-blur-xl border border-white/10 shadow-lg hover:border-amber-400/30 transition-colors flex flex-col justify-center">
              <div className="text-2xl sm:text-4xl lg:text-5xl font-black text-amber-300 tracking-tight">100%</div>
              <div className="mt-1.5 sm:mt-2 text-xs sm:text-sm font-bold text-slate-200">Isolation Multi-Tenant</div>
              <div className="mt-1 text-[10px] sm:text-xs text-slate-400">Données confidentielles et hermétiques</div>
            </div>
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#0b141a]/80 backdrop-blur-xl border border-white/10 shadow-lg hover:border-amber-400/30 transition-colors flex flex-col justify-center">
              <div className="text-2xl sm:text-4xl lg:text-5xl font-black text-orange-300 tracking-tight">0 F CFA</div>
              <div className="mt-1.5 sm:mt-2 text-xs sm:text-sm font-bold text-slate-200">Écart de Caisse Toléré</div>
              <div className="mt-1 text-[10px] sm:text-xs text-slate-400">Rapprochement mathématique rigoureux</div>
            </div>
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#0b141a]/80 backdrop-blur-xl border border-white/10 shadow-lg hover:border-amber-400/30 transition-colors flex flex-col justify-center">
              <div className="text-2xl sm:text-4xl lg:text-5xl font-black text-amber-300 tracking-tight">1 Clic</div>
              <div className="mt-1.5 sm:mt-2 text-xs sm:text-sm font-bold text-slate-200">Contrat & Facture Client</div>
              <div className="mt-1 text-[10px] sm:text-xs text-slate-400">Génération automatique prête à l'envoi</div>
            </div>
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#0b141a]/80 backdrop-blur-xl border border-white/10 shadow-lg hover:border-amber-400/30 transition-colors flex flex-col justify-center">
              <div className="text-2xl sm:text-4xl lg:text-5xl font-black text-orange-300 tracking-tight">24h / 24</div>
              <div className="mt-1.5 sm:mt-2 text-xs sm:text-sm font-bold text-slate-200">Suivi sur Smartphone</div>
              <div className="mt-1 text-[10px] sm:text-xs text-slate-400">Contrôlez vos recettes où que vous soyez</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Section : À quoi sert SAMA HOME (Sans vs Avec SAMA HOME) */}
      <section className="relative z-10 py-14 sm:py-20 lg:py-24" id="fonctionnalites">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Pourquoi choisir SAMA HOME ?
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
              Dites adieu aux cahiers papier et aux pertes de recettes
            </h2>
            <p className="mt-3 sm:mt-4 text-slate-300 text-sm sm:text-base md:text-lg">
              Une transition simple qui transforme le quotidien de vos équipes et sécurise vos finances.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
            {/* Avant SAMA HOME */}
            <div className="rounded-2xl sm:rounded-3xl border border-rose-500/30 bg-[#0b141a]/85 backdrop-blur-xl p-5 sm:p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300 font-black text-base sm:text-lg shrink-0">✕</span>
                <h3 className="text-lg sm:text-xl font-extrabold text-rose-300">Sans SAMA HOME (Gestion Manuelle)</h3>
              </div>
              <ul className="space-y-3 sm:space-y-4 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 font-bold shrink-0">•</span>
                  <span>Cahiers papier sales, perdus ou manipulés à l'insu du propriétaire.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 font-bold shrink-0">•</span>
                  <span>Écarts de caisse inexpliqués à la fin du quart des réceptionnistes.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 font-bold shrink-0">•</span>
                  <span>Double réservation le week-end provoquant la colère des clients.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 font-bold shrink-0">•</span>
                  <span>Absence de contrat écrit : litiges récurrents sur les cautions et dégradations.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 font-bold shrink-0">•</span>
                  <span>Impossibilité pour le propriétaire de connaître ses gains réels en déplacement.</span>
                </li>
              </ul>
            </div>

            {/* Avec SAMA HOME */}
            <div className="rounded-2xl sm:rounded-3xl border border-amber-400/30 bg-[#0b141a]/85 backdrop-blur-xl p-5 sm:p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300 font-black text-base sm:text-lg shrink-0">✓</span>
                <h3 className="text-lg sm:text-xl font-extrabold text-amber-300">Avec SAMA HOME (Gestion Digitale)</h3>
              </div>
              <ul className="space-y-3 sm:space-y-4 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="text-amber-300 font-bold shrink-0">•</span>
                  <span>Toutes les données sauvegardées en direct dans un cloud haute sécurité.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-amber-300 font-bold shrink-0">•</span>
                  <span>Pointage mathématique de la caisse (Wave, OM, Espèces) au franc près.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-amber-300 font-bold shrink-0">•</span>
                  <span>Planning anti-chevauchement bloquant l'attribution d'une chambre occupée.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-amber-300 font-bold shrink-0">•</span>
                  <span>Contrats de bail et reçus clients générés et envoyés en un clic.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-amber-300 font-bold shrink-0">•</span>
                  <span>Suivi des gains en temps réel sur smartphone, partout dans le monde.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Section : Pour Qui est fait SAMA HOME ? */}
      <section className="relative z-10 py-12 sm:py-16 bg-[#0b141a]/70 backdrop-blur-lg border-y border-white/10" id="pour-qui">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Cibles Professionnelles
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white">
              Une solution adaptée à tous les professionnels de l'hospitalité
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
            <div className="rounded-2xl border border-white/10 bg-[#121e26]/80 backdrop-blur-xl p-5 sm:p-6 text-center hover:border-amber-400/40 transition-all hover:-translate-y-1 shadow-lg">
              <span className="text-3xl sm:text-4xl block mb-2 sm:mb-3">🏨</span>
              <h4 className="font-extrabold text-white text-base">Hôtels & Auberges</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Gestion des chambres, check-in express, passage/sieste, room service et facturation unifiée.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#121e26]/80 backdrop-blur-xl p-5 sm:p-6 text-center hover:border-amber-400/40 transition-all hover:-translate-y-1 shadow-lg">
              <span className="text-3xl sm:text-4xl block mb-2 sm:mb-3">🛋️</span>
              <h4 className="font-extrabold text-white text-base">Résidences Meublées</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Courts et moyens séjours, caution, contrat de bail et synchronisation des réservations.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#121e26]/80 backdrop-blur-xl p-5 sm:p-6 text-center hover:border-amber-400/40 transition-all hover:-translate-y-1 shadow-lg">
              <span className="text-3xl sm:text-4xl block mb-2 sm:mb-3">🏢</span>
              <h4 className="font-extrabold text-white text-base">Agences Immobilières</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Centralisation de logements multiples pour le compte de plusieurs propriétaires bailleurs.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#121e26]/80 backdrop-blur-xl p-5 sm:p-6 text-center hover:border-amber-400/40 transition-all hover:-translate-y-1 shadow-lg">
              <span className="text-3xl sm:text-4xl block mb-2 sm:mb-3">🌴</span>
              <h4 className="font-extrabold text-white text-base">Maisons d'Hôtes & Villas</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Planning sans aucun doublon, accueil personnalisé et suivi des charges d'entretien.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Section ShowCase des 5 Écrans Réels SAMA HOME (Harmonieux sur Tablette & Mobile) */}
      <section className="relative z-10 py-14 sm:py-20 lg:py-28" id="modules">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Expérience Multi-Écrans
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
              Toute votre gestion hôtelière dans une seule application
            </h2>
            <p className="mt-3 sm:mt-4 text-slate-300 text-sm sm:text-base md:text-lg">
              Une interface intuitive, pensée pour être maîtrisée par vos équipes en moins de 15 minutes, accessible sur n'importe quel appareil.
            </p>
          </div>

          {/* Rangée de 5 Écrans Smartphones aux Couleurs SAMA HOME */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            {/* Écran 1 */}
            <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#0b141a]/85 backdrop-blur-xl p-3.5 sm:p-4 text-center transition-all hover:-translate-y-1 hover:border-amber-400/40 shadow-xl">
              <div className="h-40 sm:h-44 rounded-2xl bg-[#121e26]/90 p-3 text-left border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-amber-300 font-bold">
                    <span>DASHBOARD</span>
                    <span>● EN DIRECT</span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-white">Revenu Global</p>
                  <p className="text-sm sm:text-base font-black text-amber-300">8 450 000 F</p>
                </div>
                <div className="rounded-lg bg-amber-400/10 p-1.5 text-[9px] text-slate-300 border border-amber-400/20">
                  Occupation : <span className="font-bold text-amber-300">89%</span>
                </div>
              </div>
              <h3 className="mt-3 sm:mt-4 font-bold text-white text-sm">1. Tableau de Bord</h3>
              <p className="mt-1 text-xs text-slate-400">Vue globale, chiffre d'affaires et arrivées en direct.</p>
            </div>

            {/* Écran 2 */}
            <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#0b141a]/85 backdrop-blur-xl p-3.5 sm:p-4 text-center transition-all hover:-translate-y-1 hover:border-amber-400/40 shadow-xl">
              <div className="h-40 sm:h-44 rounded-2xl bg-[#121e26]/90 p-3 text-left border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-amber-300 font-bold">
                    <span>LOGEMENTS</span>
                    <span>18 Dispos</span>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    <div className="rounded bg-slate-900/80 p-1 text-[9px] flex justify-between">
                      <span className="text-white">Chambre 101</span>
                      <span className="text-amber-300 font-semibold">Libre</span>
                    </div>
                    <div className="rounded bg-slate-900/80 p-1 text-[9px] flex justify-between">
                      <span className="text-white">Suite Almadies</span>
                      <span className="text-orange-300 font-semibold">Occupé</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-amber-400/10 p-1.5 text-[9px] text-slate-300 border border-amber-400/20">
                  Tarifs : Nuitée & Heures (Passage)
                </div>
              </div>
              <h3 className="mt-3 sm:mt-4 font-bold text-white text-sm">2. Parc Logements</h3>
              <p className="mt-1 text-xs text-slate-400">Chambres, suites et forfaits de tarification souples.</p>
            </div>

            {/* Écran 3 */}
            <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#0b141a]/85 backdrop-blur-xl p-3.5 sm:p-4 text-center transition-all hover:-translate-y-1 hover:border-amber-400/40 shadow-xl">
              <div className="h-40 sm:h-44 rounded-2xl bg-[#121e26]/90 p-3 text-left border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-amber-300 font-bold">
                    <span>CALENDRIER</span>
                    <span>Anti-Conflit</span>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-300 font-medium">Planning Interactif</p>
                  <div className="mt-2 rounded bg-amber-400/10 border border-amber-400/25 p-1.5 text-[9px] text-amber-300 font-semibold">
                    0 double réservation garantie
                  </div>
                </div>
                <div className="rounded-lg bg-amber-400/10 p-1.5 text-[9px] text-slate-300 border border-amber-400/20">
                  Acomptes & Arrhes
                </div>
              </div>
              <h3 className="mt-3 sm:mt-4 font-bold text-white text-sm">3. Réservations</h3>
              <p className="mt-1 text-xs text-slate-400">Calendrier intelligent et blocage des doublons.</p>
            </div>

            {/* Écran 4 */}
            <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#0b141a]/85 backdrop-blur-xl p-3.5 sm:p-4 text-center transition-all hover:-translate-y-1 hover:border-amber-400/40 shadow-xl">
              <div className="h-40 sm:h-44 rounded-2xl bg-[#121e26]/90 p-3 text-left border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-amber-300 font-bold">
                    <span>CAISSE</span>
                    <span>Contrôlée</span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-white">Fond Initial Déclaré</p>
                  <p className="text-xs font-semibold text-amber-300 mt-1">25 000 FCFA</p>
                </div>
                <div className="rounded-lg bg-amber-400/10 p-1.5 text-[9px] text-slate-300 border border-amber-400/20">
                  Espèces, Wave & OM
                </div>
              </div>
              <h3 className="mt-3 sm:mt-4 font-bold text-white text-sm">4. Caisse Journalière</h3>
              <p className="mt-1 text-xs text-slate-400">Session de quart et pointage des encaissements.</p>
            </div>

            {/* Écran 5 */}
            <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#0b141a]/85 backdrop-blur-xl p-3.5 sm:p-4 text-center transition-all hover:-translate-y-1 hover:border-amber-400/40 shadow-xl sm:col-span-2 md:col-span-1">
              <div className="h-40 sm:h-44 rounded-2xl bg-[#121e26]/90 p-3 text-left border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-amber-300 font-bold">
                    <span>CONTRAT</span>
                    <span>PDF Prêt</span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-white">Bail Court Séjour</p>
                  <p className="text-[10px] text-slate-400 mt-1">Signature & Règles maison</p>
                </div>
                <div className="rounded-lg bg-amber-400/10 p-1.5 text-[9px] text-slate-300 border border-amber-400/20">
                  Reçu WhatsApp instantané
                </div>
              </div>
              <h3 className="mt-3 sm:mt-4 font-bold text-white text-sm">5. Contrats & Factures</h3>
              <p className="mt-1 text-xs text-slate-400">Édition instantanée aux couleurs de votre établissement.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Bannière Call To Action Majeure avec Boutons Directs & Contacts (Responsive) */}
      <section className="relative z-10 py-12 sm:py-20 bg-gradient-to-b from-transparent via-[#060f15]/80 to-[#060f15] border-t border-white/10">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <div className="rounded-2xl sm:rounded-3xl border border-amber-400/30 bg-gradient-to-b from-[#182127]/90 via-[#0b141a]/95 to-[#060f15]/95 p-6 sm:p-10 lg:p-14 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight">
              Prêt à professionnaliser la gestion de votre établissement ?
            </h2>
            <p className="mx-auto mt-4 sm:mt-5 max-w-2xl text-sm sm:text-base md:text-lg text-slate-300/90">
              Rejoignez les gestionnaires d'hébergement au Sénégal qui économisent du temps chaque semaine et sécurisent leur trésorerie avec SAMA HOME.
            </p>

            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto sm:max-w-none">
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-6 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-300 hover:to-orange-400 hover:scale-105 active:scale-95 transition-all text-center"
              >
                <span>Se Connecter à l'Application</span>
                <span>→</span>
              </Link>
              <a
                href="https://wa.me/221773386660?text=Bonjour%20M.%20GUEYE%2C%20je%20souhaite%20activer%20mon%20%C3%A9tablissement%20sur%20SAMA%20HOME"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 backdrop-blur-md px-5 sm:px-7 py-3.5 sm:py-4 text-sm sm:text-base font-semibold text-slate-200 hover:bg-white/10 hover:text-white hover:border-amber-400/40 transition-all shadow-sm text-center"
              >
                <span>💬 WhatsApp</span>
                <span className="hidden sm:inline">: {COMPANY_LEGAL_INFO.formattedPhone}</span>
              </a>
            </div>

            {/* Deux Lignes Directes d'Assistance Téléphonique */}
            <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm font-semibold text-slate-300">
              <span className="rounded-lg bg-white/5 px-3 py-1.5 border border-white/10 text-center">
                Ligne 1 : <a href={`tel:${COMPANY_LEGAL_INFO.phone}`} className="text-amber-300 hover:underline">{COMPANY_LEGAL_INFO.formattedPhone}</a>
              </span>
              <span className="rounded-lg bg-white/5 px-3 py-1.5 border border-white/10 text-center">
                Ligne 2 : <a href={`tel:${COMPANY_LEGAL_INFO.phoneSecondary}`} className="text-amber-300 hover:underline">{COMPANY_LEGAL_INFO.formattedPhoneSecondary}</a>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Pied de Page Institutionnel avec les Deux Contacts (Responsive) */}
      <footer className="relative z-10 border-t border-white/10 bg-[#03080b]/90 backdrop-blur-md py-10 sm:py-12 text-xs text-slate-400" id="contact">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-slate-950 font-black text-base shadow-sm shrink-0">
                  S
                </div>
                <span className="font-extrabold text-white text-base">SAMA HOME</span>
              </div>
              <p className="mt-3 max-w-md text-slate-400 text-xs leading-relaxed">
                Plateforme logicielle éditée par <strong>{COMPANY_LEGAL_INFO.commercialName}</strong> ({COMPANY_LEGAL_INFO.sigle}). Entreprise immatriculée au Registre du Commerce et du Crédit Mobilier de Dakar (RCCM) et auprès de l'ANSD.
              </p>
              <div className="mt-3 inline-block rounded-md bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-amber-300 border border-white/10">
                NINEA : {COMPANY_LEGAL_INFO.ninea} • RCCM : {COMPANY_LEGAL_INFO.rccm}
              </div>
            </div>

            <div>
              <p className="font-bold text-white text-sm mb-3">Navigation Directe</p>
              <ul className="space-y-2">
                <li><Link href="/login" className="hover:text-amber-300 transition-colors font-bold text-amber-300">→ Se Connecter</Link></li>
                <li><Link href="/register" className="hover:text-amber-300 transition-colors">Créer un Établissement</Link></li>
                <li><Link href="/forgot-password" className="hover:text-amber-300 transition-colors">Mot de passe oublié</Link></li>
                <li><a href="#fonctionnalites" className="hover:text-amber-300 transition-colors">Fonctionnalités Clés</a></li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-white text-sm mb-3">Contacts & Siège</p>
              <ul className="space-y-2 text-slate-400">
                <li>📍 {COMPANY_LEGAL_INFO.address}</li>
                <li>🇸🇳 {COMPANY_LEGAL_INFO.city}, {COMPANY_LEGAL_INFO.country}</li>
                <li className="pt-1 text-slate-200">
                  📞 <strong>Ligne 1 :</strong> <a href={`tel:${COMPANY_LEGAL_INFO.phone}`} className="text-amber-300 hover:underline">{COMPANY_LEGAL_INFO.formattedPhone}</a>
                </li>
                <li className="text-slate-200">
                  📞 <strong>Ligne 2 :</strong> <a href={`tel:${COMPANY_LEGAL_INFO.phoneSecondary}`} className="text-amber-300 hover:underline">{COMPANY_LEGAL_INFO.formattedPhoneSecondary}</a>
                </li>
                <li className="pt-1">✉️ <strong>Support :</strong> <a href={`mailto:${COMPANY_LEGAL_INFO.supportEmail}`} className="text-amber-300 hover:underline break-all">{COMPANY_LEGAL_INFO.supportEmail}</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-[11px]">
            <p>© 2026 {COMPANY_LEGAL_INFO.commercialName}. Tous droits réservés.</p>
            <p className="text-amber-300/80">SAMA HOME — Conçu pour l'excellence de l'hospitalité en Afrique de l'Ouest</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
