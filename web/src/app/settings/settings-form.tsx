"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Field, TextAreaField } from "@/components/ui/field";
import { updateSettings } from "@/app/actions/settings";
import QRCode from "qrcode";
import { buildReservationWhatsAppMessage, buildTestWhatsAppLink } from "@/lib/whatsapp";
import {
  EMPTY_GUEST_INFO,
  GUEST_INFO_LIMITS,
  buildGuestInfoMessage,
  buildWifiQrPayload,
  hasGuestInfo,
  type GuestInfoSettings,
} from "@/lib/guest-info";
import { SettingsSection } from "./settings-ui";
import { SettingsTabPanel, SettingsTabs, type SettingsTab } from "./settings-tabs";

type TabId = "identite" | "contrats" | "messages";

/** Onglet qui contient chaque champ : sert à ouvrir celui où se trouve une erreur. */
const FIELD_TAB: Record<string, TabId> = {
  establishmentName: "identite",
  logoUrl: "identite",
  phone: "identite",
  secondaryPhone: "identite",
  address: "identite",
  email: "identite",
  description: "identite",
  contractThresholdDays: "contrats",
  whatsappTemplate: "messages",
  guestWifiName: "messages",
  guestWifiPassword: "messages",
  guestTvInstructions: "messages",
  guestAcInstructions: "messages",
  guestHouseRules: "messages",
  guestExtraInfo: "messages",
  guestCheckoutTime: "messages",
};

/** Champs rangés dans « Plus d'options » : une erreur sur l'un d'eux ouvre ce bloc. */
const ADVANCED_FIELDS = ["guestTvInstructions", "guestAcInstructions", "guestHouseRules", "guestExtraInfo", "guestCheckoutTime"];

const TAB_LABELS: Record<TabId, string> = {
  identite: "Identité et contact",
  contrats: "Contrats",
  messages: "Message d'accueil",
};

/** Libellés courts, pour qu'aucun onglet ne soit coupé sur un téléphone. */
const TAB_SHORT_LABELS: Record<TabId, string> = {
  identite: "Identité",
  contrats: "Contrats",
  messages: "Message",
};

/** Onglets en erreur, dans l'ordre d'affichage. */
function tabsWithErrors(errors: Record<string, string[] | undefined> | undefined): TabId[] {
  if (!errors) return [];
  const flagged = new Set<TabId>();
  for (const [field, messages] of Object.entries(errors)) {
    const tab = FIELD_TAB[field];
    if (tab && messages && messages.length > 0) flagged.add(tab);
  }
  return (Object.keys(TAB_LABELS) as TabId[]).filter((id) => flagged.has(id));
}

type DraftKey =
  | "establishmentName"
  | "phone"
  | "secondaryPhone"
  | "address"
  | "email"
  | "description"
  | "contractThresholdDays"
  | "whatsappTemplate"
  | "guestWifiName"
  | "guestWifiPassword"
  | "guestTvInstructions"
  | "guestAcInstructions"
  | "guestHouseRules"
  | "guestExtraInfo"
  | "guestCheckoutTime"
  | "guestIncludeEmergency";
type Draft = Record<DraftKey, string>;

const DRAFT_KEYS: DraftKey[] = [
  "establishmentName",
  "phone",
  "secondaryPhone",
  "address",
  "email",
  "description",
  "contractThresholdDays",
  "whatsappTemplate",
  "guestWifiName",
  "guestWifiPassword",
  "guestTvInstructions",
  "guestAcInstructions",
  "guestHouseRules",
  "guestExtraInfo",
  "guestCheckoutTime",
  "guestIncludeEmergency",
];

const DEFAULT_WHATSAPP_TEMPLATE =
  "Nous sommes ravis de vous accueillir. Notre équipe reste à votre disposition pour que votre séjour se déroule dans les meilleures conditions.";

/** Deux modèles prêts à l'emploi : un clic remplit le texte, que l'on peut ensuite retoucher. */
const MESSAGE_MODELS: { id: string; label: string; text: string }[] = [
  { id: "bienvenue", label: "Bienvenue", text: DEFAULT_WHATSAPP_TEMPLATE },
  {
    id: "remerciement",
    label: "Remerciement",
    text: "Nous vous remercions de la confiance que vous nous accordez. Nous vous souhaitons un excellent séjour et restons joignables à tout moment.",
  },
];

