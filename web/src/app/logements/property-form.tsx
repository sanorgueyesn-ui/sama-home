"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Field, TextAreaField } from "@/components/ui/field";
import type { PropertyFormState } from "@/lib/definitions";
import { BedIcon, BuildingIcon, CashIcon, AlertCircleIcon } from "@/components/ui/icons";

type PropertyFormValues = {
  name?: string;
  type?: "ROOM" | "APARTMENT";
  description?: string;
  capacity?: number;
  /** URL d'affichage déjà résolue par la page (présignée ou héritée) — jamais la clé brute du bucket. */
  photo?: string;
  active?: boolean;
};

const SUGGESTED_NAMES = ["Chambre 1", "Chambre 2", "Chambre 3", "Studio A", "Suite VIP", "Appartement T2"];
const SUGGESTED_PRICES = [10000, 15000, 20000, 25000, 30000];

export function PropertyForm({
  action,
  defaultValues,
  submitLabel,
  showActiveToggle,
}: {
  action: (state: PropertyFormState, formData: FormData) => Promise<PropertyFormState>;
  defaultValues?: PropertyFormValues;
  submitLabel: string;
  showActiveToggle?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [type, setType] = useState<"ROOM" | "APARTMENT">(defaultValues?.type ?? "ROOM");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [capacity, setCapacity] = useState(defaultValues?.capacity ?? 2);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const errors = state?.errors;

  // Initial tariff setup for new properties
  const isCreate = !defaultValues?.name;
  const [initialAmount, setInitialAmount] = useState<number>(20000);
  const [initialType, setInitialType] = useState<"JOUR" | "NUIT" | "HEURE">("JOUR");

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setNewPhotoPreview(url);
      setRemovePhoto(false);
    } else {
      setNewPhotoPreview(null);
    }
  }

  const currentPhoto = defaultValues?.photo ?? null;
  const previewToShow = newPhotoPreview ?? (removePhoto ? null : currentPhoto);

  return (
    <form action={formAction} className="flex flex-col gap-5" encType="multipart/form-data">
      {/* 1. Type de Logement */}
      <div className="rounded-2xl border border-white/10 bg-surface-raised p-4 sm:p-5 shadow-sm">
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-fg/70">
          Type d&apos;hébergement
        </label>
        <input type="hidden" name="type" value={type} />
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setType("ROOM")}
            aria-pressed={type === "ROOM"}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3.5 transition-all ${
              type === "ROOM"
                ? "border-brand-orange bg-brand-orange/15 text-brand-orange font-black shadow-md shadow-brand-orange/10"
                : "border-white/10 bg-surface text-fg/80 hover:bg-white/5"
            }`}
          >
            <BedIcon className="h-6 w-6" />
            <span className="text-sm font-extrabold">Chambre</span>
          </button>
          <button
            type="button"
            onClick={() => setType("APARTMENT")}
            aria-pressed={type === "APARTMENT"}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3.5 transition-all ${
              type === "APARTMENT"
                ? "border-brand-orange bg-brand-orange/15 text-brand-orange font-black shadow-md shadow-brand-orange/10"
                : "border-white/10 bg-surface text-fg/80 hover:bg-white/5"
            }`}
          >
            <BuildingIcon className="h-6 w-6" />
            <span className="text-sm font-extrabold">Appartement</span>
          </button>
        </div>
        {errors?.type?.map((error) => (
          <p key={error} className="mt-1 text-xs font-medium text-danger">
            {error}
          </p>
        ))}
      </div>

      {/* 2. Nom & Capacité */}
      <div className="rounded-2xl border border-white/10 bg-surface-raised p-4 sm:p-5 shadow-sm">
        <label htmlFor="name" className="mb-1.5 block text-xs font-bold text-fg">
          Nom ou numéro du logement <span className="text-rose-400">*</span>
        </label>
        <input
          ref={nameInputRef}
          id="name"
          name="name"
          required
          defaultValue={defaultValues?.name}
          placeholder="Ex : Chambre 01, Suite Palmeraie..."
          className="h-12 w-full rounded-xl border border-white/10 bg-surface px-3.5 text-sm font-bold text-white outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
        />
        {errors?.name?.map((error) => (
          <p key={error} className="mt-1 text-xs font-medium text-danger">
            {error}
          </p>
        ))}

        {/* Suggestions rapides de nom */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-fg/50">Suggestions :</span>
          {SUGGESTED_NAMES.map((sug) => (
            <button
              key={sug}
              type="button"
              onClick={() => {
                if (nameInputRef.current) {
                  nameInputRef.current.value = sug;
                  nameInputRef.current.focus();
                }
              }}
              className="rounded-lg bg-surface-sunken px-2.5 py-1 text-xs font-medium text-fg/80 hover:bg-brand-orange/20 hover:text-brand-orange transition-colors"
            >
              {sug}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <label htmlFor="capacity" className="mb-1.5 block text-xs font-bold text-fg">
            Capacité d&apos;accueil (personnes) <span className="text-rose-400">*</span>
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 6].map((cap) => (
              <button
                key={cap}
                type="button"
                onClick={() => setCapacity(cap)}
                className={`flex-1 h-11 rounded-xl text-xs font-bold border transition-all ${
                  capacity === cap
                    ? "border-brand-orange bg-brand-orange text-ink font-black"
                    : "border-white/10 bg-surface text-fg hover:bg-white/5"
                }`}
              >
                {cap} pers.
              </button>
            ))}
          </div>
          <input type="hidden" id="capacity" name="capacity" value={String(capacity)} />
          {errors?.capacity?.map((error) => (
            <p key={error} className="mt-1 text-xs font-medium text-danger">
              {error}
            </p>
          ))}
        </div>
      </div>

      {/* 3. Tarif initial (créé automatiquement pour pouvoir louer dès validation) */}
      {isCreate ? (
        <div className="rounded-2xl border border-white/10 bg-surface-raised p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <CashIcon className="h-4 w-4 text-brand-orange" />
              <h3 className="text-xs font-black uppercase tracking-wider text-fg">Tarif de départ (Prêt à louer)</h3>
            </div>
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              Prêt immédiatement
            </span>
          </div>

          <p className="text-xs text-fg/60 mb-3">
            Ce tarif sera configuré d&apos;office pour que ce logement soit directement disponible à la location ou réservation.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-fg">Prix en FCFA</label>
              <input
                type="number"
                name="initialTariffAmount"
                min={1000}
                step={500}
                value={initialAmount}
                onChange={(e) => setInitialAmount(Number(e.target.value))}
                className="h-12 w-full rounded-xl border border-white/10 bg-surface px-3.5 text-base font-extrabold text-brand-orange font-mono outline-none focus:border-brand-orange"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-fg">Formule</label>
              <input type="hidden" name="initialTariffType" value={initialType} />
              <div className="flex h-12 gap-1.5 rounded-xl border border-white/10 bg-surface p-1">
                {(
                  [
                    { key: "JOUR", label: "24h / Jour" },
                    { key: "NUIT", label: "Nuitée" },
                    { key: "HEURE", label: "2 Heures" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setInitialType(t.key)}
                    className={`flex-1 rounded-lg text-xs font-bold transition-all ${
                      initialType === t.key
                        ? "bg-brand-orange text-ink font-black shadow-sm"
                        : "text-fg/70 hover:text-fg"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Montants rapides */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-fg/50">Prix rapides :</span>
            {SUGGESTED_PRICES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setInitialAmount(p)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  initialAmount === p
                    ? "bg-brand-orange/30 border border-brand-orange text-brand-orange font-black"
                    : "bg-surface-sunken text-fg/70 hover:bg-white/10"
                }`}
              >
                {p.toLocaleString("fr-FR")} F
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* 4. Options complémentaires (Description & Photo) */}
      <div className="rounded-2xl border border-white/10 bg-surface-raised p-4 sm:p-5 shadow-sm">
        <TextAreaField
          id="description"
          label="Description & détails"
          defaultValue={defaultValues?.description}
          errors={errors?.description}
          placeholder="Équipements, climatisation, balcon, étage... (facultatif)"
        />

        <div className="mt-4">
          <label htmlFor="photo" className="mb-1.5 block text-xs font-bold text-fg">
            Photo <span className="font-normal text-fg/40">(optionnel)</span>
          </label>

          {previewToShow ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewToShow}
              alt="Aperçu de la photo"
              className="mb-2 h-36 w-full rounded-xl border border-white/10 object-cover"
            />
          ) : null}

          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="block w-full text-xs text-fg file:mr-3 file:h-10 file:rounded-xl file:border-0 file:bg-surface-sunken file:px-4 file:text-xs file:font-bold file:text-fg hover:file:bg-white/10"
          />
          <p className="mt-1 text-[11px] text-fg/50">JPEG, PNG ou WebP, 5 Mo max.</p>

          {currentPhoto && !newPhotoPreview ? (
            <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-fg">
              <input
                type="checkbox"
                name="removePhoto"
                checked={removePhoto}
                onChange={(e) => setRemovePhoto(e.target.checked)}
                className="h-4 w-4 accent-brand-orange"
              />
              Retirer la photo actuelle
            </label>
          ) : null}

          {errors?.photo?.map((error) => (
            <p key={error} className="mt-1 text-xs font-medium text-danger">
              {error}
            </p>
          ))}
        </div>

        {showActiveToggle ? (
          <label className="mt-4 flex items-center gap-2.5 text-xs font-bold text-fg">
            <input
              type="checkbox"
              name="active"
              defaultChecked={defaultValues?.active ?? true}
              className="h-4 w-4 accent-brand-orange"
            />
            Logement actif (disponible à la réservation)
          </label>
        ) : null}
      </div>

      {state?.message && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/15 p-3 text-xs font-bold text-rose-300 flex items-center gap-2">
          <AlertCircleIcon className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{state.message}</span>
        </div>
      )}

      {/* BOUTONS D'ACTION DIVISÉS ET DISTINCTS */}
      <div className="flex items-center gap-3 pt-2">
        <Link
          href="/logements"
          className="flex h-13 min-w-[120px] items-center justify-center rounded-2xl border border-white/15 bg-surface text-sm font-bold text-fg hover:bg-white/5 active:scale-98 transition-all"
        >
          Annuler
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 h-13 rounded-2xl bg-brand-orange text-sm font-black text-ink shadow-lg shadow-brand-orange/25 hover:brightness-110 active:scale-98 transition-all disabled:opacity-50"
        >
          {pending ? "Enregistrement..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

