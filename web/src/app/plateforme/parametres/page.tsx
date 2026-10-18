import Link from "next/link";
import Image from "next/image";
import { getPlatformSettings, getPricingSettings } from "@/lib/platform-settings-data";
import { AutoApprovalToggle } from "../auto-approval-toggle";
import { PricingSettingsForm } from "../pricing-settings-form";
import { COMPANY_LEGAL_INFO } from "@/lib/company-info";

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}

export default async function PlatformSettingsPage() {
  let autoApproveEstablishments = false;
  let pricing: { trialDurationMonths: number; periodMonths: number; periodPriceFcfa: number } | null = null;
  let loadError: string | null = null;

  try {
    const [platformSettings, pricingSettings] = await Promise.all([getPlatformSettings(), getPricingSettings()]);
    autoApproveEstablishments = platformSettings.autoApproveEstablishments;
    pricing = pricingSettings;
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("PlatformSettingsPage() — échec du chargement des réglages :", error);
    loadError = "Impossible de charger les réglages pour le moment. Rechargez la page pour réessayer.";
  }

  const monthlyEquivalent = pricing && pricing.periodMonths > 0
    ? Math.round(pricing.periodPriceFcfa / pricing.periodMonths)
    : 0;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 pt-6 pb-16 sm:px-6 md:px-8 lg:px-10">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Paramètres de la plateforme</h1>
          <p className="mt-1 text-xs font-medium text-white/50 sm:text-sm">
            Configuration globale des tarifs, règles d&apos;inscription, coordonnées de paiement et sécurité.
          </p>
        </div>

        {/* Badges d'état système */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            Production Active
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/70">
            Multi-Tenant Isolé
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-brand-orange/30 bg-brand-orange/10 px-3 py-1 text-[11px] font-bold text-brand-orange">
            FCFA (XOF)
          </span>
        </div>
      </div>

      {loadError ? (
        <p className="mt-6 rounded-2xl bg-danger-bg px-4 py-3 text-sm font-bold text-danger">{loadError}</p>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          {/* Section 1 : Tarification des abonnements & Modèle Économique */}
          <div className="rounded-3xl border border-white/10 bg-[#0e1a22] p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-white">1. Tarification globale & Modèle d&apos;abonnement</h2>
                <p className="mt-1 text-xs text-white/50">
                  Définit la durée de l&apos;essai gratuit initial et le montant des renouvellements périodiques pour toutes les résidences.
                </p>
              </div>
              <span className="self-start rounded-full bg-brand-orange/15 px-2.5 py-0.5 text-xs font-bold text-brand-orange whitespace-nowrap sm:self-auto">
                Offre SAMA HOME
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Formulaire à gauche */}
              <div className="lg:col-span-7">
                {pricing ? (
                  <PricingSettingsForm
                    initialTrialDurationMonths={pricing.trialDurationMonths}
                    initialPeriodMonths={pricing.periodMonths}
                    initialPeriodPriceFcfa={pricing.periodPriceFcfa}
                  />
                ) : null}
              </div>

              {/* Aperçu / Fiche de l'offre à droite */}
              <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-5 lg:col-span-5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                    Aperçu de l&apos;offre commerciale
                  </span>
                  <h3 className="mt-1 text-base font-extrabold text-white">Forfait Professionnel SAMA HOME</h3>
                  <p className="mt-1 text-xs text-white/60">
                    Ce que les gérants voient lors de l&apos;inscription et sur leur tableau de bord d&apos;abonnement.
                  </p>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                      <span className="text-xs text-white/70">Période d&apos;essai gratuit</span>
                      <span className="text-xs font-bold text-sky-400">
                        {pricing?.trialDurationMonths ?? 2} mois offerts
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                      <span className="text-xs text-white/70">Tarif du forfait</span>
                      <span className="text-sm font-black text-brand-orange">
                        {pricing ? fmtFcfa(pricing.periodPriceFcfa) : "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                      <span className="text-xs text-white/70">Périodicité</span>
                      <span className="text-xs font-bold text-white">
                        {pricing?.periodMonths ?? 3} mois
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-brand-orange/20 bg-brand-orange/5 p-3">
                      <span className="text-xs font-semibold text-white/90">Coût mensuel équivalent</span>
                      <span className="text-xs font-extrabold text-brand-orange">
                        ~{monthlyEquivalent.toLocaleString("fr-FR")} FCFA / mois
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-white/10 pt-3 text-[11px] text-white/40">
                  💡 Note : Modifier les tarifs met à jour le montant proposé pour les futurs renouvellements. Les abonnements déjà payés conservent leur période acquise.
                </div>
              </div>
            </div>
          </div>

          {/* Section 2 : Flux d'admission des résidences & Inscriptions */}
          <div className="rounded-3xl border border-white/10 bg-[#0e1a22] p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-white">2. Flux d&apos;admission & Modération des inscriptions</h2>
                <p className="mt-1 text-xs text-white/50">
                  Contrôle la façon dont les nouveaux comptes et établissements sont validés après soumission du formulaire ou vérification OTP.
                </p>
              </div>
              <span className={`self-start rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap sm:self-auto ${
                autoApproveEstablishments ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"
              }`}>
                {autoApproveEstablishments ? "Mode Automatique" : "Modération Manuelle (Recommandée)"}
              </span>
            </div>

            <div className="mt-6">
              <AutoApprovalToggle initialEnabled={autoApproveEstablishments} />
            </div>

            {/* Comparatif des modes */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className={`rounded-2xl border p-4 transition-colors ${
                !autoApproveEstablishments
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-white/5 bg-white/5 opacity-60"
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold text-sm">🛡️ Modération Manuelle</span>
                  {!autoApproveEstablishments && (
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.2 text-[9px] font-bold text-emerald-300">
                      Actif
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-white/70">
                  Les nouveaux établissements restent avec le statut <strong>EN ATTENTE</strong>. L&apos;administrateur de plateforme vérifie la légitimité de l&apos;hôtel ou résidence avant de l&apos;activer.
                </p>
                <p className="mt-2 text-[11px] font-semibold text-emerald-400">
                  ✓ Recommandé contre le spam, les usurpations d&apos;identité et les comptes fictifs.
                </p>
              </div>

              <div className={`rounded-2xl border p-4 transition-colors ${
                autoApproveEstablishments
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-white/5 bg-white/5 opacity-60"
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold text-sm">⚡ Approbation Immédiate</span>
                  {autoApproveEstablishments && (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.2 text-[9px] font-bold text-amber-300">
                      Actif
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-white/70">
                  Chaque inscription validée (code e-mail OTP ou Google OAuth) crée et active automatiquement l&apos;établissement avec sa période d&apos;essai sans intervention humaine.
                </p>
                <p className="mt-2 text-[11px] font-semibold text-amber-300">
                  ✓ Recommandé en phase d&apos;acquisition rapide ou de tests automatisés.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3 : Coordonnées Officielles de Réception des Règlements */}
          <div className="rounded-3xl border border-white/10 bg-[#0e1a22] p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-white">3. Coordonnées de Paiement & Contact Support</h2>
                <p className="mt-1 text-xs text-white/50">
                  Instructions et coordonnées officielles communiquées aux établissements pour le règlement de leurs abonnements.
                </p>
              </div>
              <span className="self-start rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-white/70 whitespace-nowrap sm:self-auto">
                Sénégal (Mobile Money)
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Wave */}
              <div className="flex h-full flex-col justify-between rounded-2xl border border-sky-500/30 bg-gradient-to-b from-sky-500/10 to-[#0e1a22] p-4 sm:p-5 shadow-sm transition-all hover:border-sky-400">
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-sky-500/20 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm">
                        <Image
                          src="/images/payments/wave.png"
                          alt="Wave Sénégal"
                          width={40}
                          height={40}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-black uppercase tracking-wider text-sky-400">Wave Sénégal</span>
                        <p className="text-[10px] font-bold text-white/50">Mobile Money</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-sky-500/20 px-2 py-0.5 text-[9px] font-extrabold text-sky-300">
                      Officiel
                    </span>
                  </div>

                  <div className="mt-4">
                    <span className="block font-mono text-base font-black tracking-wide text-white sm:text-lg whitespace-nowrap">
                      +221 77 338 66 60
                    </span>
                    <p className="mt-1 text-[11px] font-bold text-white/70">
                      Compte marchand SAMA HOME
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-sky-500/20 pt-3">
                  <span className="flex h-8 w-full items-center justify-center rounded-xl bg-sky-500/20 text-[11px] font-extrabold text-sky-300">
                    ⚡ Instantané • 0% de frais
                  </span>
                </div>
              </div>

              {/* Orange Money */}
              <div className="flex h-full flex-col justify-between rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-[#0e1a22] p-4 sm:p-5 shadow-sm transition-all hover:border-amber-400">
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black p-1 shadow-sm">
                        <Image
                          src="/images/payments/orange-money.png"
                          alt="Orange Money"
                          width={40}
                          height={40}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-black uppercase tracking-wider text-amber-400">Orange Money</span>
                        <p className="text-[10px] font-bold text-white/50">Mobile Money</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-extrabold text-amber-300">
                      Officiel
                    </span>
                  </div>

                  <div className="mt-4">
                    <span className="block font-mono text-base font-black tracking-wide text-white sm:text-lg whitespace-nowrap">
                      +221 77 338 66 60
                    </span>
                    <p className="mt-1 text-[11px] font-bold text-white/70">
                      Transfert direct & compte marchand
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-amber-500/20 pt-3">
                  <span className="flex h-8 w-full items-center justify-center rounded-xl bg-amber-500/20 text-[11px] font-extrabold text-amber-300">
                    🍊 Transfert direct avec code
                  </span>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="flex h-full flex-col justify-between rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-[#0e1a22] p-4 sm:p-5 shadow-sm transition-all hover:border-emerald-400">
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#25D366]/20 p-1 shadow-sm">
                        <Image
                          src="/images/payments/whatsapp.png"
                          alt="WhatsApp Support"
                          width={40}
                          height={40}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-black uppercase tracking-wider text-emerald-400">WhatsApp</span>
                        <p className="text-[10px] font-bold text-white/50">Support Client</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-extrabold text-emerald-300">
                      Direct
                    </span>
                  </div>

                  <div className="mt-4">
                    <span className="block font-mono text-base font-black tracking-wide text-white sm:text-lg whitespace-nowrap">
                      +221 77 338 66 60
                    </span>
                    <p className="mt-1 text-[11px] font-bold text-white/70">
                      Justificatifs & validation express
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-emerald-500/20 pt-3">
                  <span className="flex h-8 w-full items-center justify-center rounded-xl bg-emerald-500/20 text-[11px] font-extrabold text-emerald-300">
                    💬 Réponse en moins de 2h
                  </span>
                </div>
              </div>

              {/* Email Support */}
              <div className="flex h-full flex-col justify-between rounded-2xl border border-sky-400/30 bg-gradient-to-b from-sky-400/10 to-[#0e1a22] p-4 sm:p-5 shadow-sm transition-all hover:border-sky-300">
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sky-500/20 p-1.5 shadow-sm">
                        <Image
                          src="/images/payments/mail.png"
                          alt="Assistance Email"
                          width={40}
                          height={40}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-black uppercase tracking-wider text-sky-400">Assistance</span>
                        <p className="text-[10px] font-bold text-white/50">Email officiel</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-extrabold text-white/70">
                      24/7
                    </span>
                  </div>

                  <div className="mt-4">
                    <span className="block truncate font-mono text-xs font-black tracking-wide text-white sm:text-sm">
                      support@samahome.sn
                    </span>
                    <p className="mt-1 text-[11px] font-bold text-white/70">
                      Contrats & factures officielles
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-white/10 pt-3">
                  <span className="flex h-8 w-full items-center justify-center rounded-xl bg-white/10 text-[11px] font-extrabold text-white/80">
                    ✉️ Support officiel SAMA HOME
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4 : Sécurité & Traçabilité */}
          <div className="rounded-3xl border border-white/10 bg-[#0e1a22] p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-white">4. Sécurité & Gouvernance Plateforme</h2>
                <p className="mt-1 text-xs text-white/50">
                  Traçabilité des décisions administratives, isolation multi-tenant et intégrité système.
                </p>
              </div>

              <div className="w-full sm:w-auto">
                <Link
                  href="/plateforme/historique"
                  className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-brand-orange hover:bg-white/10 sm:w-auto"
                >
                  📜 Consulter le journal d&apos;audit complet
                </Link>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <h4 className="text-xs font-bold text-white">🔒 Chiffrement des sessions</h4>
                <p className="mt-1 text-[11px] leading-relaxed text-white/60">
                  Les sessions administrateur et client utilisent des jetons chiffrés JWT stockés dans des cookies HTTP-Only protégés contre XSS/CSRF.
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <h4 className="text-xs font-bold text-white">🏢 Cloisonnement des données</h4>
                <p className="mt-1 text-[11px] leading-relaxed text-white/60">
                  Chaque hôtel/résidence dispose d&apos;un identifiant de tenant strict (`establishmentId`). Aucune fuite inter-établissements possible.
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <h4 className="text-xs font-bold text-white">🛡️ Traçabilité Append-Only</h4>
                <p className="mt-1 text-[11px] leading-relaxed text-white/60">
                  Toute modification de tarification, validation de paiement ou changement de statut est enregistrée de manière immuable dans l&apos;AuditLog.
                </p>
              </div>
            </div>
          </div>

          {/* Section 5 : Mentions Légales & Immatriculation Juridique */}
          <div className="rounded-3xl border border-white/10 bg-[#0e1a22] p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-white">5. Mentions Légales & Entité Juridique Sénégalaise</h2>
                <p className="mt-1 text-xs text-white/50">
                  Immatriculation officielle de l&apos;entreprise éditrice et exploitante de la plateforme SAMA HOME.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  Entreprise Enregistrée
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/70">
                  OHADA / République du Sénégal
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Carte 1 : Identité & Gérance */}
              <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-orange">
                    Raison Sociale & Gérance
                  </span>
                  <h3 className="mt-1 text-base font-black text-white">{COMPANY_LEGAL_INFO.commercialName}</h3>
                  <p className="mt-0.5 text-xs text-white/60">Sigle officiel : <strong>{COMPANY_LEGAL_INFO.sigle}</strong></p>

                  <div className="mt-4 space-y-2 border-t border-white/10 pt-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Forme juridique :</span>
                      <span className="font-semibold text-white">{COMPANY_LEGAL_INFO.legalForm}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Gérant statutaire :</span>
                      <span className="font-bold text-white">{COMPANY_LEGAL_INFO.manager}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Dénomination :</span>
                      <span className="font-semibold text-white">{COMPANY_LEGAL_INFO.denomination}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Carte 2 : Registres & Immatriculations */}
              <div className="flex flex-col justify-between rounded-2xl border border-brand-orange/20 bg-brand-orange/5 p-4 sm:p-5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-orange">
                    Immatriculations Officielles
                  </span>
                  <div className="mt-2 space-y-3">
                    <div className="rounded-xl bg-black/30 p-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">N.I.N.E.A</span>
                      <p className="font-mono text-base font-black tracking-wider text-brand-orange">
                        {COMPANY_LEGAL_INFO.ninea}
                      </p>
                      <p className="text-[10px] text-white/50">{COMPANY_LEGAL_INFO.taxAgency}</p>
                    </div>

                    <div className="rounded-xl bg-black/30 p-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">R.C.C.M</span>
                      <p className="font-mono text-sm font-black tracking-wider text-white">
                        {COMPANY_LEGAL_INFO.rccm}
                      </p>
                      <p className="text-[10px] text-white/50">{COMPANY_LEGAL_INFO.court}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Carte 3 : Siège Social & Contact */}
              <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                    Siège Social & Contact
                  </span>
                  <div className="mt-3 space-y-2.5 text-xs">
                    <div>
                      <span className="text-[11px] font-bold text-white/50">Adresse géographique :</span>
                      <p className="mt-0.5 font-semibold text-white">
                        {COMPANY_LEGAL_INFO.address}
                      </p>
                      <p className="text-[11px] text-white/60">{COMPANY_LEGAL_INFO.city}, {COMPANY_LEGAL_INFO.country}</p>
                    </div>

                    <div className="border-t border-white/10 pt-2">
                      <span className="text-[11px] font-bold text-white/50">Téléphone officiel :</span>
                      <p className="font-mono text-sm font-black text-brand-orange">
                        {COMPANY_LEGAL_INFO.formattedPhone}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-white/50">Formalité greffe :</span>
                      <p className="font-mono text-xs text-white/70">
                        {COMPANY_LEGAL_INFO.rccmFormalite}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