/** Variables acceptées par le générateur réel (src/lib/whatsapp.ts) : un clic les insère dans le message. */
const VARIABLES: { token: string; label: string }[] = [
  { token: "{client}", label: "Nom du client" },
  { token: "{logement}", label: "Logement" },
  { token: "{arrivee}", label: "Arrivée" },
  { token: "{depart}", label: "Départ" },
  { token: "{montant}", label: "Montant" },
  { token: "{acompte}", label: "Acompte" },
  { token: "{etablissement}", label: "Établissement" },
  { token: "{wifi}", label: "Nom du Wi-Fi" },
  { token: "{motdepasse}", label: "Mot de passe Wi-Fi" },
];

type DefaultValues = {
  establishmentName: string;
  phone: string;
  secondaryPhone: string | null;
  address: string;
  email: string | null;
  description: string | null;
  /** URL d'affichage déjà résolue par la page (présignée ou héritée) — jamais la clé brute du bucket. */
  logoUrl: string | null;
  contractThresholdDays?: number | null;
  whatsappTemplate?: string | null;
};

function toDraft(values?: DefaultValues, guest?: GuestInfoSettings | null): Draft {
  return {
    establishmentName: values?.establishmentName ?? "",
    phone: values?.phone ?? "",
    secondaryPhone: values?.secondaryPhone ?? "",
    address: values?.address ?? "",
    email: values?.email ?? "",
    description: values?.description ?? "",
    contractThresholdDays: String(values?.contractThresholdDays ?? 2),
    whatsappTemplate: values?.whatsappTemplate ?? DEFAULT_WHATSAPP_TEMPLATE,
    guestWifiName: guest?.wifiName ?? "",
    guestWifiPassword: guest?.wifiPassword ?? "",
    guestTvInstructions: guest?.tvInstructions ?? "",
    guestAcInstructions: guest?.acInstructions ?? "",
    guestHouseRules: guest?.houseRules ?? "",
    guestExtraInfo: guest?.extraInfo ?? "",
    guestCheckoutTime: guest?.checkoutTime ?? "",
    guestIncludeEmergency: guest?.includeEmergency ? "on" : "",
  };
}

