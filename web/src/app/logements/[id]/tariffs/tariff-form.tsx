"use client";

import { useActionState, useState } from "react";
import { Field } from "@/components/ui/field";
import type { TariffFormState } from "@/lib/definitions";

const TYPE_OPTIONS: { value: "HEURE" | "NUIT" | "JOUR" | "SEMAINE" | "MOIS"; label: string }[] = [
  { value: "HEURE", label: "Heure" },
  { value: "NUIT", label: "Nuit" },
  { value: "JOUR", label: "Jour" },
  { value: "SEMAINE", label: "Semaine" },
  { value: "MOIS", label: "Mois" },
];

const UNIT_OPTIONS: {
  value: "HOURS" | "NIGHT" | "DAY" | "WEEK" | "MONTH";
  label: string;
  singular: string;
  plural: string;
}[] = [
  { value: "HOURS", label: "Heures", singular: "heure", plural: "heures" },
  { value: "NIGHT", label: "Nuit(s)", singular: "nuitée", plural: "nuits" },
  { value: "DAY", label: "Jour(s)", singular: "jour", plural: "jours" },
  { value: "WEEK", label: "Semaine(s)", singular: "semaine", plural: "semaines" },
  { value: "MONTH", label: "Mois", singular: "mois", plural: "mois" },
];

function suggestLabel(value: number, unit: (typeof UNIT_OPTIONS)[number]) {
  if (!value || value < 1) return "";
  if (value === 1) return unit.singular.charAt(0).toUpperCase() + unit.singular.slice(1);
  return `${value} ${unit.plural}`;
}

type TariffFormValues = {
  label?: string;
  type?: (typeof TYPE_OPTIONS)[number]["value"];
  durationValue?: number;
  durationUnit?: (typeof UNIT_OPTIONS)[number]["value"];
  amount?: number;
  active?: boolean;
};

export function TariffForm({
  action,
  defaultValues,
  submitLabel,
  showActiveToggle,
}: {
  action: (state: TariffFormState, formData: FormData) => Promise<TariffFormState>;
  defaultValues?: TariffFormValues;
  submitLabel: string;
  showActiveToggle?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [type, setType] = useState(defaultValues?.type ?? "HEURE");
  const [durationValue, setDurationValue] = useState(defaultValues?.durationValue ?? 2);
  const [durationUnit, setDurationUnit] = useState(defaultValues?.durationUnit ?? "HOURS");
  const [label, setLabel] = useState(defaultValues?.label ?? "");
  const errors = state?.errors;

  const currentUnit = UNIT_OPTIONS.find((u) => u.value === durationUnit)!;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-xs font-bold text-navy">Type de tarif</label>
        <input type="hidden" name="type" value={type} />
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={`rounded-full px-3.5 py-2 text-xs font-bold ${
                type === opt.value ? "bg-navy text-white" : "bg-paper text-navy"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {errors?.type?.map((error) => (
          <p key={error} className="mt-1 text-xs font-medium text-danger">
            {error}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="durationValue" className="mb-1.5 block text-xs font-bold text-navy">
            Durée
          </label>
          <input
            id="durationValue"
            name="durationValue"
            type="number"
            min={1}
            max={365}
            value={durationValue}
            onChange={(e) => setDurationValue(Number(e.target.value))}
            className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-4 text-sm text-navy outline-none focus:border-navy"
          />
          {errors?.durationValue?.map((error) => (
            <p key={error} className="mt-1 text-xs font-medium text-danger">
              {error}
            </p>
          ))}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-navy">Unité</label>
          <select
            name="durationUnit"
            value={durationUnit}
            onChange={(e) => setDurationUnit(e.target.value as typeof durationUnit)}
            className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-3 text-sm text-navy outline-none focus:border-navy"
          >
            {UNIT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="label" className="text-xs font-bold text-navy">
            Libellé affiché
          </label>
          <button
            type="button"
            onClick={() => setLabel(suggestLabel(durationValue, currentUnit))}
            className="text-xs font-bold text-coral"
          >
            Suggérer
          </button>
        </div>
        <input
          id="label"
          name="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex. 2 heures, Nuitée, Semaine..."
          className="h-12 w-full rounded-xl border border-navy/15 bg-paper px-4 text-sm text-navy outline-none focus:border-navy"
        />
        {errors?.label?.map((error) => (
          <p key={error} className="mt-1 text-xs font-medium text-danger">
            {error}
          </p>
        ))}
      </div>

      <Field
        id="amount"
        label="Montant (FCFA)"
        required
        type="number"
        min={1}
        defaultValue={defaultValues?.amount}
        errors={errors?.amount}
        placeholder="Ex. 10000"
      />

      {showActiveToggle ? (
        <label className="flex items-center gap-2.5 text-sm font-bold text-navy">
          <input
            type="checkbox"
            name="active"
            defaultChecked={defaultValues?.active ?? true}
            className="h-4 w-4 accent-navy"
          />
          Tarif actif (proposable)
        </label>
      ) : null}

      {state?.message && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 h-14 rounded-2xl bg-navy text-base font-extrabold tracking-wide text-white disabled:opacity-60"
      >
        {pending ? "Enregistrement..." : submitLabel}
      </button>
    </form>
  );
}
