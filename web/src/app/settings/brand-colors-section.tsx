"use client";

import { useState, useTransition } from "react";
import { saveBrandColors } from "@/app/actions/brand-colors";
import {
  BRAND_PALETTES,
  DEFAULT_BRAND_COLORS,
  normalizeHexColor,
  type BrandColors,
  type BrandPaletteId,
} from "@/lib/brand-colors";

/** Les 3 variables CSS déjà injectées par src/app/layout.tsx — jamais une nouvelle variable inventée ici. */
function applyPreview(colors: BrandColors) {
  const root = document.documentElement.style;
  root.setProperty("--color-navy", colors.primary);
  root.setProperty("--color-coral", colors.secondary);
  root.setProperty("--color-brand-orange", colors.accent);
}

type FieldKey = "primary" | "secondary" | "accent";
const FIELD_LABELS: Record<FieldKey, string> = {
  primary: "Couleur principale",
  secondary: "Couleur secondaire",
  accent: "Couleur d'accent",
};

/**
 * Lot "Personnalisation libre" — remplace la sauvegarde immédiate au clic
 * (ancien comportement) : choisir une des 5 palettes ne fait plus que
 * REMPLIR l'éditeur localement (aperçu immédiat, cf. applyPreview), la
 * persistance passe désormais TOUJOURS par le bouton "Enregistrer les
 * couleurs" — mécanisme explicite unique, qu'il s'agisse d'une palette
 * nommée ou d'une saisie libre. "Restaurer SAMA HOME classique" reste une
 * action séparée et IMMÉDIATE (sauvegarde directe de NULL×3), distincte du
 * choix d'une palette dans la liste.
 *
 * Même mécanisme pending/erreur que cancel-button.tsx (useTransition +
 * useState, appel direct de la Server Action).
 */
