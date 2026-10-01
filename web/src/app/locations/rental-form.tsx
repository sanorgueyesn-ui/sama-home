"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { checkRentalAvailability } from "@/app/actions/rentals";
import { requiresIdentity } from "@/lib/identity";
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

function nowDateIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function nowTimeIso() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
  // Phase 12, Bloc 6/8 — same "+ Nouveau client" round trip as reservation-form.tsx.
  const newClientHref = `/clients/new?returnTo=${encodeURIComponent(`${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`)}`;

  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [propertyId, setPropertyId] = useState(defaultPropertyId ?? "");
  const [tariffId, setTariffId] = useState("");
  const [date, setDate] = useState(nowDateIso());
  const [arrivalTime, setArrivalTime] = useState(nowTimeIso());
  const [deposit, setDeposit] = useState(0);
  const [depositMethod, setDepositMethod] = useState("");
  const [note, setNote] = useState("");
  const [idDocumentType, setIdDocumentType] = useState("");
  const [idDocumentNumber, setIdDocumentNumber] = useState("");

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
    }, 350);
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

  // Audit Client/Réservation, Bloc 3/5 — même règle que reservation-form.tsx :
  // identité obligatoire à partir de la durée RÉELLE (48h), aussi pour une
  // location directe. On réutilise departureTime déjà calculé par
  // checkRentalAvailability plutôt que de recalculer un départ côté client.
  const needsIdentity = useMemo(() => {
    if (!availability.departureTime || !date || !arrivalTime) return false;
    const arrival = new Date(`${date}T${arrivalTime}:00`);
    const departure = new Date(availability.departureTime);
    if (Number.isNaN(arrival.getTime()) || Number.isNaN(departure.getTime())) return false;
    return requiresIdentity(arrival, departure);
  }, [availability.departureTime, date, arrivalTime]);

  // Si le client possède déjà une identité valide en fiche, ne jamais la
  // redemander (règle validée explicitement).
  const clientAlreadyHasIdentity = Boolean(
    selectedClient?.idDocumentType && selectedClient?.idDocumentNumber,
  );
  const showIdentitySection = needsIdentity && !clientAlreadyHasIdentity;

  const canSubmit =
    availability.available === true &&
    !availability.checking &&
    (!showIdentitySection || (idDocumentType.trim() !== "" && idDocumentNumber.trim() !== ""));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="clientId" className="block text-xs font-bold text-navy">
            Client
          </label>
          <Link href={newClientHref} className="text-xs font-bold text-navy underline">
            + Nouveau client
          </Link>
        </div>
        <select
          id="clientId"
          name="clientId"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-3 text-sm text-navy outline-none focus:border-navy"
        >
          <option value="">Sélectionner un client...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {selectedClient ? (
          <p className="mt-1.5 text-xs font-semibold text-navy/60">Téléphone : {selectedClient.phone}</p>
        ) : null}
        {errors?.clientId?.map((error) => (
          <p key={error} className="mt-1 text-xs font-medium text-danger">
            {error}
          </p>
        ))}
      </div>

      <div>
        <label htmlFor="propertyId" className="mb-1.5 block text-xs font-bold text-navy">
          Logement
        </label>
        <select
          id="propertyId"
          name="propertyId"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-3 text-sm text-navy outline-none focus:border-navy"
        >
          <option value="">Sélectionner un logement...</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {errors?.propertyId?.map((error) => (
          <p key={error} className="mt-1 text-xs font-medium text-danger">
            {error}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="date" className="mb-1.5 block text-xs font-bold text-navy">
            Date
          </label>
          <input
            id="date"
            name="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-3 text-sm text-navy outline-none focus:border-navy"
          />
          {errors?.date?.map((error) => (
            <p key={error} className="mt-1 text-xs font-medium text-danger">
              {error}
            </p>
          ))}
        </div>
        <div>
          <label htmlFor="arrivalTime" className="mb-1.5 block text-xs font-bold text-navy">
            Heure d&apos;arrivée
          </label>
          <input
            id="arrivalTime"
            name="arrivalTime"
            type="time"
            value={arrivalTime}
            onChange={(e) => setArrivalTime(e.target.value)}
            className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-3 text-sm text-navy outline-none focus:border-navy"
          />
          {errors?.arrivalTime?.map((error) => (
            <p key={error} className="mt-1 text-xs font-medium text-danger">
              {error}
            </p>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="tariffId" className="mb-1.5 block text-xs font-bold text-navy">
          Tarif
        </label>
        {propertyId && activeTariffs.length === 0 ? (
          <p className="rounded-xl bg-warning-bg px-3 py-2.5 text-sm font-semibold text-warning">
            Aucun tarif actif pour ce logement.
          </p>
        ) : (
          <select
            id="tariffId"
            name="tariffId"
            value={effectiveTariffId}
            onChange={(e) => setTariffId(e.target.value)}
            disabled={!propertyId}
            className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-3 text-sm text-navy outline-none focus:border-navy disabled:opacity-50"
          >
            <option value="">{propertyId ? "Sélectionner un tarif..." : "Choisissez d'abord un logement"}</option>
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

      <div className="rounded-xl bg-paper px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-navy/60">Départ prévu</span>
          <span className="text-sm font-extrabold text-navy">{departurePreview ?? "—"}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs font-bold text-navy/60">Montant</span>
          <span className="text-sm font-extrabold text-navy">
            {selectedTariff ? fmtFcfa(selectedTariff.amount) : "—"}
          </span>
        </div>
      </div>

      {availability.checking ? (
        <p className="text-xs font-semibold text-navy/50">Vérification de la disponibilité...</p>
      ) : availability.available === true ? (
        <div className="flex items-center gap-2.5 rounded-xl bg-success-bg px-4 py-3 text-success">
          <span className="h-2 w-2 rounded-full bg-success" />
          <span className="text-sm font-extrabold">DISPONIBLE</span>
        </div>
      ) : availability.available === false ? (
        <div className="flex flex-col gap-1 rounded-xl bg-danger-bg px-4 py-3 text-danger">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-danger" />
            <span className="text-sm font-extrabold">INDISPONIBLE</span>
          </div>
          {availability.message ? <p className="text-xs font-medium">{availability.message}</p> : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="deposit" className="mb-1.5 block text-xs font-bold text-navy">
            Acompte (FCFA)
          </label>
          <input
            id="deposit"
            name="deposit"
            type="number"
            min={0}
            value={deposit}
            onChange={(e) => setDeposit(Number(e.target.value))}
            className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-3 text-sm text-navy outline-none focus:border-navy"
          />
          {errors?.deposit?.map((error) => (
            <p key={error} className="mt-1 text-xs font-medium text-danger">
              {error}
            </p>
          ))}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-navy">Mode de paiement</label>
          <input type="hidden" name="depositMethod" value={depositMethod} />
          <select
            value={depositMethod}
            onChange={(e) => setDepositMethod(e.target.value)}
            className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-3 text-sm text-navy outline-none focus:border-navy"
          >
            <option value="">—</option>
            {PAYMENT_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="note" className="mb-1.5 block text-xs font-bold text-navy">
          Note <span className="ml-1 font-medium text-navy/40">(optionnel)</span>
        </label>
        <textarea
          id="note"
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Informations complémentaires"
          className="min-h-20 w-full resize-none rounded-xl border border-navy/15 bg-paper px-4 py-3 text-sm text-navy outline-none focus:border-navy"
        />
      </div>

      {showIdentitySection ? (
        <div className="flex flex-col gap-3 rounded-xl bg-warning-bg px-4 py-3">
          <p className="text-sm font-bold text-warning">Pièce d&apos;identité requise pour ce séjour.</p>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-navy">Type de pièce</label>
            <input type="hidden" name="idDocumentType" value={idDocumentType} />
            <div className="flex flex-wrap gap-2">
              {ID_DOCUMENT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setIdDocumentType(suggestion)}
                  className={`h-10 rounded-full border px-3.5 text-xs font-bold transition-colors ${
                    idDocumentType === suggestion
                      ? "border-navy bg-navy text-white"
                      : "border-navy/15 bg-paper text-navy"
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
            {errors?.idDocumentType?.map((error) => (
              <p key={error} className="mt-1 text-xs font-medium text-danger">
                {error}
              </p>
            ))}
          </div>
          <div>
            <label htmlFor="idDocumentNumber" className="mb-1.5 block text-xs font-bold text-navy">
              Numéro de pièce
            </label>
            <input
              id="idDocumentNumber"
              name="idDocumentNumber"
              type="text"
              value={idDocumentNumber}
              onChange={(e) => setIdDocumentNumber(e.target.value)}
              placeholder="Numéro"
              className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-3 text-sm text-navy outline-none focus:border-navy"
            />
            {errors?.idDocumentNumber?.map((error) => (
              <p key={error} className="mt-1 text-xs font-medium text-danger">
                {error}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {state?.message && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !canSubmit}
        className="mt-1 h-14 rounded-2xl bg-navy text-base font-extrabold tracking-wide text-white disabled:opacity-40"
      >
        {pending ? "Enregistrement..." : "CONFIRMER LA LOCATION"}
      </button>
    </form>
  );
}
