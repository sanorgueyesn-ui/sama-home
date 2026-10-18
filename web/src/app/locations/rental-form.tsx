"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { checkRentalAvailability } from "@/app/actions/rentals";
import { requiresIdentity } from "@/lib/identity";
import { checkRetroactiveArrival, RETROACTIVE_TOLERANCE_MINUTES } from "@/lib/retroactive-checkin";
import {
  LuxuryDatePicker,
  LuxuryTimePicker,
  todayIso,
  nowTimeIso,
} from "@/components/ui/luxury-datetime-picker";
import type { ReservationFormState } from "@/lib/definitions";

const ID_DOCUMENT_SUGGESTIONS = ["CNI", "Passeport", "Permis de conduire", "Carte consulaire"];

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

export function RentalForm({
  action,
  clients,
  properties,
  defaultPropertyId,
  defaultClientId,
}: {
  action: (state: ReservationFormState, formData: FormData) => Promise<ReservationFormState>;
  clients: ClientOption[];
  properties: PropertyOption[];
  defaultPropertyId?: string;
  defaultClientId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const newClientHref = `/clients/new?returnTo=${encodeURIComponent(`${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`)}`;

  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [propertyId, setPropertyId] = useState(defaultPropertyId ?? "");
  const [tariffId, setTariffId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [arrivalTime, setArrivalTime] = useState(nowTimeIso());
  const [deposit, setDeposit] = useState(0);
  const [depositMethod, setDepositMethod] = useState("CASH");
  const [note, setNote] = useState("");
  const [idDocumentType, setIdDocumentType] = useState("");
  const [idDocumentNumber, setIdDocumentNumber] = useState("");
  const [retroactiveReason, setRetroactiveReason] = useState("");

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
  const effectiveTariffId = activeTariffs.some((t) => t.id === tariffId) ? tariffId : "";
  const selectedTariff = activeTariffs.find((t) => t.id === effectiveTariffId);

  // Live availability checking
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!propertyId || !effectiveTariffId || !date || !arrivalTime) {
        setAvailability({ checking: false, available: null });
        return;
      }
      setAvailability((prev) => ({ ...prev, checking: true }));
      const result = await checkRentalAvailability({
        propertyId,
        tariffId: effectiveTariffId,
        date,
        arrivalTime,
      });
      setAvailability({
        checking: false,
        available: result.available,
        message: result.message,
        departureTime: result.departureTime,
      });
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [propertyId, effectiveTariffId, date, arrivalTime]);

  const departurePreview = useMemo(() => {
    if (!availability.departureTime) return null;
    return new Date(availability.departureTime).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [availability.departureTime]);

  const needsIdentity = useMemo(() => {
    if (!availability.departureTime || !date || !arrivalTime) return false;
    const arrival = new Date(`${date}T${arrivalTime}:00`);
    const departure = new Date(availability.departureTime);
    if (Number.isNaN(arrival.getTime()) || Number.isNaN(departure.getTime())) return false;
    return requiresIdentity(arrival, departure);
  }, [availability.departureTime, date, arrivalTime]);

  const clientAlreadyHasIdentity = Boolean(
    selectedClient?.idDocumentType && selectedClient?.idDocumentNumber,
  );
  const showIdentitySection = needsIdentity && !clientAlreadyHasIdentity;

  const isRetroactive = useMemo(() => {
    if (!date || !arrivalTime) return false;
    const arrival = new Date(`${date}T${arrivalTime}:00`);
    if (Number.isNaN(arrival.getTime())) return false;
    return new Date().getTime() - arrival.getTime() > RETROACTIVE_TOLERANCE_MINUTES * 60_000;
  }, [date, arrivalTime]);

  const retroCheck = useMemo(() => {
    if (!date || !arrivalTime) return null;
    const arrival = new Date(`${date}T${arrivalTime}:00`);
    if (Number.isNaN(arrival.getTime())) return null;
    return checkRetroactiveArrival(new Date(), arrival, retroactiveReason);
  }, [date, arrivalTime, retroactiveReason]);
  const retroBlockedMessage = retroCheck?.ok === false ? retroCheck.message : null;

  const canSubmit =
    availability.available === true &&
    !availability.checking &&
    !retroBlockedMessage &&
    clientId !== "" &&
    (!showIdentitySection || (idDocumentType.trim() !== "" && idDocumentNumber.trim() !== ""));

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* 1. Logement & Formule */}
      <div className="rounded-2xl border border-white/10 bg-surface-raised p-4 sm:p-5 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-white/10">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-orange/20 text-xs font-black text-brand-orange">
            1
          </span>
          <h2 className="text-sm font-black uppercase tracking-wider text-fg">Chambre &amp; Formule de séjour</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Logement */}
          <div>
            <label htmlFor="propertyId" className="mb-1.5 block text-xs font-bold text-fg">
              Chambre / Logement
            </label>
            <select
              id="propertyId"
              name="propertyId"
              value={propertyId}
              onChange={(e) => {
                setPropertyId(e.target.value);
                setTariffId("");
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
              Formule / Tarif
            </label>
            {propertyId && activeTariffs.length === 0 ? (
              <div className="flex h-12 items-center rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 text-xs font-semibold text-amber-300">
                Aucun tarif configuré pour ce logement.
              </div>
            ) : (
              <select
                id="tariffId"
                name="tariffId"
                value={effectiveTariffId}
                onChange={(e) => setTariffId(e.target.value)}
                disabled={!propertyId}
                className="h-12 w-full rounded-xl border border-white/10 bg-surface px-3 text-sm font-semibold text-fg outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 disabled:opacity-40"
              >
                <option value="">{propertyId ? "Sélectionner un tarif..." : "Choisissez d'abord une chambre"}</option>
                {activeTariffs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} — {fmtFcfa(t.amount)}
                  </option>
                ))}
              </select>
            )}
            {errors?.tariffId?.map((error) => (
              <p key={error} className="mt-1 text-xs font-medium text-danger">
                {error}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Horaires d'arrivée (Check-in) */}
      <div className="rounded-2xl border border-white/10 bg-surface-raised p-4 sm:p-5 shadow-sm backdrop-blur-md">
        <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-orange/20 text-xs font-black text-brand-orange">
              2
            </span>
            <h2 className="text-sm font-black uppercase tracking-wider text-fg">Horaires de Check-in</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setDate(todayIso());
              setArrivalTime(nowTimeIso());
            }}
            className="rounded-full bg-brand-orange/15 border border-brand-orange/30 px-3 py-1 text-xs font-bold text-brand-orange hover:bg-brand-orange/25"
          >
            ⚡ Arrivée maintenant
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LuxuryDatePicker
            name="date"
            value={date}
            onChange={(newDate) => setDate(newDate)}
            label="Date d'entrée"
            error={errors?.date?.[0]}
          />

          <LuxuryTimePicker
            name="arrivalTime"
            value={arrivalTime}
            onChange={(newTime) => setArrivalTime(newTime)}
            label="Heure d'entrée"
            selectedDate={date}
            error={errors?.arrivalTime?.[0]}
          />
        </div>

        {/* Justification rétroactive si arrivée dans le passé */}
        {isRetroactive ? (
          <div className="mt-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5">
            <p className="text-xs font-bold text-amber-300">
              ⚠️ Arrivée rétroactive constatée (dans le passé).
            </p>
            <p className="mt-0.5 text-[11px] text-amber-300/80">
              Indiquez la raison pour laquelle cette entrée est enregistrée après coup.
            </p>
            <input
              name="retroactiveReason"
              type="text"
              value={retroactiveReason}
              onChange={(e) => setRetroactiveReason(e.target.value)}
              placeholder="Ex : Problème de connexion, saisie différée..."
              className="mt-2 h-11 w-full rounded-xl border border-amber-500/30 bg-surface px-3 text-xs text-fg outline-none focus:border-brand-orange"
            />
            {retroBlockedMessage ? (
              <p className="mt-1 text-xs font-medium text-danger">{retroBlockedMessage}</p>
            ) : null}
          </div>
        ) : null}

        {/* Live Stay Calculations & Availability Card */}
        <div className="mt-4 rounded-xl border border-white/5 bg-surface-sunken p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-fg/60">Sortie prévue :</span>
            <span className="font-extrabold text-white text-sm">{departurePreview ?? "—"}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2 text-xs">
            <span className="font-bold text-fg/60">Montant total :</span>
            <span className="font-black text-brand-orange text-base">
              {selectedTariff ? fmtFcfa(selectedTariff.amount) : "—"}
            </span>
          </div>
        </div>

        {/* Availability Badge */}
        <div className="mt-3">
          {availability.checking ? (
            <div className="flex items-center gap-2 rounded-xl bg-surface-sunken px-4 py-2 text-xs font-semibold text-fg/60">
              <span className="h-2 w-2 rounded-full bg-brand-orange animate-ping" />
              Vérification de la disponibilité...
            </div>
          ) : availability.available === true ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-xs font-extrabold uppercase">Logement disponible pour entrée immédiate</span>
            </div>
          ) : availability.available === false ? (
            <div className="flex flex-col gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-rose-300">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                <span className="text-xs font-extrabold uppercase">Logement non disponible</span>
              </div>
              {availability.message ? <p className="text-xs font-medium text-rose-300/80">{availability.message}</p> : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* 3. Locataire & Règlement */}
      <div className="rounded-2xl border border-white/10 bg-surface-raised p-4 sm:p-5 shadow-sm backdrop-blur-md">
        <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-orange/20 text-xs font-black text-brand-orange">
              3
            </span>
            <h2 className="text-sm font-black uppercase tracking-wider text-fg">Locataire &amp; Paiement</h2>
          </div>
          <Link href={newClientHref} className="text-xs font-bold text-brand-orange hover:underline">
            + Nouveau locataire
          </Link>
        </div>

        {/* Client Selection */}
        <div>
          <label htmlFor="clientId" className="mb-1.5 block text-xs font-bold text-fg">
            Locataire entrant <span className="text-rose-400">*</span>
          </label>
          <select
            id="clientId"
            name="clientId"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="h-12 w-full rounded-xl border border-white/10 bg-surface px-3 text-sm font-semibold text-fg outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
          >
            <option value="">Sélectionner le locataire...</option>
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

        {/* Règlement immédiat / Acompte */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="deposit" className="mb-1.5 block text-xs font-bold text-fg">
              Montant réglé immédiatement (FCFA)
            </label>
            <input
              id="deposit"
              name="deposit"
              type="number"
              min={0}
              value={deposit}
              onChange={(e) => setDeposit(Number(e.target.value))}
              placeholder="0"
              className="h-12 w-full rounded-xl border border-white/10 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange font-mono font-bold"
            />
            {errors?.deposit?.map((error) => (
              <p key={error} className="mt-1 text-xs font-medium text-danger">
                {error}
              </p>
            ))}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-fg">Mode de paiement</label>
            <select
              name="depositMethod"
              value={depositMethod}
              onChange={(e) => setDepositMethod(e.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange"
            >
              {PAYMENT_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Identity Document Section */}
        {showIdentitySection ? (
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5">
            <p className="text-xs font-bold text-amber-300">Pièce d&apos;identité requise pour ce séjour (&gt; 48h).</p>
            <div className="mt-2.5">
              <input type="hidden" name="idDocumentType" value={idDocumentType} />
              <div className="flex flex-wrap gap-1.5 mb-2">
                {ID_DOCUMENT_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setIdDocumentType(sug)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                      idDocumentType === sug
                        ? "bg-brand-orange text-ink font-black"
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
                placeholder="Numéro de pièce d'identité"
                className="h-11 w-full rounded-xl border border-white/10 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange"
              />
            </div>
          </div>
        ) : null}

        {/* Note */}
        <div className="mt-3.5">
          <label htmlFor="note" className="mb-1 block text-xs font-bold text-fg">
            Note <span className="font-normal text-fg/40">(optionnel)</span>
          </label>
          <input
            id="note"
            name="note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Informations utiles sur le séjour..."
            className="h-11 w-full rounded-xl border border-white/10 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange"
          />
        </div>
      </div>

      {/* Message d'erreur serveur éventuel */}
      {state?.message && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 text-xs font-bold text-rose-300">
          ⚠️ {state.message}
        </div>
      )}

      {/* Bouton de confirmation unique */}
      <button
        type="submit"
        disabled={pending || !canSubmit}
        className="h-14 w-full rounded-2xl bg-brand-orange text-base font-black tracking-wide text-ink shadow-lg shadow-brand-orange/20 transition-all hover:brightness-110 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pending ? "Enregistrement en cours..." : "🔑 ENREGISTRER LA LOCATION (CHECK-IN)"}
      </button>
    </form>
  );
}