export function BrandColorsSection({
  currentPaletteId,
  currentColors,
}: {
  currentPaletteId: BrandPaletteId | null;
  currentColors: BrandColors;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedColors, setSavedColors] = useState<BrandColors>(currentColors);
  const [editor, setEditor] = useState<BrandColors>(currentColors);
  const [fieldErrors, setFieldErrors] = useState<Record<FieldKey, string | null>>({
    primary: null,
    secondary: null,
    accent: null,
  });

  const selectedPaletteId =
    BRAND_PALETTES.find(
      (p) =>
        p.colors.primary.toUpperCase() === editor.primary.toUpperCase() &&
        p.colors.secondary.toUpperCase() === editor.secondary.toUpperCase() &&
        p.colors.accent.toUpperCase() === editor.accent.toUpperCase(),
    )?.id ?? null;

  function updateField(key: FieldKey, value: string) {
    const next = { ...editor, [key]: value };
    setEditor(next);
    setSaved(false);
    const normalized = normalizeHexColor(value);
    setFieldErrors((prev) => ({ ...prev, [key]: normalized ? null : "Format invalide (#RRGGBB attendu)." }));
    if (normalized) applyPreview({ ...next, [key]: normalized });
  }

  function applyPaletteToEditor(colors: BrandColors) {
    setEditor(colors);
    setSaved(false);
    setFieldErrors({ primary: null, secondary: null, accent: null });
    applyPreview(colors);
  }

  function handlePreviewEnd() {
    if (pending) return;
    applyPreview(editor);
  }

  const hasInvalidField = Object.values(fieldErrors).some(Boolean);

  function handleSave() {
    const primary = normalizeHexColor(editor.primary);
    const secondary = normalizeHexColor(editor.secondary);
    const accent = normalizeHexColor(editor.accent);
    if (!primary || !secondary || !accent) {
      setError("Corrigez les couleurs invalides avant d'enregistrer.");
      return;
    }
    if (pending) return;
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveBrandColors({ primary, secondary, accent });
      if (result.error) {
        setError(result.error);
        applyPreview(savedColors);
        return;
      }
      const next = { primary, secondary, accent };
      setEditor(next);
      setSavedColors(next);
      setSaved(true);
      applyPreview(next);
    });
  }

  function handleRestoreDefault() {
    if (pending) return;
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveBrandColors(null);
      if (result.error) {
        setError(result.error);
        applyPreview(savedColors);
        return;
      }
      setEditor(DEFAULT_BRAND_COLORS);
      setSavedColors(DEFAULT_BRAND_COLORS);
      setFieldErrors({ primary: null, secondary: null, accent: null });
      setSaved(true);
      applyPreview(DEFAULT_BRAND_COLORS);
    });
  }

  return (
    <section className="mt-6">
      <h2 className="mb-2.5 text-sm font-extrabold text-fg">Couleurs de l&apos;établissement</h2>
      <p className="mb-2 text-xs font-medium text-fg/50">
        Choisissez une palette prédéfinie ou personnalisez librement les 3 couleurs. Survolez une
        palette pour un aperçu temporaire ; les modifications ne sont enregistrées qu&apos;au clic sur
        « Enregistrer les couleurs ».
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {BRAND_PALETTES.map((palette) => (
          <button
            key={palette.id}
            type="button"
            disabled={pending}
            aria-pressed={selectedPaletteId === palette.id}
            onMouseEnter={() => !pending && applyPreview(palette.colors)}
            onMouseLeave={handlePreviewEnd}
            onFocus={() => !pending && applyPreview(palette.colors)}
            onBlur={handlePreviewEnd}
            onClick={() => applyPaletteToEditor(palette.colors)}
            className={`flex flex-col items-start gap-2 rounded-xl border p-3 text-left disabled:opacity-60 ${
              selectedPaletteId === palette.id
                ? "border-brand-orange bg-surface-sunken"
                : "border-border/15 bg-surface-raised"
            }`}
          >
            <div className="flex gap-1.5">
              <span
                className="h-5 w-5 rounded-full border border-border/15"
                style={{ backgroundColor: palette.colors.primary }}
              />
              <span
                className="h-5 w-5 rounded-full border border-border/15"
                style={{ backgroundColor: palette.colors.secondary }}
              />
              <span
                className="h-5 w-5 rounded-full border border-border/15"
                style={{ backgroundColor: palette.colors.accent }}
              />
            </div>
            <span className="text-xs font-bold text-fg">{palette.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border/15 bg-surface-raised p-4">
        {(Object.keys(FIELD_LABELS) as FieldKey[]).map((key) => (
          <div key={key} className="flex items-center gap-3">
            <input
              type="color"
              aria-label={FIELD_LABELS[key]}
              value={normalizeHexColor(editor[key]) ?? "#000000"}
              disabled={pending}
              onChange={(e) => updateField(key, e.target.value)}
              className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-border/15 bg-transparent p-0.5"
            />
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-bold text-fg/50">{FIELD_LABELS[key]}</label>
              <input
                type="text"
                value={editor[key]}
                disabled={pending}
                onChange={(e) => updateField(key, e.target.value)}
                placeholder="#RRGGBB"
                className="h-10 w-full rounded-lg border border-border/15 bg-surface px-3 text-sm font-semibold text-fg"
              />
              {fieldErrors[key] ? (
                <p className="mt-1 text-xs font-medium text-danger">{fieldErrors[key]}</p>
              ) : null}
            </div>
          </div>
        ))}

        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={pending || hasInvalidField}
            onClick={handleSave}
            className="h-12 flex-1 rounded-xl bg-brand-orange text-sm font-extrabold text-ink disabled:opacity-40"
          >
            {pending ? "Enregistrement..." : "Enregistrer les couleurs"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleRestoreDefault}
            className="h-12 flex-1 rounded-xl border border-border/15 text-sm font-extrabold text-fg disabled:opacity-40"
          >
            Restaurer SAMA HOME classique
          </button>
        </div>

        {saved ? <p className="text-xs font-medium text-success">Couleurs enregistrées.</p> : null}
        {error ? (
          <p role="alert" className="text-xs font-medium text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
