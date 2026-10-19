"use client";

import { useState } from "react";
import Link from "next/link";
import { COMPANY_LEGAL_INFO } from "@/lib/company-info";

export function LandingView() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDeviceTab, setActiveDeviceTab] = useState<"all" | "pc" | "tablet" | "mobile">("all");

  return (
    <div className="relative min-h-screen bg-[#060f15] text-[#f7f8f6] font-sans selection:bg-amber-400 selection:text-slate-950 antialiased overflow-x-hidden">
      
      {/* 
        Arrière-plan Haute Définition Feutré :
        Image de suite d'exception avec ambiance luxueuse et halos lumineux dorés
      */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/landing/lounge-corniche-fann.jpeg"
          alt=""
          className="h-full w-full object-cover opacity-70 sm:opacity-75 scale-105 transition-transform duration-1000"
        />
        {/* Voile feutré dégradé équilibré laissant ressortir l'élégance de la pièce tout en garantissant la lisibilité */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#060f15]/30 via-[#0b141a]/40 to-[#060f15]/65" />
        
        {/* Halos lumineux dorés feutrés */}
        <div className="absolute -top-32 left-1/2 h-[550px] w-[950px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[160px]" />
        <div className="absolute top-[40%] -left-32 h-[450px] w-[450px] rounded-full bg-orange-600/8 blur-[170px]" />
        <div className="absolute top-[65%] -right-32 h-[500px] w-[500px] rounded-full bg-amber-500/8 blur-[180px]" />
      </div>

      {/* 1. Header / Navigation Flottante SAMA HOME — Parfaitement Aligné & Spacieux */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#060f15]/95 backdrop-blur-2xl transition-all">
        <div className="mx-auto flex h-18 sm:h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Logo SAMA HOME */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 font-black text-slate-950 shadow-md shadow-amber-950/40 transition-transform group-hover:scale-105">
              <span className="text-xl sm:text-2xl">S</span>
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white group-hover:text-amber-300 transition-colors leading-none">
                  SAMA HOME
                </span>
                <span className="hidden xl:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Cloud Sénégal
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80 mt-1">
                Hospitality Platform • Dakar
              </span>
            </div>
          </Link>

          {/* Navigation Liens & Sous-Menus Déroulants Desktop (Alignement Horizontal & Vertical Rigoureux) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-medium">
            
            {/* Lien 1 : Présentation */}
            <a
              href="#presentation"
              className="inline-flex items-center h-10 px-3.5 rounded-xl font-semibold text-slate-200 hover:text-amber-300 hover:bg-white/5 transition-all whitespace-nowrap"
            >
              Présentation
            </a>

            {/* Menu Déroulant 1 : Solutions */}
            <div className="relative group/menu flex items-center h-full">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl font-semibold text-slate-200 group-hover/menu:text-amber-300 group-hover/menu:bg-white/5 transition-all cursor-pointer whitespace-nowrap"
              >
                <span>Solutions</span>
                <svg className="h-4 w-4 text-slate-400 group-hover/menu:text-amber-300 group-hover/menu:rotate-180 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className="invisible group-hover/menu:visible opacity-0 group-hover/menu:opacity-100 transition-all duration-200 absolute top-full left-0 w-72 pt-2 z-50">
                <div className="rounded-2xl border border-white/15 bg-[#0b141a]/98 backdrop-blur-2xl p-2.5 shadow-2xl space-y-1">
                  <a
                    href="#multi-ecrans"
                    className="flex flex-col gap-0.5 rounded-xl p-2.5 hover:bg-white/5 hover:text-amber-300 transition-colors group/item"
                  >
                    <span className="text-xs font-bold text-white group-hover/item:text-amber-300 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Multi-Écrans Synchronisé
                    </span>
                    <span className="text-[11px] text-slate-400 pl-6">PC Bureau, Tablette Réception &amp; Mobile</span>
                  </a>
                  <a
                    href="#residences"
                    className="flex flex-col gap-0.5 rounded-xl p-2.5 hover:bg-white/5 hover:text-amber-300 transition-colors group/item"
                  >
                    <span className="text-xs font-bold text-white group-hover/item:text-amber-300 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Résidences d&apos;Exception
                    </span>
                    <span className="text-[11px] text-slate-400 pl-6">Suites, appartements meublés &amp; villas</span>
                  </a>
                  <a
                    href="#residences"
                    className="flex flex-col gap-0.5 rounded-xl p-2.5 hover:bg-white/5 hover:text-amber-300 transition-colors group/item"
                  >
                    <span className="text-xs font-bold text-white group-hover/item:text-amber-300 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Hôtels &amp; Auberges
                    </span>
                    <span className="text-[11px] text-slate-400 pl-6">Chambres avec tarification nuitée / heures</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Menu Déroulant 2 : Modules Métier */}
            <div className="relative group/menu flex items-center h-full">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl font-semibold text-slate-200 group-hover/menu:text-amber-300 group-hover/menu:bg-white/5 transition-all cursor-pointer whitespace-nowrap"
              >
                <span>Modules Métier</span>
                <svg className="h-4 w-4 text-slate-400 group-hover/menu:text-amber-300 group-hover/menu:rotate-180 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className="invisible group-hover/menu:visible opacity-0 group-hover/menu:opacity-100 transition-all duration-200 absolute top-full left-0 w-80 pt-2 z-50">
                <div className="rounded-2xl border border-white/15 bg-[#0b141a]/98 backdrop-blur-2xl p-2.5 shadow-2xl space-y-1">
                  <a
                    href="#fonctionnalites"
                    className="flex flex-col gap-0.5 rounded-xl p-2.5 hover:bg-white/5 hover:text-amber-300 transition-colors group/item"
                  >
                    <span className="text-xs font-bold text-white group-hover/item:text-amber-300 flex items-center gap-2">
                      <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Séjours &amp; Check-in Express
                    </span>
                    <span className="text-[11px] text-slate-400 pl-6">Entrées, départs, cautions &amp; fiches de police</span>
                  </a>
                  <a
                    href="#fonctionnalites"
                    className="flex flex-col gap-0.5 rounded-xl p-2.5 hover:bg-white/5 hover:text-amber-300 transition-colors group/item"
                  >
                    <span className="text-xs font-bold text-white group-hover/item:text-amber-300 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Planning &amp; Réservations
                    </span>
                    <span className="text-[11px] text-slate-400 pl-6">Calendrier anti-surréservation en temps réel</span>
                  </a>
                  <a
                    href="#fonctionnalites"
                    className="flex flex-col gap-0.5 rounded-xl p-2.5 hover:bg-white/5 hover:text-amber-300 transition-colors group/item"
                  >
                    <span className="text-xs font-bold text-white group-hover/item:text-amber-300 flex items-center gap-2">
                      <svg className="h-4 w-4 text-sky-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Finances &amp; Caisse Étanche
                    </span>
                    <span className="text-[11px] text-slate-400 pl-6">Paiements Wave, Orange Money &amp; clôtures</span>
                  </a>
                  <a
                    href="#modules"
                    className="flex flex-col gap-0.5 rounded-xl p-2.5 hover:bg-white/5 hover:text-amber-300 transition-colors group/item"
                  >
                    <span className="text-xs font-bold text-white group-hover/item:text-amber-300 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Gestion Locative &amp; Contrats
                    </span>
                    <span className="text-[11px] text-slate-400 pl-6">Baux officiels 1 clic &amp; quittances conformes</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Lien 3 : Fonctionnalités Clés */}
            <a
              href="#fonctionnalites"
              className="inline-flex items-center h-10 px-3.5 rounded-xl font-semibold text-slate-200 hover:text-amber-300 hover:bg-white/5 transition-all whitespace-nowrap"
            >
              Fonctionnalités
            </a>

            {/* Lien 4 : Contact */}
            <a
              href="#contact"
              className="inline-flex items-center h-10 px-3.5 rounded-xl font-semibold text-slate-200 hover:text-amber-300 hover:bg-white/5 transition-all whitespace-nowrap"
            >
              Contact
            </a>
          </nav>

          {/* Actions Droite */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <Link
              href="/login"
              className="h-10 inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-xs sm:text-sm font-semibold text-slate-200 backdrop-blur-md shadow-sm hover:bg-white/10 hover:border-amber-300/40 hover:text-white transition-all whitespace-nowrap"
            >
              Se connecter
            </Link>
            
            <Link
              href="/register"
              className="h-10 hidden sm:inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-4 text-xs sm:text-sm font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-300 hover:to-orange-400 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
            >
              Créer un compte
            </Link>

            {/* Bouton Hamburger Menu Mobile / Tablette */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="h-10 w-10 lg:hidden inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white transition-all shrink-0"
              aria-label="Menu de navigation"
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
          <div className="lg:hidden border-t border-white/10 bg-[#060f15]/98 backdrop-blur-2xl px-4 py-5 shadow-2xl animate-in slide-in-from-top-2 duration-200 max-h-[85vh] overflow-y-auto">
            <div className="mb-3 pb-3 border-b border-white/10 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Machine connectée au Cloud
              </span>
              <span className="text-xs text-slate-400">Dakar, Sénégal</span>
            </div>

            <nav className="flex flex-col space-y-1.5 pb-4 border-b border-white/10 text-sm font-medium text-slate-200">
              <a
                href="#presentation"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-white/5 hover:text-amber-300 transition-colors"
              >
                Présentation
              </a>
              <a
                href="#multi-ecrans"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-white/5 hover:text-amber-300 transition-colors"
              >
                Multi-Écrans (PC, Tablette, Mobile)
              </a>
              <a
                href="#fonctionnalites"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-white/5 hover:text-amber-300 transition-colors"
              >
                Fonctionnalités Clés &amp; Modules
              </a>
              <a
                href="#residences"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-white/5 hover:text-amber-300 transition-colors"
              >
                Résidences d&apos;Exception &amp; Hôtels
              </a>
              <a
                href="#modules"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-white/5 hover:text-amber-300 transition-colors"
              >
                Gestion Locative &amp; Contrats
              </a>
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl hover:bg-white/5 hover:text-amber-300 transition-colors"
              >
                Contact &amp; Démo WhatsApp
              </a>
            </nav>

            <div className="pt-4 flex flex-col gap-2.5">
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 py-3.5 text-sm font-bold text-slate-950 shadow-md"
              >
                Créer un compte établissement
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Se connecter à l&apos;application
              </Link>
              <div className="mt-2 flex flex-col gap-2 text-xs font-semibold text-slate-300">
                <a
                  href={`tel:${COMPANY_LEGAL_INFO.phone}`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-white/5 py-2.5 border border-white/10 text-amber-300"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>Ligne 1 : {COMPANY_LEGAL_INFO.formattedPhone}</span>
                </a>
                <a
                  href={`tel:${COMPANY_LEGAL_INFO.phoneSecondary}`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-white/5 py-2.5 border border-white/10 text-amber-300"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>Ligne 2 : {COMPANY_LEGAL_INFO.formattedPhoneSecondary}</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section Principale — Parfaitement Aligné & Centré sur Mobile et Tablette */}
      <section className="relative z-10 pt-8 sm:pt-12 lg:pt-16 pb-16 sm:pb-20 lg:pb-28" id="presentation">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            
            {/* Colonne Gauche : Pitch & Call to Action (Centré sur Mobile & Tablette, Aligné Gauche sur Desktop) */}
            <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left mx-auto lg:mx-0 w-full max-w-2xl lg:max-w-none">
              
              {/* Badge Social Proof & Géolocalisation */}
              <div className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-400/25 bg-amber-500/10 px-3.5 py-1.5 text-[11px] sm:text-xs font-semibold text-amber-200 mb-6 shadow-sm backdrop-blur-md max-w-full text-center mx-auto lg:mx-0">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="truncate">Sénégal • Dakar • Saly • Petite Côte • +500 résidences</span>
              </div>

              {/* Titre Majeur Percutant aux Couleurs Nobles & Feutrées */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-black tracking-tight text-white leading-[1.18] sm:leading-[1.14] text-center lg:text-left">
                Prenez le contrôle de{" "}
                <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-orange-300 bg-clip-text text-transparent">
                  vos résidences &amp; hôtels
                </span>{" "}
                facilement
              </h1>

              <p className="mt-4 sm:mt-6 text-base sm:text-lg text-slate-300/90 leading-relaxed font-normal mx-auto lg:mx-0 text-center lg:text-left">
                La solution tout-en-un conçue pour les gérants au Sénégal : séjours en direct, réservations, caisse automatique reliée aux dépenses (<strong className="text-amber-300 font-semibold">Wave, Orange Money, Espèces</strong>) et contrats en 1 clic.
              </p>

              {/* Boutons d'Action Principaux (Centrés sur Mobile & Tablette, Taille Cohérente & Faciles à Utiliser) */}
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4 w-full sm:w-auto mx-auto lg:mx-0 max-w-md sm:max-w-none">
                <Link
                  href="/login"
                  className="w-full sm:w-auto min-h-[52px] sm:min-h-[54px] inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-6 sm:px-8 py-3.5 text-sm sm:text-base font-black text-slate-950 shadow-xl shadow-amber-500/25 hover:from-amber-300 hover:to-orange-400 hover:scale-[1.02] active:scale-[0.98] transition-all text-center"
                >
                  <span>Accéder à l&apos;application</span>
                  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>

                <a
                  href="https://wa.me/221773386660?text=Bonjour%2C%20je%20souhaite%20une%20d%C3%A9monstration%20de%20SAMA%20HOME"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto min-h-[52px] sm:min-h-[54px] inline-flex items-center justify-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md px-6 sm:px-7 py-3.5 text-sm sm:text-base font-bold text-white hover:bg-white/15 hover:border-amber-300/50 hover:text-amber-200 transition-all shadow-md text-center"
                >
                  <svg className="h-5 w-5 text-emerald-400 shrink-0 fill-current" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.004.573 1.777.877 2.806.877 3.18 0 5.768-2.587 5.768-5.766.001-3.18-2.587-5.76-5.768-5.76zm3.364 8.163c-.141.396-.714.735-1.026.779-.276.038-.636.064-2.029-.513-1.636-.677-2.737-2.348-2.818-2.456-.081-.108-.66-.879-.66-1.673 0-.794.417-1.185.565-1.345.148-.16.324-.2.432-.2.108 0 .216.002.311.007.1.006.234-.038.366.279.135.324.462 1.127.502 1.208.04.081.067.176.013.283-.053.108-.08.175-.16.27-.08.094-.17.21-.243.282-.08.081-.164.17-.07.332.094.162.418.69.898 1.117.618.55 1.14.721 1.302.802.162.081.256.068.35-.041.095-.108.405-.472.513-.634.108-.162.216-.135.365-.081.148.054.945.446 1.107.527.162.081.27.122.31.189.041.068.041.392-.1.788z" />
                  </svg>
                  <span>Démo WhatsApp Directe</span>
                </a>
              </div>

              {/* Les 2 Numéros de Contact Direct Officiels (Centrés, Lisibles & Click-to-Call) */}
              <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-2.5 sm:gap-3 text-xs font-semibold text-slate-200 mx-auto lg:mx-0 w-full sm:w-auto max-w-md sm:max-w-none">
                <a
                  href={`tel:${COMPANY_LEGAL_INFO.phone}`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#0f1922]/85 px-4 py-2.5 border border-white/15 backdrop-blur-md hover:border-amber-400/50 hover:bg-[#152330] transition-all w-full sm:w-auto text-center min-h-[44px]"
                >
                  <svg className="h-4 w-4 text-amber-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-amber-300 font-bold">Ligne 1 :</span>
                  <span className="font-extrabold text-white">{COMPANY_LEGAL_INFO.formattedPhone}</span>
                </a>
                <a
                  href={`tel:${COMPANY_LEGAL_INFO.phoneSecondary}`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#0f1922]/85 px-4 py-2.5 border border-white/15 backdrop-blur-md hover:border-amber-400/50 hover:bg-[#152330] transition-all w-full sm:w-auto text-center min-h-[44px]"
                >
                  <svg className="h-4 w-4 text-amber-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-amber-300 font-bold">Ligne 2 :</span>
                  <span className="font-extrabold text-white">{COMPANY_LEGAL_INFO.formattedPhoneSecondary}</span>
                </a>
              </div>

              {/* Rassurance discrète et centrée sur mobile & tablette */}
              <div className="mt-5 flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-6 text-[11px] sm:text-xs font-medium text-slate-300 mx-auto lg:mx-0">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>100% sur PC, Tablette &amp; Mobile</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span>Caisse &amp; Dépenses synchronisées</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  <span>Support 7j/7 Dakar</span>
                </div>
              </div>
            </div>

            {/* Colonne Droite : Maquette Multi-Écrans (PC, Tablette, Mobile) — Adaptée Tablette & Mobile Sans Écrasement */}
            <div className="lg:col-span-6 relative flex items-center justify-center mt-6 lg:mt-0 w-full">
              
              {/* Conteneur Relative Aéré & Proportionnel */}
              <div className="relative w-full max-w-xl mx-auto">
                
                {/* Halo d'ambiance doré subtil sous la maquette */}
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 via-orange-500/10 to-transparent blur-3xl -z-10 rounded-3xl" />

                {/* Cadre de Présentation Haute Définition */}
                <div className="group relative rounded-3xl border border-white/15 bg-gradient-to-b from-[#141f27]/90 via-[#0b141a]/95 to-[#060f15]/98 p-3 sm:p-4 shadow-[0_30px_70px_rgba(0,0,0,0.8)] backdrop-blur-2xl transition-all">
                  
                  {/* Barre d'état supérieure du mockup */}
                  <div className="flex items-center justify-between pb-3 px-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                      <span className="ml-2 text-[11px] font-bold text-white/60">sama-home.sn • Multi-Device Suite</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Connecté
                    </span>
                  </div>

                  {/* Vraie Image de la Maquette Multi-Écrans (PC, Tablette & Smartphone) */}
                  <div className="mt-3 relative rounded-2xl overflow-hidden bg-black/40 border border-white/10 aspect-[16/11] sm:aspect-[16/10] flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/landing/mockup-multi-devices.png"
                      alt="Maquette Complète SAMA HOME sur Ordinateur PC, Tablette iPad et Téléphone Smartphone"
                      className="w-full h-full object-contain p-2 transition-transform duration-700 group-hover:scale-[1.02]"
                    />
                    
                    {/* Filtre de brillance subtile */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#060f15]/70 via-transparent to-white/5" />
                  </div>

                  {/* Légende interactive sous l'image */}
                  <div className="mt-3.5 grid grid-cols-3 gap-2 text-center text-[10px] sm:text-xs">
                    <div className="rounded-xl border border-white/10 bg-white/5 py-2 px-1 flex flex-col items-center justify-center gap-1">
                      <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="block font-bold text-white">Ordinateur</span>
                      <span className="text-[10px] text-amber-300/80">Réception &amp; Caisse</span>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 py-2 px-1 flex flex-col items-center justify-center gap-1">
                      <svg className="h-4 w-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="block font-bold text-white">Tablette</span>
                      <span className="text-[10px] text-sky-300/80">Check-in chambre</span>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 py-2 px-1 flex flex-col items-center justify-center gap-1">
                      <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="block font-bold text-white">Smartphone</span>
                      <span className="text-[10px] text-emerald-300/80">Suivi du patron</span>
                    </div>
                  </div>
                </div>

                {/* Badge Flottant 1 (Haut Droite) : Wave Reçu en Temps Réel */}
                <div className="hidden sm:flex absolute -top-3 right-0 sm:top-2 sm:right-2 lg:-top-4 lg:-right-3 items-center gap-2.5 rounded-2xl border border-amber-400/30 bg-[#121e26]/95 p-3 shadow-2xl backdrop-blur-xl z-20 animate-in fade-in duration-300">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-400 text-slate-950 font-black text-xs shrink-0">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-xs font-extrabold text-white">Wave Reçu : +45 000 FCFA</p>
                    <p className="text-[10px] text-amber-300/90">Suite 104 • Automatiquement en Caisse</p>
                  </div>
                </div>

                {/* Badge Flottant 2 (Bas Gauche) : Caisse & Dépenses Étanche */}
                <div className="hidden sm:flex absolute -bottom-3 left-0 sm:bottom-2 sm:left-2 lg:-bottom-4 lg:-left-3 items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-[#121e26]/95 p-3 shadow-2xl backdrop-blur-xl z-20 animate-in fade-in duration-300">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-bold shrink-0">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-white">Caisse &amp; Dépenses Reliées</p>
                    <p className="text-[10px] text-emerald-400 font-semibold">0 FCFA d&apos;écart de caisse</p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. Bandeau de Pilules Fonctionnelles SAMA HOME — Centré sur Mobile & Tablette */}
      <section className="relative z-10 border-y border-white/10 bg-[#0b141a]/80 backdrop-blur-lg py-5 sm:py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-300/80 mb-4 sm:mb-5">
            Fonctionnalités essentielles conçues pour le marché sénégalais &amp; ouest-africain
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2 text-xs text-slate-200 hover:border-amber-400/40 transition-colors text-center">
              <svg className="h-4 w-4 text-amber-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="font-semibold text-[11px] sm:text-xs">Multi-tenant étanche</span>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2 text-xs text-slate-200 hover:border-amber-400/40 transition-colors text-center">
              <svg className="h-4 w-4 text-amber-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="font-semibold text-[11px] sm:text-xs">Machine connectée</span>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2 text-xs text-slate-200 hover:border-amber-400/40 transition-colors text-center">
              <svg className="h-4 w-4 text-amber-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-semibold text-[11px] sm:text-xs">Anti-chevauchement</span>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2 text-xs text-slate-200 hover:border-amber-400/40 transition-colors text-center">
              <svg className="h-4 w-4 text-amber-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="font-semibold text-[11px] sm:text-xs">Tarifs Nuitée / Heures</span>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2 text-xs text-slate-200 hover:border-amber-400/40 transition-colors text-center">
              <svg className="h-4 w-4 text-amber-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="font-semibold text-[11px] sm:text-xs">Caisse &amp; Dépenses reliées</span>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-3 py-2 text-xs text-slate-200 hover:border-amber-400/40 transition-colors text-center">
              <svg className="h-4 w-4 text-amber-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="font-semibold text-[11px] sm:text-xs">PC, Tablette &amp; Mobile</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECTION DÉDIÉE : EXPÉRIENCE MULTI-ÉCRANS (PC, Tablette & Mobile) */}
      <section className="relative z-10 py-14 sm:py-20 lg:py-24 border-b border-white/10 bg-[#060f15]" id="multi-ecrans">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-bold text-amber-300 uppercase tracking-wider">
              Une Application • 3 Façons de Travailler
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
              Pensée pour l&apos;Ordinateur du bureau, la Tablette de la réception et le Smartphone du patron
            </h2>
            <p className="mt-3 text-slate-300 text-sm sm:text-base md:text-lg">
              Pas besoin de réapprendre l&apos;outil : vos données se synchronisent instantanément entre tous vos appareils sans aucune manipulation manuelle.
            </p>
          </div>

          {/* Composition Multi-Écrans avec Grand Mockup Haute Définition */}
          <div className="rounded-3xl border border-white/15 bg-gradient-to-b from-[#111c24] via-[#0b141a] to-[#060f15] p-4 sm:p-8 lg:p-10 shadow-2xl overflow-hidden relative">
            
            {/* Barre de sélection d'écrans interactive */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs sm:text-sm font-bold text-white">Démo Interactive Multi-Écrans</span>
                <span className="hidden sm:inline text-xs text-slate-400">— Cliquez sur un appareil pour zoomer</span>
              </div>
              <div className="grid grid-cols-4 sm:flex sm:items-center gap-1 sm:gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 text-[11px] sm:text-xs font-semibold w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveDeviceTab("all")}
                  className={`px-1.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                    activeDeviceTab === "all"
                      ? "bg-amber-400 text-slate-950 font-bold shadow-md"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span className="truncate"><span className="hidden sm:inline">Tous les </span>Écrans</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDeviceTab("pc")}
                  className={`px-1.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                    activeDeviceTab === "pc"
                      ? "bg-amber-400 text-slate-950 font-bold shadow-md"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="truncate">PC</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDeviceTab("tablet")}
                  className={`px-1.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                    activeDeviceTab === "tablet"
                      ? "bg-sky-400 text-slate-950 font-bold shadow-md"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="truncate">Tablette</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDeviceTab("mobile")}
                  className={`px-1.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                    activeDeviceTab === "mobile"
                      ? "bg-emerald-400 text-slate-950 font-bold shadow-md"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="truncate">Mobile</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Image Visuelle de la Maquette Studio Multi-Devices Réelle */}
              <div className="lg:col-span-7 relative">
                <div className="rounded-2xl overflow-hidden border border-white/15 bg-black/40 shadow-2xl relative min-h-[260px] sm:min-h-[380px] lg:min-h-[440px] aspect-[16/10] flex items-center justify-center p-2 sm:p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      activeDeviceTab === "pc"
                        ? "/images/landing/mockup-pc-dashboard.png"
                        : activeDeviceTab === "tablet"
                        ? "/images/landing/mockup-tablet-planning.png"
                        : activeDeviceTab === "mobile"
                        ? "/images/landing/mockup-phone-caisse.png"
                        : "/images/landing/mockup-multi-devices-studio.jpg"
                    }
                    alt="SAMA HOME sur Grand Écran PC, Tablette iPad et Smartphone iPhone avec captures réelles de l'application"
                    className="w-full h-full object-contain transition-all duration-500 animate-in fade-in"
                  />
                  
                  {/* Badge d'identification du mode actif */}
                  <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-20 max-w-[calc(100%-1.5rem)]">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-[#060f15]/90 px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-bold text-white shadow-xl backdrop-blur-md truncate">
                      <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                      <span className="truncate">
                        {activeDeviceTab === "pc"
                          ? "Tableau de Bord & Caisse • Écran PC"
                          : activeDeviceTab === "tablet"
                          ? "Planning des Réservations • Tablette iPad"
                          : activeDeviceTab === "mobile"
                          ? "Caisse & Dépenses en Direct • Smartphone"
                          : "Studio Multi-Écrans Synchronisé"}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400 px-2">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Synchronisation Cloud Instantanée
                  </span>
                  <span className="text-amber-300 font-semibold">Zéro latence réseau</span>
                </div>
              </div>

              {/* Les 3 Piliers de l'Expérience Multi-Écrans avec Sélection Interactive */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                
                {/* 1. Sur Ordinateur PC / Mac */}
                <button
                  type="button"
                  onClick={() => setActiveDeviceTab("pc")}
                  className={`text-left rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer ${
                    activeDeviceTab === "pc"
                      ? "border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/30"
                      : "border-white/10 bg-surface/60 backdrop-blur-md hover:border-amber-400/40"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl font-black shrink-0 ${
                      activeDeviceTab === "pc" ? "bg-amber-400 text-slate-950" : "bg-amber-400/15 text-amber-300"
                    }`}>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </span>
                    <div>
                      <h3 className="font-extrabold text-white text-base">Sur Ordinateur (PC &amp; Mac)</h3>
                      <p className="text-[11px] font-bold text-amber-300">Le QG de la Réception &amp; de la Direction</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Grand calendrier visuel des réservations, pointage complet des recettes, impression des contrats officiels de bail et clôture de quart sans risque d&apos;erreur.
                  </p>
                </button>

                {/* 2. Sur Tablette (iPad / Android) */}
                <button
                  type="button"
                  onClick={() => setActiveDeviceTab("tablet")}
                  className={`text-left rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer ${
                    activeDeviceTab === "tablet"
                      ? "border-sky-400 bg-sky-400/10 shadow-lg shadow-sky-500/10 ring-1 ring-sky-400/30"
                      : "border-white/10 bg-surface/60 backdrop-blur-md hover:border-sky-400/40"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl font-black shrink-0 ${
                      activeDeviceTab === "tablet" ? "bg-sky-400 text-slate-950" : "bg-sky-400/15 text-sky-300"
                    }`}>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </span>
                    <div>
                      <h3 className="font-extrabold text-white text-base">Sur Tablette (iPad &amp; Android)</h3>
                      <p className="text-[11px] font-bold text-sky-300">Mobilité &amp; Accueil en Chambre</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Parfait pour accompagner le client jusqu&apos;à sa chambre, vérifier l&apos;état des lieux, lui faire signer le contrat au doigt et encaisser immédiatement.
                  </p>
                </button>

                {/* 3. Sur Smartphone (iPhone / Android) */}
                <button
                  type="button"
                  onClick={() => setActiveDeviceTab("mobile")}
                  className={`text-left rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer ${
                    activeDeviceTab === "mobile"
                      ? "border-emerald-400 bg-emerald-400/10 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400/30"
                      : "border-white/10 bg-surface/60 backdrop-blur-md hover:border-emerald-400/40"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl font-black shrink-0 ${
                      activeDeviceTab === "mobile" ? "bg-emerald-400 text-slate-950" : "bg-emerald-400/15 text-emerald-300"
                    }`}>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </span>
                    <div>
                      <h3 className="font-extrabold text-white text-base">Sur Smartphone (iPhone &amp; Android)</h3>
                      <p className="text-[11px] font-bold text-emerald-300">Le Patron Contrôle Tout 24h/24</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Où que vous soyez (à Dakar, en région ou en voyage à l&apos;étranger), surveillez le taux d&apos;occupation, les paiements Wave/OM reçus et les dépenses engagées.
                  </p>
                </button>

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 5. SHOWCASE LUXE : RÉSIDENCES & HÔTELS D'EXCEPTION PILOTÉS PAR SAMA HOME */}
      <section className="relative z-10 py-14 sm:py-20 lg:py-24" id="residences">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-bold text-amber-300 uppercase tracking-wider">
              Hébergements de Prestige
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
              Pensé pour les Suites de Luxe, Résidences Meublées &amp; Boutiques Hôtels
            </h2>
            <p className="mt-3 text-slate-300 text-sm sm:text-base md:text-lg">
              Du studio meublé aux Almadies jusqu&apos;à la suite présidentielle sur la Corniche, SAMA HOME valorise vos biens avec une gestion impeccable.
            </p>
          </div>

          {/* Grille des 6 Résidences d'Exception avec vraies photos d'intérieurs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            
            {/* Résidence 1 */}
            <div className="group rounded-3xl border border-white/10 bg-[#0b141a]/90 backdrop-blur-xl overflow-hidden shadow-xl hover:border-amber-400/40 transition-all hover:-translate-y-1">
              <div className="relative h-56 sm:h-64 overflow-hidden bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/landing/suite-royale-almadies.jpeg"
                  alt="Suite Royale Impériale aux Almadies"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <span className="absolute top-3 left-3 rounded-full bg-emerald-500/90 backdrop-blur-md px-3 py-1 text-[11px] font-black text-slate-950 shadow-md">
                  ● Libre • Prête
                </span>
                <span className="absolute top-3 right-3 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-amber-300 border border-amber-400/30">
                  90 000 F / jour
                </span>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Almadies • Dakar</p>
                <h3 className="text-base sm:text-lg font-black text-white mt-1">Suite Royale Impériale</h3>
                <p className="text-xs text-slate-400 mt-1">Chambre Master, literie 5 étoiles, salon VIP et conciergerie.</p>
                <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
                  <span className="text-[11px] text-slate-400">Paiements : Wave, OM, CB</span>
                  <span className="font-bold text-amber-300">Contrat auto ✓</span>
                </div>
              </div>
            </div>

            {/* Résidence 2 */}
            <div className="group rounded-3xl border border-white/10 bg-[#0b141a]/90 backdrop-blur-xl overflow-hidden shadow-xl hover:border-amber-400/40 transition-all hover:-translate-y-1">
              <div className="relative h-56 sm:h-64 overflow-hidden bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/landing/lounge-corniche-fann.jpeg"
                  alt="Penthouse Lounge avec canapé circulaire sur la Corniche"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <span className="absolute top-3 left-3 rounded-full bg-orange-500/90 backdrop-blur-md px-3 py-1 text-[11px] font-black text-slate-950 shadow-md">
                  ● Occupé (Check-out 14h)
                </span>
                <span className="absolute top-3 right-3 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-amber-300 border border-amber-400/30">
                  120 000 F / jour
                </span>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Fann Résidence • Vue Mer</p>
                <h3 className="text-base sm:text-lg font-black text-white mt-1">Penthouse Lounge Panoramique</h3>
                <p className="text-xs text-slate-400 mt-1">Salon circulaire marbre, terrasse privée et service majordome.</p>
                <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
                  <span className="text-[11px] text-slate-400">Caution : Enregistrée</span>
                  <span className="font-bold text-emerald-400">Reçu WhatsApp ✓</span>
                </div>
              </div>
            </div>

            {/* Résidence 3 */}
            <div className="group rounded-3xl border border-white/10 bg-[#0b141a]/90 backdrop-blur-xl overflow-hidden shadow-xl hover:border-amber-400/40 transition-all hover:-translate-y-1">
              <div className="relative h-56 sm:h-64 overflow-hidden bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/landing/suite-luxe-ngor.jpeg"
                  alt="Appartement VIP Design à Ngor"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <span className="absolute top-3 left-3 rounded-full bg-emerald-500/90 backdrop-blur-md px-3 py-1 text-[11px] font-black text-slate-950 shadow-md">
                  ● Libre • Prête
                </span>
                <span className="absolute top-3 right-3 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-amber-300 border border-amber-400/30">
                  65 000 F / jour
                </span>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Ngor Virage • Dakar</p>
                <h3 className="text-base sm:text-lg font-black text-white mt-1">Appartement VIP Cheminée &amp; Boiserie</h3>
                <p className="text-xs text-slate-400 mt-1">Design contemporain, TV grand écran, éclairage d&apos;ambiance feutré.</p>
                <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
                  <span className="text-[11px] text-slate-400">Nuitée ou Heures</span>
                  <span className="font-bold text-amber-300">Caisse liée ✓</span>
                </div>
              </div>
            </div>

            {/* Résidence 4 */}
            <div className="group rounded-3xl border border-white/10 bg-[#0b141a]/90 backdrop-blur-xl overflow-hidden shadow-xl hover:border-amber-400/40 transition-all hover:-translate-y-1">
              <div className="relative h-56 sm:h-64 overflow-hidden bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/landing/chambre-prestige-mermoz.jpeg"
                  alt="Chambre Suite Prestige à Mermoz"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <span className="absolute top-3 left-3 rounded-full bg-emerald-500/90 backdrop-blur-md px-3 py-1 text-[11px] font-black text-slate-950 shadow-md">
                  ● Libre • Prête
                </span>
                <span className="absolute top-3 right-3 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-amber-300 border border-amber-400/30">
                  45 000 F / jour
                </span>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Mermoz • Dakar</p>
                <h3 className="text-base sm:text-lg font-black text-white mt-1">Suite Sombre Prestige &amp; Sérénité</h3>
                <p className="text-xs text-slate-400 mt-1">Tonalités anthracite, literie orthopédique et calme absolu.</p>
                <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
                  <span className="text-[11px] text-slate-400">Passage : 20 000 F</span>
                  <span className="font-bold text-amber-300">Check-in express ✓</span>
                </div>
              </div>
            </div>

            {/* Résidence 5 */}
            <div className="group rounded-3xl border border-white/10 bg-[#0b141a]/90 backdrop-blur-xl overflow-hidden shadow-xl hover:border-amber-400/40 transition-all hover:-translate-y-1">
              <div className="relative h-56 sm:h-64 overflow-hidden bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/landing/suite-cosy-cices.jpeg"
                  alt="Résidence Cosy & Confort au CICES"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <span className="absolute top-3 left-3 rounded-full bg-emerald-500/90 backdrop-blur-md px-3 py-1 text-[11px] font-black text-slate-950 shadow-md">
                  ● Libre • Prête
                </span>
                <span className="absolute top-3 right-3 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-amber-300 border border-amber-400/30">
                  35 000 F / jour
                </span>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-300">CICES VDN • Dakar</p>
                <h3 className="text-base sm:text-lg font-black text-white mt-1">Appartement Cosy VDN</h3>
                <p className="text-xs text-slate-400 mt-1">Idéal pour séjours d&apos;affaires, canapé velours et climatisation silencieuse.</p>
                <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
                  <span className="text-[11px] text-slate-400">Forfait semaine dispo</span>
                  <span className="font-bold text-amber-300">Facture 1 clic ✓</span>
                </div>
              </div>
            </div>

            {/* Résidence 6 */}
            <div className="group rounded-3xl border border-white/10 bg-[#0b141a]/90 backdrop-blur-xl overflow-hidden shadow-xl hover:border-amber-400/40 transition-all hover:-translate-y-1">
              <div className="relative h-56 sm:h-64 overflow-hidden bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/landing/suite-or-point-e.jpeg"
                  alt="Suite Or & Bleu Nuit au Point E"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <span className="absolute top-3 left-3 rounded-full bg-emerald-500/90 backdrop-blur-md px-3 py-1 text-[11px] font-black text-slate-950 shadow-md">
                  ● Libre • Prête
                </span>
                <span className="absolute top-3 right-3 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-amber-300 border border-amber-400/30">
                  50 000 F / jour
                </span>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Point E • Dakar</p>
                <h3 className="text-base sm:text-lg font-black text-white mt-1">Suite Or &amp; Bleu Nuit</h3>
                <p className="text-xs text-slate-400 mt-1">Miroir lumineux de courtoisie, lustre cristal et ambiance royale.</p>
                <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
                  <span className="text-[11px] text-slate-400">Passage &amp; Nuitée</span>
                  <span className="font-bold text-amber-300">Wave direct ✓</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 6. Section : Les 4 Chiffres Clés SAMA HOME */}
      <section className="relative z-10 py-12 sm:py-16 lg:py-20 border-y border-white/10 bg-black/30" id="tarifs">
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
              <div className="mt-1 text-[10px] sm:text-xs text-slate-400">Rapprochement Wave, OM et Espèces</div>
            </div>
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#0b141a]/80 backdrop-blur-xl border border-white/10 shadow-lg hover:border-amber-400/30 transition-colors flex flex-col justify-center">
              <div className="text-2xl sm:text-4xl lg:text-5xl font-black text-amber-300 tracking-tight">1 Clic</div>
              <div className="mt-1.5 sm:mt-2 text-xs sm:text-sm font-bold text-slate-200">Contrat &amp; Facture Client</div>
              <div className="mt-1 text-[10px] sm:text-xs text-slate-400">Génération automatique prête à l&apos;envoi</div>
            </div>
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#0b141a]/80 backdrop-blur-xl border border-white/10 shadow-lg hover:border-amber-400/30 transition-colors flex flex-col justify-center">
              <div className="text-2xl sm:text-4xl lg:text-5xl font-black text-orange-300 tracking-tight">24h / 24</div>
              <div className="mt-1.5 sm:mt-2 text-xs sm:text-sm font-bold text-slate-200">Temps Réel Cloud</div>
              <div className="mt-1 text-[10px] sm:text-xs text-slate-400">Contrôlez vos recettes où que vous soyez</div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Section : À quoi sert SAMA HOME (Sans vs Avec SAMA HOME) */}
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
                <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300 font-black text-base sm:text-lg shrink-0">
                  ✕
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold text-rose-300">Sans SAMA HOME (Gestion Manuelle)</h3>
              </div>
              <ul className="space-y-3 sm:space-y-4 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 font-bold shrink-0">•</span>
                  <span>Cahiers papier sales, perdus ou manipulés à l&apos;insu du propriétaire.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 font-bold shrink-0">•</span>
                  <span>Dépenses non enregistrées créant des trous inexpliqués dans la caisse.</span>
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
                <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300 font-black text-base sm:text-lg shrink-0">
                  ✓
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold text-amber-300">Avec SAMA HOME (Gestion Digitale)</h3>
              </div>
              <ul className="space-y-3 sm:space-y-4 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="text-amber-300 font-bold shrink-0">•</span>
                  <span>Toutes les données sauvegardées en direct dans un cloud haute sécurité.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-amber-300 font-bold shrink-0">•</span>
                  <span>Caisse &amp; Dépenses reliées : calcul automatique et transparent des soldes.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-amber-300 font-bold shrink-0">•</span>
                  <span>Planning anti-chevauchement bloquant l&apos;attribution d&apos;une chambre occupée.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-amber-300 font-bold shrink-0">•</span>
                  <span>Contrats de bail officiels et reçus clients générés et envoyés en un clic.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-amber-300 font-bold shrink-0">•</span>
                  <span>Suivi des gains en temps réel sur PC, tablette et smartphone partout dans le monde.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Section ShowCase des 5 Modules Réels SAMA HOME */}
      <section className="relative z-10 py-14 sm:py-20 lg:py-28 bg-[#0b141a]/60 border-t border-white/10" id="modules">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Architecture Logicielle Complète
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
              Toute votre gestion hôtelière dans une seule application
            </h2>
            <p className="mt-3 sm:mt-4 text-slate-300 text-sm sm:text-base md:text-lg">
              Une interface intuitive, pensée pour être maîtrisée par vos équipes en moins de 15 minutes, accessible sur n&apos;importe quel appareil.
            </p>
          </div>

          {/* Rangée de 5 Modules aux Couleurs SAMA HOME */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            {/* Écran 1 */}
            <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#0b141a]/85 backdrop-blur-xl p-3.5 sm:p-4 text-center transition-all hover:-translate-y-1 hover:border-amber-400/40 shadow-xl">
              <div className="h-40 sm:h-44 rounded-2xl bg-[#121e26]/90 p-3 text-left border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-amber-300 font-bold">
                    <span>TABLEAU DE BORD</span>
                    <span className="text-emerald-400">● CONNECTÉ</span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-white">Revenu Global</p>
                  <p className="text-sm sm:text-base font-black text-amber-300">8 450 000 FCFA</p>
                </div>
                <div className="rounded-lg bg-amber-400/10 p-1.5 text-[9px] text-slate-300 border border-amber-400/20">
                  Occupation : <span className="font-bold text-amber-300">89% (17/19 loués)</span>
                </div>
              </div>
              <h3 className="mt-3 sm:mt-4 font-bold text-white text-sm">1. Tableau de Bord</h3>
              <p className="mt-1 text-xs text-slate-400">Vue globale, chiffre d&apos;affaires et arrivées en direct.</p>
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
                  Tarifs : Nuitée &amp; Heures (Passage)
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
                  Acomptes &amp; Arrhes
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
                    <span>CAISSE &amp; DÉPENSES</span>
                    <span className="text-emerald-400">● LIÉE</span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-white">Solde Caisse Réel</p>
                  <p className="text-xs font-semibold text-amber-300 mt-1">Wave, OM &amp; Espèces</p>
                </div>
                <div className="rounded-lg bg-emerald-500/10 p-1.5 text-[9px] text-emerald-300 border border-emerald-500/20">
                  Dépenses déduites d&apos;office
                </div>
              </div>
              <h3 className="mt-3 sm:mt-4 font-bold text-white text-sm">4. Caisse &amp; Dépenses</h3>
              <p className="mt-1 text-xs text-slate-400">Interconnexion automatique et pointage au franc près.</p>
            </div>

            {/* Écran 5 */}
            <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#0b141a]/85 backdrop-blur-xl p-3.5 sm:p-4 text-center transition-all hover:-translate-y-1 hover:border-amber-400/40 shadow-xl sm:col-span-2 md:col-span-1">
              <div className="h-40 sm:h-44 rounded-2xl bg-[#121e26]/90 p-3 text-left border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-[10px] text-amber-300 font-bold">
                    <span>CONTRAT &amp; REÇU</span>
                    <span>1 Clic</span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-white">Bail Court Séjour</p>
                  <p className="text-[10px] text-slate-400 mt-1">Signature &amp; Règles maison</p>
                </div>
                <div className="rounded-lg bg-amber-400/10 p-1.5 text-[9px] text-slate-300 border border-amber-400/20">
                  Partage WhatsApp direct
                </div>
              </div>
              <h3 className="mt-3 sm:mt-4 font-bold text-white text-sm">5. Contrats &amp; Reçus</h3>
              <p className="mt-1 text-xs text-slate-400">Édition instantanée aux couleurs de votre établissement.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Bannière Call To Action Majeure avec Boutons Directs & Contacts */}
      <section className="relative z-10 py-14 sm:py-20 bg-gradient-to-b from-transparent via-[#060f15]/80 to-[#060f15] border-t border-white/10">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-amber-400/30 bg-gradient-to-b from-[#182127]/90 via-[#0b141a]/95 to-[#060f15]/95 p-6 sm:p-10 lg:p-14 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight">
              Prêt à professionnaliser la gestion de votre établissement ?
            </h2>
            <p className="mx-auto mt-4 sm:mt-5 max-w-2xl text-sm sm:text-base md:text-lg text-slate-300/90">
              Rejoignez les gestionnaires d&apos;hébergement au Sénégal qui économisent du temps chaque semaine et sécurisent leur trésorerie avec SAMA HOME.
            </p>

            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto sm:max-w-none">
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-7 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-black text-slate-950 shadow-xl shadow-amber-500/20 hover:from-amber-300 hover:to-orange-400 hover:scale-105 active:scale-95 transition-all text-center"
              >
                <span>Se Connecter à l&apos;Application</span>
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
              <a
                href="https://wa.me/221773386660?text=Bonjour%20M.%20GUEYE%2C%20je%20souhaite%20activer%20mon%20%C3%A9tablissement%20sur%20SAMA%20HOME"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md px-5 sm:px-7 py-3.5 sm:py-4 text-sm sm:text-base font-semibold text-slate-200 hover:bg-white/10 hover:text-white hover:border-amber-400/40 transition-all shadow-sm text-center"
              >
                <svg className="h-4 w-4 text-emerald-400 shrink-0 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.004.573 1.777.877 2.806.877 3.18 0 5.768-2.587 5.768-5.766.001-3.18-2.587-5.76-5.768-5.76zm3.364 8.163c-.141.396-.714.735-1.026.779-.276.038-.636.064-2.029-.513-1.636-.677-2.737-2.348-2.818-2.456-.081-.108-.66-.879-.66-1.673 0-.794.417-1.185.565-1.345.148-.16.324-.2.432-.2.108 0 .216.002.311.007.1.006.234-.038.366.279.135.324.462 1.127.502 1.208.04.081.067.176.013.283-.053.108-.08.175-.16.27-.08.094-.17.21-.243.282-.08.081-.164.17-.07.332.094.162.418.69.898 1.117.618.55 1.14.721 1.302.802.162.081.256.068.35-.041.095-.108.405-.472.513-.634.108-.162.216-.135.365-.081.148.054.945.446 1.107.527.162.081.27.122.31.189.041.068.041.392-.1.788z" />
                </svg>
                <span>Assistance WhatsApp Directe</span>
                <span className="hidden sm:inline">: {COMPANY_LEGAL_INFO.formattedPhone}</span>
              </a>
            </div>

            {/* Deux Lignes Directes d'Assistance Téléphonique */}
            <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm font-semibold text-slate-300">
              <span className="rounded-xl bg-white/5 px-3.5 py-2 border border-white/10 text-center inline-flex items-center justify-center gap-2">
                <svg className="h-3.5 w-3.5 text-amber-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>Ligne 1 : <a href={`tel:${COMPANY_LEGAL_INFO.phone}`} className="text-amber-300 hover:underline">{COMPANY_LEGAL_INFO.formattedPhone}</a></span>
              </span>
              <span className="rounded-xl bg-white/5 px-3.5 py-2 border border-white/10 text-center inline-flex items-center justify-center gap-2">
                <svg className="h-3.5 w-3.5 text-amber-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>Ligne 2 : <a href={`tel:${COMPANY_LEGAL_INFO.phoneSecondary}`} className="text-amber-300 hover:underline">{COMPANY_LEGAL_INFO.formattedPhoneSecondary}</a></span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Pied de Page Institutionnel avec les Deux Contacts */}
      <footer className="relative z-10 border-t border-white/10 bg-[#03080b]/95 backdrop-blur-md py-10 sm:py-12 text-xs text-slate-400" id="contact">
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
                Plateforme logicielle éditée par <strong>{COMPANY_LEGAL_INFO.commercialName}</strong> ({COMPANY_LEGAL_INFO.sigle}). Entreprise immatriculée au Registre du Commerce et du Crédit Mobilier de Dakar (RCCM) et auprès de l&apos;ANSD.
              </p>
              <div className="mt-3 inline-block rounded-lg bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-amber-300 border border-white/10">
                NINEA : {COMPANY_LEGAL_INFO.ninea} • RCCM : {COMPANY_LEGAL_INFO.rccm}
              </div>
            </div>

            <div>
              <p className="font-bold text-white text-sm mb-3">Navigation Directe</p>
              <ul className="space-y-2.5">
                <li><Link href="/login" className="hover:text-amber-300 transition-colors font-bold text-amber-300">→ Se Connecter</Link></li>
                <li><Link href="/register" className="hover:text-amber-300 transition-colors">Créer un Établissement</Link></li>
                <li><Link href="/forgot-password" className="hover:text-amber-300 transition-colors">Mot de passe oublié</Link></li>
                <li><a href="#multi-ecrans" className="hover:text-amber-300 transition-colors">Expérience Multi-Écrans</a></li>
                <li><a href="#fonctionnalites" className="hover:text-amber-300 transition-colors">Fonctionnalités Clés</a></li>
                <li><a href="#residences" className="hover:text-amber-300 transition-colors">Résidences d&apos;Exception</a></li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-white text-sm mb-3">Contacts &amp; Siège</p>
              <ul className="space-y-2.5 text-slate-400">
                <li className="flex items-start gap-2">
                  <svg className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{COMPANY_LEGAL_INFO.address}</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-amber-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{COMPANY_LEGAL_INFO.city}, {COMPANY_LEGAL_INFO.country}</span>
                </li>
                <li className="pt-1 text-slate-200 flex items-center gap-2">
                  <svg className="h-4 w-4 text-amber-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span><strong>Ligne 1 :</strong> <a href={`tel:${COMPANY_LEGAL_INFO.phone}`} className="text-amber-300 hover:underline">{COMPANY_LEGAL_INFO.formattedPhone}</a></span>
                </li>
                <li className="text-slate-200 flex items-center gap-2">
                  <svg className="h-4 w-4 text-amber-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span><strong>Ligne 2 :</strong> <a href={`tel:${COMPANY_LEGAL_INFO.phoneSecondary}`} className="text-amber-300 hover:underline">{COMPANY_LEGAL_INFO.formattedPhoneSecondary}</a></span>
                </li>
                <li className="pt-1 flex items-center gap-2">
                  <svg className="h-4 w-4 text-amber-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span><strong>Support :</strong> <a href={`mailto:${COMPANY_LEGAL_INFO.supportEmail}`} className="text-amber-300 hover:underline break-all">{COMPANY_LEGAL_INFO.supportEmail}</a></span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-[11px]">
            <p>© 2026 {COMPANY_LEGAL_INFO.commercialName}. Tous droits réservés.</p>
            <p className="text-amber-300/80">SAMA HOME — Conçu pour l&apos;excellence de l&apos;hospitalité en Afrique de l&apos;Ouest</p>
          </div>
        </div>
      </footer>

      {/* 10. Bouton Flottant Permanent — Accès Direct à l'Application Visible en Continu */}
      <aside aria-label="Accès rapide à l'application" className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40">
        <Link
          href="/login"
          className="group inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 pl-3.5 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm font-extrabold text-slate-950 shadow-[0_12px_35px_rgba(245,158,11,0.45)] hover:shadow-[0_16px_45px_rgba(245,158,11,0.65)] border border-amber-200/60 hover:scale-105 active:scale-95 transition-all duration-300 backdrop-blur-md"
        >
          <span className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-slate-950/15 group-hover:bg-slate-950/25 transition-colors shrink-0">
            <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </span>
          <span className="tracking-tight whitespace-nowrap">
            <span className="hidden sm:inline">Accéder à l&apos;application</span>
            <span className="sm:hidden">Accéder à l&apos;app</span>
          </span>
          <svg className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </aside>
    </div>
  );
}
