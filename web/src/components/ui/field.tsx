import type { ComponentProps } from "react";

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  errors?: string[];
  hint?: string;
};

const inputClass =
  "h-12 w-full rounded-xl border border-navy/15 bg-paper px-4 text-sm text-navy outline-none focus:border-navy";

export function Field({
  id,
  label,
  required,
  errors,
  hint,
  ...props
}: FieldProps & ComponentProps<"input">) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold text-navy">
        {label}
        {required ? null : (
          <span className="ml-1 font-medium text-navy/40">(optionnel)</span>
        )}
      </label>
      <input id={id} name={id} className={inputClass} {...props} />
      {hint && !errors?.length ? (
        <p className="mt-1 text-xs text-navy/50">{hint}</p>
      ) : null}
      {errors?.map((error) => (
        <p key={error} className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      ))}
    </div>
  );
}

export function TextAreaField({
  id,
  label,
  required,
  errors,
  hint,
  ...props
}: FieldProps & ComponentProps<"textarea">) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold text-navy">
        {label}
        {required ? null : (
          <span className="ml-1 font-medium text-navy/40">(optionnel)</span>
        )}
      </label>
      <textarea
        id={id}
        name={id}
        className="min-h-24 w-full resize-none rounded-xl border border-navy/15 bg-paper px-4 py-3 text-sm text-navy outline-none focus:border-navy"
        {...props}
      />
      {hint && !errors?.length ? (
        <p className="mt-1 text-xs text-navy/50">{hint}</p>
      ) : null}
      {errors?.map((error) => (
        <p key={error} className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      ))}
    </div>
  );
}
