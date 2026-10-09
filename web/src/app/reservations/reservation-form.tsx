"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { checkAvailability } from "@/app/actions/reservations";
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

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// AT-5 — indicateur d'étape (MAQUETTE AT), local à ce fichier : utilisé
// uniquement par le parcours de création, jamais par l'édition. Pas de
// composant partagé créé — pas encore nécessaire ailleurs à ce stade.
function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps: { n: 1 | 2 | 3; label: string }[] = [
    { n: 1, label: "Durée" },
    { n: 2, label: "Client" },
    { n: 3, label: "Confirmation" },
  ];
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.n} className="flex flex-1 items-center gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                step === s.n
                  ? "bg-navy text-white"
                  : step > s.n
                    ? "bg-success text-white"
                    : "bg-surface-sunken text-fg/40"
              }`}
            >
              {s.n}
            </span>
            <span className={`text-xs font-bold ${step === s.n ? "text-fg" : "text-fg/40"}`}>{s.label}</span>
          </div>
          {i < steps.length - 1 ? (
            <div className={`h-px flex-1 ${step > s.n ? "bg-success" : "bg-border/15"}`} />
          ) : null}
        </div>
      ))}
    </div>
  );
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Phase 12, Bloc 6 — carries the current form's URL (so propertyId, if
  // any, survives the round trip) as the safe `returnTo` for "+ Nouveau
  // client". Validated again server-side against an allowlist regardless
  // (actions/clients.ts) — never trusted just because it was built here.
  // AT-5 — also pins step=2 so returning from "+ Nouveau client" resumes
  // the wizard at the Client step instead of restarting at Durée.
  const returnToParams = new URLSearchParams(searchParams.toString());
  returnToParams.set("step", "2");
  const newClientHref = `/clients/new?returnTo=${encodeURIComponent(`${pathname}?${returnToParams.toString()}`)}`;

  const [clientId, setClientId] = useState(defaultValues?.clientId ?? "");
  const [propertyId, setPropertyId] = useState(defaultValues?.propertyId ?? "");
  const [tariffId, setTariffId] = useState(defaultValues?.tariffId ?? "");
  const [date, setDate] = useState(defaultValues?.date ?? todayIso());
  const [arrivalTime, setArrivalTime] = useState(defaultValues?.arrivalTime ?? "15:00");
  const [deposit, setDeposit] = useState(defaultValues?.deposit ?? 0);
  const [depositMethod, setDepositMethod] = useState(defaultValues?.depositMethod ?? "");
  const [note, setNote] = useState(defaultValues?.note ?? "");
  const [idDocumentType, setIdDocumentType] = useState("");
  const [idDocumentNumber, setIdDocumentNumber] = useState("");

  // AT-5 — étape courante de l'assistant (parcours de création uniquement,
  // voir isEdit plus bas). Reprise depuis ?step= pour le retour "+ Nouveau
  // client" ; 1 sinon. Pure UX côté client : aucune validation métier n'en
  // dépend, le serveur (createReservation) revalide tout de toute façon.
  const initialStepParam = Number(searchParams.get("step"));
  const [step, setStep] = useState<1 | 2 | 3>(
    initialStepParam === 2 || initialStepParam === 3 ? (initialStepParam as 2 | 3) : 1,
  );

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
  // Derived at render time rather than reset via an effect: if the property
  // changed and the previously picked tariff no longer belongs to it, treat
  // the selection as empty without a setState-in-effect render cascade.
  const effectiveTariffId = activeTariffs.some((t) => t.id === tariffId) ? tariffId : "";
  const selectedTariff = activeTariffs.find((t) => t.id === effectiveTariffId);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    // Every state update happens inside the timeout callback (deferred to a
    // later tick), never synchronously in the effect body itself.
    debounceRef.current = setTimeout(async () => {
      if (!propertyId || !effectiveTariffId || !date || !arrivalTime) {
        setAvailability({ checking: false, available: null });
        return;
      }
      setAvailability((prev) => ({ ...prev, checking: true }));
      const result = await checkAvailability({
        propertyId,
        tariffId: effectiveTariffId,
        date,
        arrivalTime,
        excludeReservationId,
      });
      setAvailability({
        checking: false,
        available: result.available,
        message: result.message,
        departureTime: result.departureTime,
      });
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [propertyId, effectiveTariffId, date, arrivalTime, excludeReservationId]);

  const departurePreview = useMemo(() => {
    if (!availability.departureTime) return null;
    return new Date(availability.departureTime).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [availability.departureTime]);

  // Phase 8, Bloc 1: once a reservation exists, "combien a été payé" is
  // owned by the Payment ledger (see "Encaisser" on the detail page), not by
  // this form — editing it here would silently desync it from the actual
  // payment history. Signalled by the presence of `excludeReservationId`
  // (only ever passed by the edit page).
  const isEdit = Boolean(excludeReservationId);

  // Audit Client/Réservation, Bloc 3/5 — identité obligatoire seulement à
  // partir de la durée RÉELLE du séjour (jamais depuis le libellé/l'unité du
  // tarif affiché). On réutilise departureTime déjà calculé par
  // checkAvailability plutôt que de recalculer un départ côté client.
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
  const showIdentitySection = !isEdit && needsIdentity && !clientAlreadyHasIdentity;

  // Lot "Reservation — client facultatif" : le client n'est obligatoire que
  // pour un séjour >=48h — exactement le même seuil que needsIdentity
  // ci-dessus (même fonction requiresIdentity, même calcul), jamais une
  // nouvelle constante. Un long séjour nécessitant déjà un client de facto
  // (pas de pièce d'identité sans client), les deux règles partagent
  // intentionnellement la même condition.
  const needsClient = needsIdentity;

  const canSubmit =
    availability.available === true &&
    !availability.checking &&
    (!needsClient || clientId !== "") &&
    (!showIdentitySection || (idDocumentType.trim() !== "" && idDocumentNumber.trim() !== ""));

  // AT-5 — conditions d'avancement de l'assistant. canAdvanceStep1 reprend
  // exactement la condition de disponibilité déjà utilisée par canSubmit.
  // canAdvanceStep2 : le client reste facultatif pour un séjour court,
  // obligatoire à partir de 48h (voir needsClient ci-dessus) — reflet exact
  // de la règle serveur dans createReservation/updateReservation, jamais une
  // validation uniquement côté UI.
  const canAdvanceStep1 = Boolean(
    propertyId && effectiveTariffId && date && arrivalTime && availability.available === true && !availability.checking,
  );
  const canAdvanceStep2 = !needsClient || Boolean(clientId);

  const tariffField = (
    <div>
      <label htmlFor="tariffId" className="mb-1.5 block text-xs font-bold text-fg">
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
          className="h-12 w-full rounded-xl border border-border/15 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange disabled:opacity-50"
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
  );

  const availabilityStatus = (
    <>
      {availability.checking ? (
        <p className="text-xs font-semibold text-fg/50">Vérification de la disponibilité...</p>
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
    </>
  );

  const identitySection = showIdentitySection ? (
    <div className="flex flex-col gap-3 rounded-xl bg-warning-bg px-4 py-3">
      <p className="text-sm font-bold text-warning">Pièce d&apos;identité requise pour ce séjour.</p>
      <div>
        <label className="mb-1.5 block text-xs font-bold text-fg">Type de pièce</label>
        <input type="hidden" name="idDocumentType" value={idDocumentType} />
        <div className="flex flex-wrap gap-2">
          {ID_DOCUMENT_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setIdDocumentType(suggestion)}
              aria-pressed={idDocumentType === suggestion}
              className={`h-10 rounded-full border px-3.5 text-xs font-bold transition-colors ${
                idDocumentType === suggestion
                  ? "border-navy bg-navy text-white"
                  : "border-border/15 bg-surface text-fg"
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
        <label htmlFor="idDocumentNumber" className="mb-1.5 block text-xs font-bold text-fg">
          Numéro de pièce
        </label>
        <input
          id="idDocumentNumber"
          name="idDocumentNumber"
          type="text"
          value={idDocumentNumber}
          onChange={(e) => setIdDocumentNumber(e.target.value)}
          placeholder="Numéro"
          className="h-12 w-full rounded-xl border border-border/15 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
        />
        {errors?.idDocumentNumber?.map((error) => (
          <p key={error} className="mt-1 text-xs font-medium text-danger">
            {error}
          </p>
        ))}
      </div>
    </div>
  ) : null;

  const depositFields = isEdit ? (
    <>
      <input type="hidden" name="deposit" value={deposit} />
      <input type="hidden" name="depositMethod" value={depositMethod} />
      <p className="rounded-xl bg-surface-sunken px-4 py-3 text-xs font-semibold text-fg/60">
        Le suivi des paiements se fait désormais depuis « Encaisser », sur la fiche de la réservation.
      </p>
    </>
  ) : (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label htmlFor="deposit" className="mb-1.5 block text-xs font-bold text-fg">
          Acompte (FCFA)
        </label>
        <input
          id="deposit"
          name="deposit"
          type="number"
          min={0}
          value={deposit}
          onChange={(e) => setDeposit(Number(e.target.value))}
          className="h-12 w-full rounded-xl border border-border/15 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
        />
        {errors?.deposit?.map((error) => (
          <p key={error} className="mt-1 text-xs font-medium text-danger">
            {error}
          </p>
        ))}
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-bold text-fg">Mode de paiement</label>
        <input type="hidden" name="depositMethod" value={depositMethod} />
        <select
          value={depositMethod}
          onChange={(e) => setDepositMethod(e.target.value)}
          className="h-12 w-full rounded-xl border border-border/15 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
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
  );

  const noteField = (
    <div>
      <label htmlFor="note" className="mb-1.5 block text-xs font-bold text-fg">
        Note <span className="ml-1 font-medium text-fg/40">(optionnel)</span>
      </label>
      <textarea
        id="note"
        name="note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Informations complémentaires"
        className="min-h-20 w-full resize-none rounded-xl border border-border/15 bg-surface px-4 py-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
      />
    </div>
  );

  const errorMessage = state?.message && (
    <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
      {state.message}
    </p>
  );

  // ---------------------------------------------------------------------
  // Édition (excludeReservationId défini) : layout d'origine, inchangé à
  // l'identique. AT-5 ne concerne que le parcours de CRÉATION — l'édition
  // n'est pas touchée, aucune maquette ne la vise explicitement.
  // ---------------------------------------------------------------------
  if (isEdit) {
    return (
      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="clientId" className="block text-xs font-bold text-fg">
              Client
            </label>
          </div>
          <select
            id="clientId"
            name="clientId"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="h-12 w-full rounded-xl border border-border/15 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
          >
            <option value="">Sélectionner un client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {selectedClient ? (
            <p className="mt-1.5 text-xs font-semibold text-fg/60">Téléphone : {selectedClient.phone}</p>
          ) : null}
          {errors?.clientId?.map((error) => (
            <p key={error} className="mt-1 text-xs font-medium text-danger">
              {error}
            </p>
          ))}
          {/* Lot "Reservation — client facultatif", section 7 : une réservation
              courte peut perdre/gagner son client en édition ; une réservation
              >=48h ne peut jamais être enregistrée sans client (canSubmit,
              ci-dessous, bloque déjà le bouton — le serveur revalide aussi). */}
          {!needsClient ? (
            <p className="mt-1.5 text-xs font-medium text-fg/50">
              Facultatif pour ce séjour (moins de 48 h).
            </p>
          ) : needsClient && !clientId ? (
            <p className="mt-1.5 text-xs font-medium text-danger">
              Le client est obligatoire pour un séjour de 48 h ou plus.
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="propertyId" className="mb-1.5 block text-xs font-bold text-fg">
            Logement
          </label>
          <select
            id="propertyId"
            name="propertyId"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="h-12 w-full rounded-xl border border-border/15 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
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
            <label htmlFor="date" className="mb-1.5 block text-xs font-bold text-fg">
              Date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 w-full rounded-xl border border-border/15 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
            />
            {errors?.date?.map((error) => (
              <p key={error} className="mt-1 text-xs font-medium text-danger">
                {error}
              </p>
            ))}
          </div>
          <div>
            <label htmlFor="arrivalTime" className="mb-1.5 block text-xs font-bold text-fg">
              Heure d&apos;arrivée
            </label>
            <input
              id="arrivalTime"
              name="arrivalTime"
              type="time"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              className="h-12 w-full rounded-xl border border-border/15 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
            />
            {errors?.arrivalTime?.map((error) => (
              <p key={error} className="mt-1 text-xs font-medium text-danger">
                {error}
              </p>
            ))}
          </div>
        </div>

        {tariffField}

        <div className="rounded-xl bg-surface-sunken px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-fg/60">Départ prévu</span>
            <span className="text-sm font-extrabold text-fg">{departurePreview ?? "—"}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs font-bold text-fg/60">Montant</span>
            <span className="text-sm font-extrabold text-fg">
              {selectedTariff ? fmtFcfa(selectedTariff.amount) : "—"}
            </span>
          </div>
        </div>

        {availabilityStatus}
        {depositFields}
        {noteField}
        {identitySection}
        {errorMessage}

        <button
          type="submit"
          disabled={pending || !canSubmit}
          className="mt-1 h-14 rounded-2xl bg-brand-orange text-base font-extrabold tracking-wide text-ink disabled:opacity-40"
        >
          {pending ? "Enregistrement..." : submitLabel}
        </button>
      </form>
    );
  }

  // ---------------------------------------------------------------------
  // Création : assistant 3 étapes (MAQUETTE AT). Un seul <form>, un seul
  // appel à `action` (createReservation, inchangée) au clic final — les
  // étapes non visibles restent montées (display: none via `hidden`), donc
  // aucune donnée saisie n'est jamais perdue en navigant entre étapes.
  // ---------------------------------------------------------------------
  return (
    <form action={formAction} className="flex flex-col gap-5">
      <StepIndicator step={step} />

      {/* Champs non visuellement présents à l'étape 3 mais dont le serveur a
          besoin dans le FormData final (clientId/propertyId/date/arrivalTime
          restent des <select>/<input> contrôlés, juste masqués via `hidden`
          plutôt que démontés, pour ne jamais perdre la saisie). */}

      <div className={step === 1 ? "flex flex-col gap-4" : "hidden"}>
        <div>
          <label htmlFor="propertyId" className="mb-1.5 block text-xs font-bold text-fg">
            Logement
          </label>
          <select
            id="propertyId"
            name="propertyId"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="h-12 w-full rounded-xl border border-border/15 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
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
            <label htmlFor="date" className="mb-1.5 block text-xs font-bold text-fg">
              Date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 w-full rounded-xl border border-border/15 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
            />
            {errors?.date?.map((error) => (
              <p key={error} className="mt-1 text-xs font-medium text-danger">
                {error}
              </p>
            ))}
          </div>
          <div>
            <label htmlFor="arrivalTime" className="mb-1.5 block text-xs font-bold text-fg">
              Heure d&apos;arrivée
            </label>
            <input
              id="arrivalTime"
              name="arrivalTime"
              type="time"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              className="h-12 w-full rounded-xl border border-border/15 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
            />
            {errors?.arrivalTime?.map((error) => (
              <p key={error} className="mt-1 text-xs font-medium text-danger">
                {error}
              </p>
            ))}
          </div>
        </div>

        {tariffField}

        <div className="rounded-xl bg-surface-sunken px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-fg/60">Départ prévu</span>
            <span className="text-sm font-extrabold text-fg">{departurePreview ?? "—"}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs font-bold text-fg/60">Montant</span>
            <span className="text-sm font-extrabold text-fg">
              {selectedTariff ? fmtFcfa(selectedTariff.amount) : "—"}
            </span>
          </div>
        </div>

        {availabilityStatus}

        <button
          type="button"
          onClick={() => setStep(2)}
          disabled={!canAdvanceStep1}
          className="mt-1 h-14 rounded-2xl bg-brand-orange text-base font-extrabold tracking-wide text-ink disabled:opacity-40"
        >
          Suivant
        </button>
      </div>

      <div className={step === 2 ? "flex flex-col gap-4" : "hidden"}>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="clientId" className="block text-xs font-bold text-fg">
              Client
            </label>
            <Link href={newClientHref} className="text-xs font-bold text-fg underline">
              + Nouveau client
            </Link>
          </div>
          <select
            id="clientId"
            name="clientId"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="h-12 w-full rounded-xl border border-border/15 bg-surface px-3 text-sm text-fg outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange"
          >
            <option value="">Sélectionner un client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {selectedClient ? (
            <p className="mt-1.5 text-xs font-semibold text-fg/60">Téléphone : {selectedClient.phone}</p>
          ) : null}
          {errors?.clientId?.map((error) => (
            <p key={error} className="mt-1 text-xs font-medium text-danger">
              {error}
            </p>
          ))}
          {/* Lot "Reservation — client facultatif" : même seuil de 48h que
              l'identité (needsClient = needsIdentity), jamais une nouvelle
              règle. */}
          {!needsClient ? (
            <p className="mt-1.5 text-xs font-medium text-fg/50">
              Facultatif pour ce séjour (moins de 48 h).
            </p>
          ) : needsClient && !clientId ? (
            <p className="mt-1.5 text-xs font-medium text-danger">
              Le client est obligatoire pour un séjour de 48 h ou plus.
            </p>
          ) : null}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="h-14 flex-1 rounded-2xl border border-border/15 text-sm font-extrabold text-fg"
          >
            Précédent
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            disabled={!canAdvanceStep2}
            className="h-14 flex-1 rounded-2xl bg-brand-orange text-sm font-extrabold text-ink disabled:opacity-40"
          >
            {!needsClient && !clientId ? "Continuer sans client" : "Suivant"}
          </button>
        </div>
      </div>

      <div className={step === 3 ? "flex flex-col gap-4" : "hidden"}>
        {/* Récapitulatif — pure présentation des choix déjà faits, aucune
            nouvelle donnée. Le montant/départ affichés viennent exactement
            des mêmes variables que l'étape 1 (selectedTariff, departurePreview). */}
        <div className="rounded-xl bg-surface-sunken px-4 py-3">
          <div className="flex items-center justify-between border-b border-border/10 py-2 first:pt-0 last:border-0">
            <span className="text-xs font-bold text-fg/60">Logement</span>
            <span className="text-sm font-bold text-fg">{selectedProperty?.name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between border-b border-border/10 py-2 last:border-0">
            <span className="text-xs font-bold text-fg/60">Client</span>
            <span className="text-sm font-bold text-fg">{selectedClient?.name ?? "Sans client"}</span>
          </div>
          <div className="flex items-center justify-between border-b border-border/10 py-2 last:border-0">
            <span className="text-xs font-bold text-fg/60">Arrivée</span>
            <span className="text-sm font-bold text-fg">
              {date} {arrivalTime}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-border/10 py-2 last:border-0">
            <span className="text-xs font-bold text-fg/60">Tarif</span>
            <span className="text-sm font-bold text-fg">{selectedTariff?.label ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between border-b border-border/10 py-2 last:border-0">
            <span className="text-xs font-bold text-fg/60">Départ prévu</span>
            <span className="text-sm font-bold text-fg">{departurePreview ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between py-2 last:border-0">
            <span className="text-xs font-bold text-fg/60">Montant</span>
            <span className="text-sm font-extrabold text-fg">
              {selectedTariff ? fmtFcfa(selectedTariff.amount) : "—"}
            </span>
          </div>
        </div>

        {depositFields}
        {noteField}
        {identitySection}
        {errorMessage}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="h-14 flex-1 rounded-2xl border border-border/15 text-sm font-extrabold text-fg"
          >
            Précédent
          </button>
          <button
            type="submit"
            disabled={pending || !canSubmit}
            className="h-14 flex-[2] rounded-2xl bg-brand-orange text-base font-extrabold tracking-wide text-ink disabled:opacity-40"
          >
            {pending ? "Enregistrement..." : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
