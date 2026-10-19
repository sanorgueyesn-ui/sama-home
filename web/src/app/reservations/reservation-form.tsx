"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { checkAvailability } from "@/app/actions/reservations";
import { requiresIdentity } from "@/lib/identity";
import {
  LuxuryDatePicker,
  LuxuryTimePicker,
  todayIso,
} from "@/components/ui/luxury-datetime-picker";
import type { ReservationFormState } from "@/lib/definitions";

const ID_DOCUMENT_SUGGESTIONS = ["CNI", "Passeport", "Permis de conduire"];

type ClientOption = {
  id: string;
  name: string;
  phone: string;
  idDocumentType?: string | null;
  idDocumentNumber?: string | null;
};
type TariffOption = {
  id: string;
  label: string;
  type: string;
  durationValue: number;
  durationUnit: string;
  amount: number;
};
type PropertyOption = { id: string; name: string; type: string; tariffs: TariffOption[] };

const PAYMENT_MODES: { value: string; label: string }[] = [
  { value: "CASH", label: "Espèces" },
  { value: "WAVE", label: "Wave" },
  { value: "ORANGE_MONEY", label: "Orange Money" },
  { value: "OTHER", label: "Autre" },
];

function fmtFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/\s|,/g, " ")} FCFA`;
}

export function ReservationForm({
  action,
  clients,
  properties,
  submitLabel,
  excludeReservationId,
  defaultValues,
}: {
  action: (state: ReservationFormState, formData: FormData) => Promise<ReservationFormState>;
  clients: ClientOption[];
  properties: PropertyOption[];
  submitLabel: string;
  excludeReservationId?: string;
  defaultValues?: {
    clientId?: string;
    propertyId?: string;
    tariffId?: string;
    date?: string;
    arrivalTime?: string;
    deposit?: number;
    depositMethod?: string;
    note?: string;
  };
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  // Initialisation intelligente : si une chambre est passée par défaut ou unique, auto-sélectionner son 1er tarif
  const initialPropId = defaultValues?.propertyId ?? (properties.length === 1 ? properties[0].id : "");
  const initialProp = properties.find((p) => p.id === initialPropId);
  const initialTariffId = defaultValues?.tariffId ?? (initialProp?.tariffs?.[0]?.id ?? "");

  const [propertyId, setPropertyId] = useState(initialPropId);
  const [tariffId, setTariffId] = useState(initialTariffId);

  // Mode de facturation : Par Jour (avec contrat & CNI) vs Par Heure (passage express)
  const [billingMode, setBillingMode] = useState<"HOUR" | "DAY">("DAY");
  const [numberOfDays, setNumberOfDays] = useState(1);

  // Mode de saisie client : Nouveau client direct OU sélection d'un client existant
  const [clientMode, setClientMode] = useState<"EXISTING" | "NEW">(
    defaultValues?.clientId ? "EXISTING" : clients.length === 0 ? "NEW" : "EXISTING"
  );
  const [clientId, setClientId] = useState(defaultValues?.clientId ?? (clients.length === 1 ? clients[0].id : ""));
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");

  const [date, setDate] = useState(defaultValues?.date ?? todayIso());
  const [arrivalTime, setArrivalTime] = useState(defaultValues?.arrivalTime ?? "15:00");
  const [deposit, setDeposit] = useState(defaultValues?.deposit ?? 0);
  const [depositMethod, setDepositMethod] = useState(defaultValues?.depositMethod ?? "");
  const [note, setNote] = useState(defaultValues?.note ?? "");
  const [idDocumentType, setIdDocumentType] = useState("");
  const [idDocumentNumber, setIdDocumentNumber] = useState("");

  // Suivi des tentatives de soumission pour feedback visuel clair sans vider le formulaire
  const [missingAttempted, setMissingAttempted] = useState(false);

  const [availability, setAvailability] = useState<{
    checking: boolean;
    available: boolean | null;
    message?: string;
    departureTime?: string;
  }>({ checking: false, available: null });

  const errors = state?.errors;

  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedProperty = properties.find((p) => p.id === propertyId);
  const activeTariffs = selectedProperty?.tariffs ?? [];
  const effectiveTariffId = activeTariffs.some((t) => t.id === tariffId) ? tariffId : (activeTariffs[0]?.id ?? "");
  const selectedTariff = activeTariffs.find((t) => t.id === effectiveTariffId);

  // Auto-sélection systématique du premier tarif selon le mode (Jour vs Heure)
  useEffect(() => {
    if (propertyId && (!tariffId || !activeTariffs.some((t) => t.id === tariffId)) && activeTariffs.length > 0) {
      if (billingMode === "DAY") {
        const dayTariff = activeTariffs.find((t) => t.durationUnit === "DAY" || /jour|24h|nuit/i.test(t.label));
        setTariffId(dayTariff ? dayTariff.id : activeTariffs[0].id);
      } else {
        const hourTariff = activeTariffs.find((t) => t.durationUnit === "HOURS" || /heure|passage|sieste/i.test(t.label));
        setTariffId(hourTariff ? hourTariff.id : activeTariffs[0].id);
      }
    }
  }, [propertyId, tariffId, activeTariffs, billingMode]);

  // Client-side past check protection: if date is today and time is in the past, or date < today
  const isPastDateTime = useMemo(() => {
    if (!date || !arrivalTime) return false;
    const arrival = new Date(`${date}T${arrivalTime}:00`);
    if (Number.isNaN(arrival.getTime())) return false;
    const now = new Date();
    return arrival.getTime() < now.getTime() - 2 * 60 * 1000;
  }, [date, arrivalTime]);

  // Live availability check with debounce
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!propertyId || !effectiveTariffId || !date || !arrivalTime) {
        setAvailability({ checking: false, available: null });
        return;
      }
      if (isPastDateTime) {
        setAvailability({
          checking: false,
          available: false,
          message: "Impossible de réserver dans le passé. Veuillez choisir un horaire futur.",
        });
        return;
      }
      setAvailability((prev) => ({ ...prev, checking: true }));
      const result = await checkAvailability({
        propertyId,
        tariffId: effectiveTariffId,
        date,
        arrivalTime,
        excludeReservationId,
        billingMode,
        numberOfDays: billingMode === "DAY" ? numberOfDays : 1,
      });
      setAvailability({
        checking: false,
        available: result.available,
        message: result.message,
        departureTime: result.departureTime,
      });
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [propertyId, effectiveTariffId, date, arrivalTime, excludeReservationId, isPastDateTime, billingMode, numberOfDays]);

  const departurePreview = useMemo(() => {
    if (!availability.departureTime) return null;
    return new Date(availability.departureTime).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [availability.departureTime]);

  const isEdit = Boolean(excludeReservationId);

  // Règle de pièce d'identité : requise uniquement pour les séjours de longue durée (2 jours ou plus)
  const isContractStay = billingMode === "DAY" && numberOfDays >= 2;
  const clientAlreadyHasIdentity = Boolean(
    clientMode === "EXISTING" && selectedClient?.idDocumentType && selectedClient?.idDocumentNumber
  );
  const showIdentitySection = isContractStay && !clientAlreadyHasIdentity;

  const stayAmount = useMemo(() => {
    if (!selectedTariff) return 0;
    if (billingMode === "DAY" && numberOfDays > 1) {
      return selectedTariff.amount * numberOfDays;
    }
    return selectedTariff.amount;
  }, [selectedTariff, billingMode, numberOfDays]);

  const hasValidClient =
    clientMode === "EXISTING"
      ? (clientId !== "" || (!showIdentitySection && !isEdit))
      : newClientName.trim() !== "" && newClientPhone.trim().replace(/[\s.-]/g, "").length >= 8;

  const canSubmit =
    availability.available === true &&
    !availability.checking &&
    !isPastDateTime &&
    propertyId !== "" &&
    effectiveTariffId !== "" &&
    hasValidClient &&
    (!showIdentitySection || (idDocumentType.trim() !== "" && idDocumentNumber.trim() !== ""));

  function getMissingReason(): string | null {
    if (isPastDateTime) return "L'heure d'arrivée est déjà passée. Veuillez choisir un horaire futur.";
    if (!propertyId) return "Veuillez sélectionner une chambre / appartement";
    if (!effectiveTariffId) return "Veuillez choisir une formule / tarif";
    if (clientMode === "EXISTING" && showIdentitySection && !clientId) return "Veuillez sélectionner un client pour ce séjour avec contrat";
    if (clientMode === "NEW" && !newClientName.trim()) return "Veuillez renseigner le nom complet du client";
    if (clientMode === "NEW" && newClientPhone.trim().replace(/[\s.-]/g, "").length < 8) return "Veuillez indiquer un numéro de téléphone valide (8 chiffres min)";
    if (availability.checking) return "Vérification de la disponibilité du créneau...";
    if (availability.available === false) return availability.message ?? "Ce logement n'est pas disponible pour ce créneau";
    if (showIdentitySection && (!idDocumentType.trim() || !idDocumentNumber.trim())) {
      return "Pièce d'identité obligatoire pour ce séjour avec contrat (2 jours ou plus)";
    }
    return null;
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        if (!canSubmit) {
          e.preventDefault();
          setMissingAttempted(true);
        }
      }}
    >
      {/* 0. Choix immédiat : 2 petits boutons bien visibles sans textes encombrants */}
      <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-surface-raised p-2.5 sm:p-3 shadow-sm backdrop-blur-md">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setBillingMode("DAY");
              const dayTariff = activeTariffs.find((t) => t.durationUnit === "DAY" || /jour|24h|nuit/i.test(t.label));
              if (dayTariff) setTariffId(dayTariff.id);
            }}
            className={`flex items-center justify-center gap-2 h-11 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              billingMode === "DAY"
                ? "bg-brand-orange text-ink shadow-md font-black"
                : "bg-surface border border-white/10 text-fg/70 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="text-base">📅</span>
            <span>Par Jour</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBillingMode("HOUR");
              setNumberOfDays(1);
              const hourTariff = activeTariffs.find((t) => t.durationUnit === "HOURS" || /heure|passage|sieste/i.test(t.label));
              if (hourTariff) setTariffId(hourTariff.id);
            }}
            className={`flex items-center justify-center gap-2 h-11 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              billingMode === "HOUR"
                ? "bg-brand-orange text-ink shadow-md font-black"
                : "bg-surface border border-white/10 text-fg/70 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="text-base">⏱️</span>
            <span>Par Heure</span>
          </button>
        </div>

        {/* Sélecteur de nombre de jours (si Par Jour) : compact et ultra-simple */}
        {billingMode === "DAY" ? (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
            <span className="text-xs font-bold text-fg/80">Nombre de jours :</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-white/10 bg-surface overflow-hidden">
                <button
                  type="button"
                  onClick={() => setNumberOfDays((d) => Math.max(1, d - 1))}
                  className="flex h-8 w-8 items-center justify-center text-sm font-bold text-fg hover:bg-white/10 active:scale-95"
                  aria-label="Diminuer"
                >
                  −
                </button>
                <span className="w-10 text-center text-xs font-black text-white">{numberOfDays}j</span>
                <button
                  type="button"
                  onClick={() => setNumberOfDays((d) => d + 1)}
                  className="flex h-8 w-8 items-center justify-center text-sm font-bold text-fg hover:bg-white/10 active:scale-95"
                  aria-label="Augmenter"
                >
                  +
                </button>
              </div>

              <div className="flex flex-wrap gap-1">
                {[1, 2, 3, 5, 7, 10, 15, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setNumberOfDays(d)}
                    className={`rounded-md px-2 py-1 text-[11px] font-bold transition-all ${
                      numberOfDays === d
                        ? "bg-brand-orange text-ink font-black shadow-sm"
                        : "bg-surface/80 border border-white/10 text-fg/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {d}j
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <input type="hidden" name="billingMode" value={billingMode} />
        <input type="hidden" name="numberOfDays" value={billingMode === "DAY" ? numberOfDays : 1} />
      </div>
      {/* 1. Logement & Formule */}
      <div className="relative z-10 rounded-2xl border border-white/10 bg-surface-raised p-4 sm:p-5 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-white/10">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-orange/20 text-xs font-black text-brand-orange">
            1
          </span>
          <h2 className="text-sm font-black uppercase tracking-wider text-fg">Chambre &amp; Formule</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Logement */}
          <div>
            <label htmlFor="propertyId" className="mb-1.5 block text-xs font-bold text-fg">
              Chambre / Appartement <span className="text-rose-400">*</span>
            </label>
            <select
              id="propertyId"
              name="propertyId"
              value={propertyId}
              onChange={(e) => {
                const newPropId = e.target.value;
                setPropertyId(newPropId);
                const newProp = properties.find((p) => p.id === newPropId);
                setTariffId(newProp?.tariffs?.[0]?.id ?? "");
              }}
              className="h-12 w-full rounded-xl border border-white/10 bg-surface px-3 text-sm font-semibold text-fg outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="">Sélectionner une chambre...</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type === "ROOM" ? "Chambre" : "Appartement"})
                </option>
              ))}
            </select>
            {errors?.propertyId?.map((error) => (
              <p key={error} className="mt-1 text-xs font-medium text-danger">
                {error}
              </p>
            ))}
          </div>

          {/* Tarif */}
          <div>
            <label htmlFor="tariffId" className="mb-1.5 block text-xs font-bold text-fg">
              Formule / Tarif <span className="text-rose-400">*</span>
            </label>
            <select
              id="tariffId"
              name="tariffId"
              value={effectiveTariffId}
              onChange={(e) => setTariffId(e.target.value)}
              disabled={!propertyId || activeTariffs.length === 0}
              className="h-12 w-full rounded-xl border border-white/10 bg-surface px-3 text-sm font-semibold text-fg outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 disabled:opacity-40"
            >
              <option value="">
                {!propertyId
                  ? "Choisissez d'abord une chambre"
                  : activeTariffs.length === 0
                    ? "Aucun tarif configuré pour ce logement"
                    : "Sélectionner un tarif..."}
              </option>
              {activeTariffs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} — {fmtFcfa(t.amount)}
                </option>
              ))}
            </select>
            {errors?.tariffId?.map((error) => (
              <p key={error} className="mt-1 text-xs font-medium text-danger">
                {error}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Horaires & Calendrier */}
      <div className="relative z-30 rounded-2xl border border-white/10 bg-surface-raised p-4 sm:p-5 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-white/10">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-orange/20 text-xs font-black text-brand-orange">
            2
          </span>
          <h2 className="text-sm font-black uppercase tracking-wider text-fg">Date &amp; Heure d&apos;arrivée</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Sélecteur de Date de luxe */}
          <LuxuryDatePicker
            name="date"
            value={date}
            onChange={(newDate) => setDate(newDate)}
            minDate={todayIso()}
            label="Date d'arrivée"
            error={errors?.date?.[0]}
          />

          {/* Sélecteur d'Heure de luxe */}
          <LuxuryTimePicker
            name="arrivalTime"
            value={arrivalTime}
            onChange={(newTime) => setArrivalTime(newTime)}
            label="Heure d'arrivée"
            selectedDate={date}
            error={errors?.arrivalTime?.[0]}
          />
        </div>

        {/* Live Stay Calculations & Availability Card */}
        <div className="mt-4 rounded-xl border border-white/5 bg-surface-sunken p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-fg/60">Libération prévue :</span>
            <span className="font-extrabold text-white text-sm">{departurePreview ?? "—"}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2 text-xs">
            <span className="font-bold text-fg/60">
              Montant total du séjour {billingMode === "DAY" && numberOfDays > 1 ? `(${numberOfDays} jours)` : ""} :
            </span>
            <span className="font-black text-brand-orange text-base">
              {selectedTariff ? fmtFcfa(stayAmount) : "—"}
            </span>
          </div>
        </div>

        {/* Availability Badge */}
        <div className="mt-3">
          {availability.checking ? (
            <div className="flex items-center gap-2 rounded-xl bg-surface-sunken px-4 py-2 text-xs font-semibold text-fg/60">
              <span className="h-2 w-2 rounded-full bg-brand-orange animate-ping" />
              Vérification de la disponibilité du créneau...
            </div>
          ) : isPastDateTime ? (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-rose-300">
              <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
              <span className="text-xs font-bold">Impossible de réserver dans le passé.</span>
            </div>
          ) : availability.available === true ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-xs font-extrabold uppercase">Logement disponible pour ces dates</span>
            </div>
          ) : availability.available === false ? (
            <div className="flex flex-col gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-rose-300">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                <span className="text-xs font-extrabold uppercase">Créneau indisponible</span>
              </div>
              {availability.message ? <p className="text-xs font-medium text-rose-300/80">{availability.message}</p> : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* 3. Client */}
      <div className="relative z-10 rounded-2xl border border-white/10 bg-surface-raised p-4 sm:p-5 shadow-sm backdrop-blur-md">
        <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-orange/20 text-xs font-black text-brand-orange">
              3
            </span>
            <h2 className="text-sm font-black uppercase tracking-wider text-fg">Client</h2>
          </div>

          {/* Onglets rapides : Nouveau client direct OU Client existant */}
          <div className="flex rounded-lg bg-surface p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setClientMode("EXISTING")}
              className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                clientMode === "EXISTING"
                  ? "bg-brand-orange text-ink font-black shadow-sm"
                  : "text-fg/70 hover:text-fg"
              }`}
            >
              👥 Existant
            </button>
            <button
              type="button"
              onClick={() => setClientMode("NEW")}
              className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                clientMode === "NEW"
                  ? "bg-brand-orange text-ink font-black shadow-sm"
                  : "text-fg/70 hover:text-fg"
              }`}
            >
              ⚡ Nouveau
            </button>
          </div>
        </div>

        <input type="hidden" name="isNewClient" value={clientMode === "NEW" ? "true" : "false"} />

        {/* Option A : Nouveau Client direct */}
        {clientMode === "NEW" ? (
          <div className="rounded-xl border border-brand-orange/20 bg-brand-orange/5 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-brand-orange uppercase">Enregistrement rapide du client</span>
              <span className="text-[11px] font-medium text-fg/50">Sera enregistré automatiquement</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="newClientName" className="mb-1 block text-xs font-bold text-fg">
                  Nom complet du client <span className="text-rose-400">*</span>
                </label>
                <input
                  id="newClientName"
                  name="newClientName"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ex : Moussa Diop"
                  className="h-11 w-full rounded-xl border border-white/10 bg-surface px-3 text-sm font-bold text-white outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                />
              </div>

              <div>
                <label htmlFor="newClientPhone" className="mb-1 block text-xs font-bold text-fg">
                  Téléphone (WhatsApp) <span className="text-rose-400">*</span>
                </label>
                <input
                  id="newClientPhone"
                  name="newClientPhone"
                  type="tel"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  placeholder="Ex : +221 77 123 45 67"
                  className="h-11 w-full rounded-xl border border-white/10 bg-surface px-3 text-sm font-bold text-white outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 font-mono"
                />
              </div>
            </div>
            {errors?.clientId?.map((error) => (
              <p key={error} className="text-xs font-medium text-danger">
                {error}
              </p>
            ))}
          </div>
        ) : (
          /* Option B : Sélection client existant */
          <div>
            <label htmlFor="clientId" className="mb-1.5 block text-xs font-bold text-fg">
              Sélectionner le client existant {showIdentitySection ? <span className="text-rose-400">*</span> : <span className="font-normal text-fg/40">(facultatif si passage)</span>}
            </label>
            <select
              id="clientId"
              name="clientId"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-surface px-3 text-sm font-semibold text-fg outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="">Sélectionner dans la liste...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""}
                </option>
              ))}
            </select>
            {errors?.clientId?.map((error) => (
              <p key={error} className="mt-1 text-xs font-medium text-danger">
                {error}
              </p>
            ))}
          </div>
        )}

        {/* Paramètres par défaut envoyés en arrière-plan (l'acompte/paiement se gère séparément) */}
        <input type="hidden" name="deposit" value="0" />
        <input type="hidden" name="depositMethod" value="CASH" />
        <input type="hidden" name="note" value="" />

        {/* Section Pièce d'identité : Strictement requise uniquement pour les séjours de 2 jours ou plus */}
        {showIdentitySection ? (
          <div className="mt-4 rounded-xl border border-brand-orange/30 bg-brand-orange/10 p-4">
            <div className="flex items-center gap-2 text-brand-orange">
              <span className="text-base">📋</span>
              <p className="text-xs font-black uppercase tracking-wider">
                Séjour de {numberOfDays} jours — Pièce d&apos;identité obligatoire pour le contrat
              </p>
            </div>
            <p className="mt-1 text-xs text-fg/70">
              Pour des raisons légales et la génération automatique du contrat de bail officiel, veuillez renseigner la pièce d&apos;identité du client.
            </p>
            <div className="mt-3">
              <input type="hidden" name="idDocumentType" value={idDocumentType} />
              <div className="flex flex-wrap gap-1.5 mb-2">
                {ID_DOCUMENT_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setIdDocumentType(sug)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      idDocumentType === sug
                        ? "bg-brand-orange text-ink font-black shadow-sm"
                        : "bg-surface text-fg/80 hover:bg-white/10"
                    }`}
                  >
                    {sug}
                  </button>
                ))}
              </div>
              <input
                name="idDocumentNumber"
                type="text"
                value={idDocumentNumber}
                onChange={(e) => setIdDocumentNumber(e.target.value)}
                placeholder="Numéro de la pièce (CNI, Passeport ou Permis)"
                className="h-11 w-full rounded-xl border border-white/10 bg-surface px-3 text-sm font-bold text-white outline-none focus:border-brand-orange font-mono"
              />
            </div>
          </div>
        ) : clientAlreadyHasIdentity ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            <span>✓</span>
            <span>
              Pièce d&apos;identité enregistrée : <strong>{selectedClient?.idDocumentType} n° {selectedClient?.idDocumentNumber}</strong> (pré-remplie sur le contrat).
            </span>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface-sunken p-2.5 text-xs text-fg/60">
            <span>⏱️</span>
            <span>Réservation courte durée : aucune pièce d&apos;identité ni contrat exigé.</span>
          </div>
        )}
      </div>

      {/* Message d'erreur serveur éventuel */}
      {state?.message && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 text-xs font-bold text-rose-300">
          ⚠️ {state.message}
        </div>
      )}

      {/* Aide visuelle / Alerte si des informations manquent */}
      {(!canSubmit && (missingAttempted || !pending)) && getMissingReason() ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center text-xs font-bold text-amber-300 flex items-center justify-center gap-2">
          <span>👉</span>
          <span>{getMissingReason()}</span>
        </div>
      ) : null}

      {/* BOUTONS D'ACTION DIVISÉS ET DISTINCTS */}
      <div className="flex items-center gap-3 pt-2">
        <Link
          href="/reservations"
          className="flex h-14 min-w-[120px] items-center justify-center rounded-2xl border border-white/15 bg-surface text-sm font-bold text-fg hover:bg-white/5 active:scale-98 transition-all"
        >
          Annuler
        </Link>
        <button
          type={canSubmit ? "submit" : "button"}
          onClick={() => {
            if (!canSubmit) {
              setMissingAttempted(true);
            }
          }}
          disabled={pending}
          className={`flex-1 h-14 rounded-2xl text-base font-black tracking-wide shadow-lg transition-all ${
            canSubmit
              ? "bg-brand-orange text-ink shadow-brand-orange/25 hover:brightness-110 active:scale-98 cursor-pointer"
              : "bg-surface-raised border border-brand-orange/40 text-brand-orange hover:bg-brand-orange/10 cursor-pointer"
          } disabled:opacity-50`}
        >
          {pending
            ? "Enregistrement en cours..."
            : isContractStay
              ? "📄 ENREGISTRER LA RÉSERVATION & CONTRAT"
              : `📅 ${submitLabel}`}
        </button>
      </div>
    </form>
  );
}