/** Tracé du QR code (carrés noirs sur marge blanche) : calculé sans effet, à partir du contenu Wi-Fi. */
function buildQr(payload: string | null) {
  if (!payload) return null;
  const { size, data } = QRCode.create(payload, { errorCorrectionLevel: "M" }).modules;
  const margin = 4;
  let path = "";
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (data[y * size + x]) path += `M${x + margin},${y + margin}h1v1h-1z`;
  const view = size + margin * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${view} ${view}" width="512" height="512"><rect width="${view}" height="${view}" fill="#ffffff"/><path d="${path}" fill="#000000"/></svg>`;
  return { view, path, downloadHref: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` };
}

/**
 * Test d'un message : ouvre WhatsApp avec le message tel qu'affiché (même non enregistré), à destination
 * du numéro choisi (par défaut celui de l'établissement). Rien n'est envoyé tant que vous ne validez pas
 * dans WhatsApp, et le message est précédé de « TEST ».
 */
function TestSend({ message, defaultPhone, idPrefix }: { message: string; defaultPhone: string; idPrefix: string }) {
  const [override, setOverride] = useState<string | null>(null);
  const phone = override ?? defaultPhone;
  const link = buildTestWhatsAppLink(phone, message);
  return (
    <div className="mt-4 rounded-xl border border-border/15 bg-surface p-4">
      <p className="text-sm font-bold text-fg">Tester ce message</p>
      <p className="mt-0.5 text-xs text-fg/55">
        Recevez-le sur votre WhatsApp pour voir exactement ce que verra votre client. Rien n&apos;est envoyé à un client.
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-56">
          <label htmlFor={`${idPrefix}-test-phone`} className="mb-1.5 block text-xs font-bold text-fg">
            Votre numéro WhatsApp
          </label>
          {/* Hors du formulaire enregistré : ce champ n'a pas de `name`, il n'est jamais envoyé au serveur. */}
          <input
            id={`${idPrefix}-test-phone`}
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setOverride(e.target.value)}
            placeholder="+221 77 000 00 00"
            autoComplete="off"
            aria-invalid={!link.ok}
            className="h-11 w-full rounded-xl border border-border/20 bg-surface px-3 text-sm font-semibold text-fg outline-none focus:border-brand-orange"
          />
        </div>
        {link.ok ? (
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 text-sm font-extrabold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
          >
            Envoyer le test sur WhatsApp
          </a>
        ) : (
          <span aria-disabled="true" className="inline-flex h-11 cursor-not-allowed items-center justify-center rounded-xl bg-fg/10 px-5 text-sm font-extrabold text-fg/45">
            Envoyer le test sur WhatsApp
          </span>
        )}
      </div>
      {!link.ok ? <p role="status" className="mt-2 text-xs text-fg/55">{link.reason}</p> : null}
    </div>
  );
}

const BOLD_MARKERS = /(\*[^*\n]+\*)/g;
const BOLD_PART = /^\*[^*\n]+\*$/;

/** WhatsApp affiche *texte* en gras : l'aperçu en fait autant, sans interpréter autre chose. */
function WhatsAppText({ text }: { text: string }) {
  return (
    <>
      {text.split(BOLD_MARKERS).map((part, index) =>
        BOLD_PART.test(part) ? <strong key={index}>{part.slice(1, -1)}</strong> : <span key={index}>{part}</span>,
      )}
    </>
  );
}

/** En-tête de vos contrats tel qu'il sera lu par vos clients : se met à jour à chaque frappe. */
function DocumentPreview({ draft, logo }: { draft: Draft; logo: string | null }) {
  const name = draft.establishmentName.trim();
  const phones = [draft.phone.trim(), draft.secondaryPhone.trim()].filter(Boolean).join(" · ");
  return (
    <section aria-label="Aperçu de l'en-tête de vos documents" className="rounded-2xl border border-border/15 bg-surface-raised p-5 shadow-card">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-fg/45">Aperçu sur vos contrats</p>
      <div className="flex flex-col items-stretch gap-3 rounded-xl border border-border/15 bg-surface p-4 sm:flex-row sm:items-start sm:gap-4 lg:flex-col lg:items-stretch lg:gap-3">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="h-16 w-16 shrink-0 rounded-lg border border-border/15 bg-surface-sunken object-contain p-1.5" />
        ) : (
          <span aria-hidden className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-brand-orange/15 text-2xl font-extrabold text-brand-orange">
            {(name.charAt(0) || "S").toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className={`truncate text-base font-extrabold ${name ? "text-fg" : "text-fg/30"}`}>{name || "Nom de votre établissement"}</p>
          <p className={`mt-0.5 text-sm ${draft.address.trim() ? "text-fg/70" : "text-fg/30"}`}>{draft.address.trim() || "Adresse"}</p>
          <p className={`mt-0.5 text-sm ${phones ? "text-fg/70" : "text-fg/30"}`}>{phones || "Téléphone"}</p>
          {draft.email.trim() ? <p className="mt-0.5 truncate text-sm text-fg/70">{draft.email.trim()}</p> : null}
        </div>
      </div>
    </section>
  );
}

export function SettingsForm({ defaultValues, guestInfo = null }: { defaultValues?: DefaultValues; guestInfo?: GuestInfoSettings | null }) {
  const [state, formAction, pending] = useActionState(updateSettings, undefined);
  // Valeurs de départ figées une fois (le `key` de la page remonte le formulaire après un enregistrement).
  const [initial] = useState<Draft>(() => toDraft(defaultValues, guestInfo));
  const [draft, setDraft] = useState<Draft>(initial);
  const [newLogoPreview, setNewLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const templateRef = useRef<HTMLTextAreaElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const errors = state?.errors;
  const [tab, setTab] = useState<TabId>("identite");
  const errorTabs = tabsWithErrors(errors as Record<string, string[] | undefined> | undefined);

  // Après une réponse du serveur avec des erreurs, on ouvre le premier onglet concerné : l'erreur ne
  // doit jamais rester cachée dans un onglet fermé. (Ajustement d'état pendant le rendu, sans effet.)
  const [moreOpen, setMoreOpen] = useState(false);
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (errorTabs.length > 0) setTab(errorTabs[0]);
    // Une erreur sur un champ rangé dans « Plus d'options » ouvre ce bloc : jamais d'erreur cachée.
    const failed = errors as Record<string, string[] | undefined> | undefined;
    if (failed && ADVANCED_FIELDS.some((field) => (failed[field]?.length ?? 0) > 0)) setMoreOpen(true);
  }

  // Un champ invalide dans un onglet fermé : le navigateur ne peut pas le montrer. On ouvre son onglet,
  // puis on lui rend le focus avec le message de validation.
  function handleInvalid(e: React.FormEvent<HTMLFormElement>) {
    const field = e.target as HTMLElement;
    const owner = field.closest<HTMLElement>("[data-tab-panel]")?.dataset.tabPanel as TabId | undefined;
    if (owner && owner !== tab) {
      setTab(owner);
      requestAnimationFrame(() => {
        field.focus();
        (field as HTMLInputElement).reportValidity?.();
      });
    }
  }

  useEffect(() => {
    // L'URL créée par URL.createObjectURL() n'est révoquée qu'ici (changement de fichier ou
    // démontage), jamais laissée à fuir en mémoire navigateur.
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function releaseObjectUrl() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    releaseObjectUrl();
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setNewLogoPreview(url);
      setRemoveLogo(false);
    } else {
      setNewLogoPreview(null);
    }
  }

  // Un seul écouteur pour tous les champs texte : chaque frappe met à jour l'aperçu et l'état « modifié ».
  function handleInput(e: React.FormEvent<HTMLFormElement>) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    if ((DRAFT_KEYS as string[]).includes(target.name)) {
      const value = target instanceof HTMLInputElement && target.type === "checkbox" ? (target.checked ? "on" : "") : target.value;
      setDraft((prev) => ({ ...prev, [target.name]: value }));
    }
  }

  /** Remplace tout le texte par un modèle ; le même événement `input` que la saisie met l'aperçu à jour. */
  function applyModel(text: string) {
    const el = templateRef.current;
    if (!el) return;
    el.value = text;
    el.focus();
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function insertVariable(token: string) {
    const el = templateRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    el.setRangeText(token, start, end, "end");
    el.focus();
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function handleCancel() {
    formRef.current?.reset();
    releaseObjectUrl();
    setDraft(initial);
    setNewLogoPreview(null);
    setRemoveLogo(false);
  }

  const currentLogo = defaultValues?.logoUrl ?? null;
  const previewToShow = newLogoPreview ?? (removeLogo ? null : currentLogo);
  const dirty = DRAFT_KEYS.some((key) => draft[key] !== initial[key]) || newLogoPreview !== null || removeLogo;

  const whatsappPreview = buildReservationWhatsAppMessage({
    clientName: "Awa Diop",
    clientPhone: "771110001",
    establishmentName: draft.establishmentName.trim() || "Votre établissement",
    propertyName: "Chambre 101",
    arrivalAt: new Date(2026, 9, 29, 14, 0),
    departureAt: new Date(2026, 9, 31, 11, 0),
    durationLabel: "2 nuits",
    amount: 36000,
    deposit: 10000,
    customTemplate: draft.whatsappTemplate,
    // Le Wi-Fi saisi apparaît dans l'aperçu, comme dans le vrai message (Hôtel et Résidence seulement).
    wifiName: guestInfo ? draft.guestWifiName : null,
    wifiPassword: guestInfo ? draft.guestWifiPassword : null,
  });
  const usesVariables = draft.whatsappTemplate.includes("{");

  const guestDraft: GuestInfoSettings = {
    wifiName: draft.guestWifiName,
    wifiPassword: draft.guestWifiPassword,
    tvInstructions: draft.guestTvInstructions,
    acInstructions: draft.guestAcInstructions,
    houseRules: draft.guestHouseRules,
    extraInfo: draft.guestExtraInfo,
    checkoutTime: draft.guestCheckoutTime,
    includeEmergency: draft.guestIncludeEmergency === "on",
  };
  const guestPreview = buildGuestInfoMessage({
    clientName: "Awa Diop",
    establishmentName: draft.establishmentName.trim() || "Votre établissement",
    propertyName: "Chambre 101",
    receptionPhone: draft.phone,
    settings: guestInfo ? guestDraft : EMPTY_GUEST_INFO,
  });
  const wifiQr = guestInfo ? buildQr(buildWifiQrPayload(draft.guestWifiName, draft.guestWifiPassword)) : null;

  const statusText = pending
    ? "Enregistrement en cours..."
    : dirty
      ? "Modifications non enregistrées."
      : defaultValues
        ? "Tout est enregistré."
        : "Renseignez les informations pour commencer.";

  const tabs: SettingsTab[] = (Object.keys(TAB_LABELS) as TabId[])
    .map((id) => ({ id, label: TAB_LABELS[id], shortLabel: TAB_SHORT_LABELS[id], flagged: errorTabs.includes(id) }));

  return (
    <form ref={formRef} action={formAction} onInput={handleInput} onInvalidCapture={handleInvalid} className="flex flex-col gap-5">
      <SettingsTabs label="Sections de l'établissement" tabs={tabs} active={tab} onChange={(id) => setTab(id as TabId)} />

      <SettingsTabPanel id="identite" active={tab}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="flex flex-col gap-5 lg:col-start-1 lg:row-start-1">
      <SettingsSection title="Identité" description="Le nom et le logo apparaissent sur vos contrats et vos documents.">
        <div className="flex flex-col gap-5">
          <Field
            id="establishmentName"
            label="Nom de l'établissement"
            type="text"
            required
            maxLength={120}
            autoComplete="organization"
            defaultValue={defaultValues?.establishmentName}
            errors={errors?.establishmentName}
          />

          <div>
            <label htmlFor="logo" className="mb-2 block text-xs font-bold text-fg">
              Logo de l&apos;établissement<span className="ml-1 font-medium text-fg/40">(optionnel)</span>
            </label>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {previewToShow ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewToShow} alt="Aperçu du logo" className="h-20 w-20 shrink-0 rounded-xl border border-border/15 bg-surface-sunken object-contain p-2" />
              ) : (
                <span aria-hidden className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-border/30 text-xs font-semibold text-fg/40">
                  Aucun logo
                </span>
              )}
              <div className="min-w-0 flex-1">
                <input
                  id="logo"
                  name="logo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-fg file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-surface-sunken file:px-4 file:text-sm file:font-bold file:text-fg"
                />
                <p className="mt-1.5 text-xs text-fg/50">JPEG, PNG ou WebP, 5 Mo maximum. Réutilisé sur le contrat de location PDF.</p>
                {currentLogo && !newLogoPreview ? (
                  <label className="mt-2 flex items-center gap-2 text-sm font-semibold text-fg">
                    <input
                      type="checkbox"
                      name="removeLogo"
                      checked={removeLogo}
                      onChange={(e) => setRemoveLogo(e.target.checked)}
                      className="h-4 w-4 accent-navy"
                    />
                    Retirer le logo actuel
                  </label>
                ) : null}
              </div>
            </div>
            {errors?.logoUrl?.map((error) => (
              <p key={error} className="mt-1 text-xs font-medium text-danger">
                {error}
              </p>
            ))}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Coordonnées" description="Utilisées sur les contrats et pour vous joindre.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            id="phone"
            label="Téléphone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="+221 77 000 00 00"
            hint="8 à 15 chiffres, « + » initial possible."
            defaultValue={defaultValues?.phone}
            errors={errors?.phone}
          />
          <Field
            id="secondaryPhone"
            label="Téléphone secondaire"
            type="tel"
            placeholder="+221 77 000 00 00"
            defaultValue={defaultValues?.secondaryPhone ?? undefined}
            errors={errors?.secondaryPhone}
          />
          <div className="sm:col-span-2">
            <Field id="address" label="Adresse" type="text" required maxLength={240} autoComplete="street-address" defaultValue={defaultValues?.address} errors={errors?.address} />
          </div>
          <div className="sm:col-span-2">
            <Field id="email" label="Email" type="email" maxLength={180} autoComplete="email" defaultValue={defaultValues?.email ?? undefined} errors={errors?.email} />
          </div>
          <div className="sm:col-span-2">
            <TextAreaField
              id="description"
              label="Description"
              maxLength={500}
              hint={`${draft.description.length} / 500 caractères.`}
              defaultValue={defaultValues?.description ?? undefined}
              errors={errors?.description}
            />
          </div>
        </div>
      </SettingsSection>
      </div>
      {/* Après les champs dans le code comme à l'écran sur téléphone ; à droite, fixe, sur ordinateur. */}
      <div className="lg:col-start-2 lg:row-start-1">
        <div className="lg:sticky lg:top-24">
          <DocumentPreview draft={draft} logo={previewToShow} />
        </div>
      </div>
      </div>
      </SettingsTabPanel>

      <SettingsTabPanel id="contrats" active={tab} className="max-w-3xl">
      <SettingsSection title="Contrats" description="Quand le contrat de bail et la pièce d'identité sont demandés.">
        <div>
          <label htmlFor="contractThresholdDays" className="mb-1.5 block text-xs font-bold text-fg">
            À partir de combien de jours ?
          </label>
          <div className="flex items-center gap-3">
            <input
              id="contractThresholdDays"
              name="contractThresholdDays"
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              defaultValue={defaultValues?.contractThresholdDays ?? 2}
              className="h-11 w-28 rounded-xl border border-border/20 bg-surface px-3 text-sm font-semibold text-fg outline-none focus:border-brand-orange"
            />
            <span className="text-sm text-fg/60">jours</span>
          </div>
          <p className="mt-1.5 text-xs text-fg/50">
            Par défaut : 2 jours. Pour une nuit seule ou un passage à l&apos;heure, l&apos;enregistrement se fait directement, sans contrat.
          </p>
          {errors?.contractThresholdDays?.map((error) => (
            <p key={error} className="mt-1 text-xs font-medium text-danger">
              {error}
            </p>
          ))}
        </div>
      </SettingsSection>
      </SettingsTabPanel>

      <SettingsTabPanel id="messages" active={tab} className="max-w-3xl">
      <SettingsSection
        title="Message d'accueil"
        description="Un petit mot pour vos clients. Leur nom et les détails du séjour (logement, arrivée, départ, montant) sont ajoutés automatiquement."
      >
        <div className="flex flex-col gap-6">
          <div>
            <p className="mb-2 text-xs font-bold text-fg">1. Choisissez un modèle</p>
            <ul className="flex flex-wrap gap-2">
              {MESSAGE_MODELS.map((model) => (
                <li key={model.id}>
                  <button
                    type="button"
                    onClick={() => applyModel(model.text)}
                    className="inline-flex h-11 items-center rounded-xl border border-border/20 bg-surface px-5 text-sm font-bold text-fg transition-colors hover:bg-fg/5 focus-visible:outline-2 focus-visible:outline-brand-orange"
                  >
                    {model.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label htmlFor="whatsappTemplate" className="mb-1.5 block text-xs font-bold text-fg">
              2. Modifiez le texte si vous le souhaitez
            </label>
            <textarea
              id="whatsappTemplate"
              name="whatsappTemplate"
              ref={templateRef}
              rows={4}
              maxLength={2000}
              placeholder="Ex : Bienvenue chez nous ! Merci pour votre confiance."
              defaultValue={defaultValues?.whatsappTemplate ?? DEFAULT_WHATSAPP_TEMPLATE}
              className="w-full rounded-xl border border-border/20 bg-surface p-3 text-sm leading-relaxed text-fg outline-none focus:border-brand-orange"
            />
            {errors?.whatsappTemplate?.map((error) => (
              <p key={error} className="mt-1 text-xs font-medium text-danger">
                {error}
              </p>
            ))}
          </div>

          {guestInfo ? (
            <fieldset className="flex flex-col gap-4">
              <legend className="mb-1 text-xs font-bold text-fg">3. Wi-Fi de votre établissement</legend>
              <input type="hidden" name="guestInfoSection" value="1" />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field
                  id="guestWifiName"
                  label="Nom du Wi-Fi"
                  type="text"
                  maxLength={GUEST_INFO_LIMITS.wifiName}
                  autoComplete="off"
                  placeholder="Ex : Teranga-Almadies"
                  defaultValue={guestInfo.wifiName ?? undefined}
                  errors={errors?.guestWifiName}
                />
                <Field
                  id="guestWifiPassword"
                  label="Mot de passe du Wi-Fi"
                  type="text"
                  maxLength={GUEST_INFO_LIMITS.wifiPassword}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Ex : bienvenue2026"
                  hint="Laissez vide si le réseau est ouvert."
                  defaultValue={guestInfo.wifiPassword ?? undefined}
                  errors={errors?.guestWifiPassword}
                />
              </div>
            </fieldset>
          ) : null}

          <div>
            <p className="mb-2 text-xs font-bold text-fg">Aperçu : ce que votre client reçoit</p>
            <div className="max-w-md rounded-2xl rounded-tl-sm border border-success/25 bg-success/10 p-4 text-sm leading-relaxed text-fg">
              <p className="whitespace-pre-line">
                <WhatsAppText text={whatsappPreview} />
              </p>
            </div>
            <p className="mt-1.5 text-xs text-fg/45">Exemple avec un client et un séjour fictifs.</p>
          </div>
        </div>
      </SettingsSection>

      <details
        open={moreOpen}
        onToggle={(e) => setMoreOpen(e.currentTarget.open)}
        className="mt-4 rounded-2xl border border-border/15 bg-surface-raised shadow-card"
      >
        <summary className="flex min-h-12 cursor-pointer flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-3 text-sm font-bold text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-orange">
          <span>Plus d&apos;options</span>
          <span className="text-xs font-medium text-fg/50">Informations à insérer, télévision, climatisation, règles, QR code, test d&apos;envoi</span>
        </summary>
        <div className="flex flex-col gap-6 border-t border-border/10 p-5">
          <div>
            <p className="mb-2 text-xs font-bold text-fg">Insérer une information dans le texte</p>
            <ul className="flex flex-wrap gap-2">
              {VARIABLES.map((variable) => (
                <li key={variable.token}>
                  <button
                    type="button"
                    onClick={() => insertVariable(variable.token)}
                    className="inline-flex h-9 items-center rounded-full border border-border/20 bg-surface px-3 text-xs font-bold text-fg transition-colors hover:bg-fg/5 focus-visible:outline-2 focus-visible:outline-brand-orange"
                  >
                    + {variable.label}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-fg/50">
              {usesVariables
                ? "Vous utilisez des informations insérées : seul votre texte est envoyé, rien n'est ajouté automatiquement."
                : "Sans information insérée, le nom du client est ajouté au début et les détails du séjour (logement, arrivée, départ, montant) à la suite."}
            </p>
            <TestSend message={whatsappPreview} defaultPhone={draft.phone} idPrefix="confirmation" />
          </div>

          {guestInfo ? (
            <>
              <div className="border-t border-border/10 pt-6">
                <p className="text-sm font-bold text-fg">Informations pratiques pour vos clients</p>
                <p className="mt-1 text-xs text-fg/55">
                  Renseignez-les une fois, puis envoyez-les par WhatsApp depuis la fiche d&apos;une location. Seuls les champs remplis sont envoyés.
                </p>
              </div>

              {wifiQr ? (
                <div className="flex flex-col gap-4 rounded-xl border border-border/15 bg-surface p-4 sm:flex-row sm:items-center">
                  <svg
                    viewBox={`0 0 ${wifiQr.view} ${wifiQr.view}`}
                    role="img"
                    aria-label={`QR code de connexion au réseau ${draft.guestWifiName}`}
                    className="h-36 w-36 shrink-0 rounded-lg bg-white"
                  >
                    <path d={wifiQr.path} fill="#000000" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-fg">QR code du Wi-Fi</p>
                    <p className="mt-1 text-xs leading-relaxed text-fg/60">
                      Imprimez-le et affichez-le dans la chambre ou à la réception : le client le scanne et se connecte, sans rien taper. Il se met à jour tout seul
                      quand vous changez le nom ou le mot de passe.
                    </p>
                    <a
                      href={wifiQr.downloadHref}
                      download="wifi-qr-code.svg"
                      className="mt-3 inline-flex h-11 items-center rounded-xl border border-border/20 px-4 text-sm font-bold text-fg transition-colors hover:bg-fg/5 focus-visible:outline-2 focus-visible:outline-brand-orange"
                    >
                      Télécharger le QR code
                    </a>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <TextAreaField
                  id="guestTvInstructions"
                  label="Télévision"
                  maxLength={GUEST_INFO_LIMITS.instructions}
                  placeholder="Ex : Allumez avec le bouton rouge de la télécommande noire, puis changez de chaîne avec ▲ et ▼."
                  hint="Comment l'allumer et changer de chaîne."
                  defaultValue={guestInfo.tvInstructions ?? undefined}
                  errors={errors?.guestTvInstructions}
                />
                <TextAreaField
                  id="guestAcInstructions"
                  label="Climatisation"
                  maxLength={GUEST_INFO_LIMITS.instructions}
                  placeholder="Ex : Appuyez sur ON/OFF, réglez entre 22 et 24 °C avec + et −. Pensez à fermer les fenêtres."
                  hint="Comment l'allumer et régler la température."
                  defaultValue={guestInfo.acInstructions ?? undefined}
                  errors={errors?.guestAcInstructions}
                />
              </div>

              <Field
                id="guestCheckoutTime"
                label="Départ"
                type="text"
                maxLength={GUEST_INFO_LIMITS.checkoutTime}
                placeholder="Ex : Départ avant 11 h, clé à la réception."
                defaultValue={guestInfo.checkoutTime ?? undefined}
                errors={errors?.guestCheckoutTime}
              />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <TextAreaField
                  id="guestHouseRules"
                  label="Règles de la maison"
                  maxLength={GUEST_INFO_LIMITS.houseRules}
                  placeholder="Ex : Pas de fête après 22 h. Non-fumeur à l'intérieur."
                  defaultValue={guestInfo.houseRules ?? undefined}
                  errors={errors?.guestHouseRules}
                />
                <TextAreaField
                  id="guestExtraInfo"
                  label="Autres informations utiles"
                  maxLength={GUEST_INFO_LIMITS.extraInfo}
                  placeholder="Ex : En cas de coupure d'électricité ou d'eau, appelez la réception. Parking devant l'immeuble."
                  hint="Électricité, eau, parking, adresses utiles…"
                  defaultValue={guestInfo.extraInfo ?? undefined}
                  errors={errors?.guestExtraInfo}
                />
              </div>

              <label className="flex items-start gap-3 rounded-xl bg-surface-sunken px-4 py-3 text-sm text-fg">
                <input
                  type="checkbox"
                  name="guestIncludeEmergency"
                  defaultChecked={guestInfo.includeEmergency}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-navy"
                />
                <span>
                  <span className="font-bold">Ajouter les numéros d&apos;urgence du Sénégal</span>
                  <span className="mt-0.5 block text-xs text-fg/60">Police 17 · Pompiers 18 · SAMU 1515.</span>
                </span>
              </label>

              <div>
                <p className="mb-2 text-xs font-bold text-fg">Aperçu du message des informations pratiques</p>
                {hasGuestInfo(guestDraft) ? (
                  <div className="max-w-md rounded-2xl rounded-tl-sm border border-success/25 bg-success/10 p-4 text-sm leading-relaxed text-fg">
                    <p className="whitespace-pre-line">
                      <WhatsAppText text={guestPreview} />
                    </p>
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-border/25 px-4 py-5 text-sm text-fg/55">
                    Renseignez au moins une information ci-dessus (Wi-Fi compris) pour voir le message.
                  </p>
                )}
                <p className="mt-1.5 text-xs text-fg/45">Exemple avec un client fictif.</p>
                {hasGuestInfo(guestDraft) ? <TestSend message={guestPreview} defaultPhone={draft.phone} idPrefix="accueil" /> : null}
              </div>
            </>
          ) : null}

          <p className="rounded-xl bg-surface-sunken px-4 py-3 text-xs text-fg/65">
            Les tarifs par heure ou par jour se règlent dans chaque logement.{" "}
            <Link href="/logements" className="font-bold text-fg underline-offset-2 hover:underline">
              Ouvrir les logements
            </Link>
          </p>
        </div>
      </details>
      </SettingsTabPanel>

      {state?.message && (
        <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger">
          {state.message}
        </p>
      )}

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 flex flex-col gap-3 rounded-2xl border border-border/15 bg-surface-raised/95 p-3 shadow-card backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
        <p role="status" className={`px-1 text-sm font-medium ${dirty ? "text-warning" : "text-fg/60"}`}>
          {statusText}
        </p>
        <div className="flex gap-2">
          {dirty ? (
            <button
              type="button"
              onClick={handleCancel}
              disabled={pending}
              className="h-11 rounded-xl border border-border/20 px-4 text-sm font-bold text-fg transition-colors hover:bg-fg/5 disabled:opacity-40"
            >
              Annuler
            </button>
          ) : null}
          <button
            type="submit"
            disabled={!dirty || pending}
            className="h-11 rounded-xl bg-brand-orange px-5 text-sm font-extrabold text-ink transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {pending ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </div>
      </div>
    </form>
  );
}
