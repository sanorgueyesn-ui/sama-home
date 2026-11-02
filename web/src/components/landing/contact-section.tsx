"use client";

import { COMPANY_LEGAL_INFO } from "@/lib/company-info";
import { WhatsAppGlyph } from "@/components/landing/landing-icons";

/* --------------------------------------------------------------------------
 * ICÔNES VECTORIELLES SVG SOBRES & LÉGÈRES
 * -------------------------------------------------------------------------- */
function PhoneIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MailIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function MapPinIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ExternalLinkIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function ContactSection() {
  const phone1Digits = COMPANY_LEGAL_INFO.phone.replace(/\D/g, "");
  const phone2Digits = COMPANY_LEGAL_INFO.phoneSecondary.replace(/\D/g, "");
  const projectEmail = "samahome221@gmail.com";

  return (
    <section id="contact" aria-labelledby="contact-titre" className="scroll-mt-20 border-t border-border/15 py-16 sm:py-20 bg-surface-raised/20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        
        {/* En-tête sobre et naturel */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-(--accent)/30 bg-(--accent)/10 px-3.5 py-1 text-xs font-bold text-(--accent-text)">
            Contact
          </span>
          <h2
            id="contact-titre"
            className="mt-3 text-balance text-2xl font-bold tracking-tight text-fg sm:text-3xl"
          >
            Nous contacter
          </h2>
          <p className="mt-2 text-sm text-fg/60 sm:text-base">
            Notre équipe basée à Dakar est à votre disposition pour toute question ou démonstration.
          </p>
        </div>

        {/* 3 Cartes sobres côte à côte */}
        <div className="mt-12 grid gap-6 md:grid-cols-3 items-stretch">
          
          {/* CARTE 1 : TÉLÉPHONES & WHATSAPP */}
          <div className="flex flex-col justify-between rounded-2xl border border-border/25 bg-surface-raised p-6 shadow-xs hover-card-lift">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-fg">
                  <PhoneIcon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-fg">Téléphone &amp; WhatsApp</h3>
                  <p className="text-xs text-fg/60">Lignes directes</p>
                </div>
              </div>

              {/* Ligne 1 */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-xs text-fg/60">
                  <span>Ligne principale</span>
                  <span>7j/7</span>
                </div>
                <div className="mt-1 text-lg font-bold tracking-tight text-fg">
                  {COMPANY_LEGAL_INFO.formattedPhone}
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <a
                    href={`tel:${COMPANY_LEGAL_INFO.phone}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/30 bg-surface px-3 py-2 text-xs font-semibold text-fg hover:bg-surface-sunken transition-colors"
                  >
                    <PhoneIcon className="h-3.5 w-3.5 text-fg/60" />
                    <span>Appeler</span>
                  </a>
                  <a
                    href={`https://wa.me/${phone1Digits}?text=${encodeURIComponent("Bonjour, je souhaite échanger avec l'équipe SAMA HOME.")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors"
                  >
                    <WhatsAppGlyph className="h-3.5 w-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>

              <div className="my-5 border-t border-border/15" />

              {/* Ligne 2 */}
              <div>
                <div className="flex items-center justify-between text-xs text-fg/60">
                  <span>Service commercial</span>
                  <span>8h – 20h</span>
                </div>
                <div className="mt-1 text-lg font-bold tracking-tight text-fg">
                  {COMPANY_LEGAL_INFO.formattedPhoneSecondary}
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <a
                    href={`tel:${COMPANY_LEGAL_INFO.phoneSecondary}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/30 bg-surface px-3 py-2 text-xs font-semibold text-fg hover:bg-surface-sunken transition-colors"
                  >
                    <PhoneIcon className="h-3.5 w-3.5 text-fg/60" />
                    <span>Appeler</span>
                  </a>
                  <a
                    href={`https://wa.me/${phone2Digits}?text=${encodeURIComponent("Bonjour, je souhaite des renseignements sur SAMA HOME.")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors"
                  >
                    <WhatsAppGlyph className="h-3.5 w-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* CARTE 2 : COURRIER ÉLECTRONIQUE */}
          <div className="flex flex-col justify-between rounded-2xl border border-border/25 bg-surface-raised p-6 shadow-xs hover-card-lift">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-fg">
                  <MailIcon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-fg">Courrier électronique</h3>
                  <p className="text-xs text-fg/60">Échanges écrits et devis</p>
                </div>
              </div>

              {/* Email 1 : Support */}
              <div className="mt-6">
                <div className="text-xs text-fg/60">Support &amp; Plateforme</div>
                <div className="mt-1 text-sm font-bold tracking-tight text-fg break-all">
                  {COMPANY_LEGAL_INFO.supportEmail}
                </div>
                <div className="mt-2.5">
                  <a
                    href={`mailto:${COMPANY_LEGAL_INFO.supportEmail}?subject=${encodeURIComponent("Demande de renseignements — SAMA HOME")}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/30 bg-surface px-3 py-2 text-xs font-semibold text-fg hover:bg-surface-sunken transition-colors"
                  >
                    <MailIcon className="h-3.5 w-3.5 text-fg/60" />
                    <span>Écrire à {COMPANY_LEGAL_INFO.supportEmail}</span>
                  </a>
                </div>
              </div>

              <div className="my-5 border-t border-border/15" />

              {/* Email 2 : Projet direct */}
              <div>
                <div className="text-xs text-fg/60">Courrier direct projet</div>
                <div className="mt-1 text-sm font-bold tracking-tight text-fg break-all">
                  {projectEmail}
                </div>
                <div className="mt-2.5">
                  <a
                    href={`mailto:${projectEmail}?subject=${encodeURIComponent("Contact SAMA HOME")}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/30 bg-surface px-3 py-2 text-xs font-semibold text-fg hover:bg-surface-sunken transition-colors"
                  >
                    <MailIcon className="h-3.5 w-3.5 text-fg/60" />
                    <span>Écrire à {projectEmail}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* CARTE 3 : SIÈGE SOCIAL & MENTIONS LÉGALES */}
          <div className="flex flex-col justify-between rounded-2xl border border-border/25 bg-surface-raised p-6 shadow-xs hover-card-lift">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-fg">
                  <MapPinIcon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-fg">Siège &amp; Immatriculation</h3>
                  <p className="text-xs text-fg/60">Dakar, Sénégal</p>
                </div>
              </div>

              {/* Adresse physique */}
              <div className="mt-6">
                <div className="text-xs text-fg/60">Adresse d&apos;exploitation</div>
                <p className="mt-1 text-sm font-semibold text-fg leading-relaxed">
                  {COMPANY_LEGAL_INFO.address}
                  <br />
                  <span className="text-fg/60 text-xs">{COMPANY_LEGAL_INFO.city}, {COMPANY_LEGAL_INFO.country}</span>
                </p>
                <div className="mt-2.5">
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=CICES+Foire+Dakar+Senegal"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-(--accent-text) hover:underline"
                  >
                    <span>Voir sur Google Maps</span>
                    <ExternalLinkIcon className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <div className="my-5 border-t border-border/15" />

              {/* Mentions légales sobres */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-fg/60">Éditeur :</span>
                  <span className="font-semibold text-fg text-right">{COMPANY_LEGAL_INFO.commercialName}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-fg/60">Gérant :</span>
                  <span className="font-semibold text-fg text-right">{COMPANY_LEGAL_INFO.manager}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-fg/60">NINEA :</span>
                  <span className="font-mono text-fg text-right">{COMPANY_LEGAL_INFO.ninea}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-fg/60">RCCM :</span>
                  <span className="font-mono text-fg text-right">{COMPANY_LEGAL_INFO.rccm}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
