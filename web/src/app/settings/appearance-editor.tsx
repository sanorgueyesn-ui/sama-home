"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { saveBrandColors } from "@/app/actions/brand-colors";
import {
  BRAND_PALETTES,
  BRAND_ROLES,
  DEFAULT_BRAND_COLORS,
  INK_COLOR,
  checkBrandContrast,
  displayAccentText,
  displayPrimary,
  normalizeHexColor,
  type BrandColors,
  type BrandPalette,
  type ThemeName,
} from "@/lib/brand-colors";
import { SettingsBlock } from "./settings-ui";
import { T, useT } from "@/components/i18n/i18n-provider";

type Key = keyof BrandColors;
const KEYS: Key[] = ["primary", "secondary", "accent"];

/**
 * Aperçu GLOBAL immédiat : pose les mêmes variables CSS que layout.tsx (avec la même adaptation au
 * thème), pour que toute l'application montre la palette choisie avant l'enregistrement. Rien n'est
 * enregistré ici ; l'état enregistré revient tout seul en quittant la page sans enregistrer.
 */
function applyPreview(colors: BrandColors, theme: ThemeName) {
  const root = document.documentElement.style;
  root.setProperty("--color-navy", displayPrimary(colors.primary, theme));
  root.setProperty("--color-coral", colors.secondary);
  root.setProperty("--color-brand-orange", colors.accent);
  root.setProperty("--color-accent-text", displayAccentText(colors.accent, theme));
}

function sameColors(a: BrandColors, b: BrandColors): boolean {
  return KEYS.every((key) => a[key].toUpperCase() === b[key].toUpperCase());
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

/**
 * Une palette : trois pastilles qui se chevauchent, son nom, ses couleurs. Une ligne d'une liste, pas
 * une carte : trois pastilles suffisent à reconnaître la palette, et la liste se lit d'un coup d'œil.
 * Sélection exclusive : `aria-pressed`, jamais `role="radio"` (même patron que le thème).
 */
function PaletteOption({ palette, selected, onSelect }: { palette: BrandPalette; selected: boolean; onSelect: () => void }) {
  const t = useT();
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        title={t(palette.description)}
        className={`relative flex min-h-14 w-full items-center gap-4 px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-orange ${
          selected ? "bg-fg/[0.05]" : "hover:bg-fg/[0.03]"
        }`}
      >
        {selected ? <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-brand-orange" /> : null}
        <span className="flex shrink-0 -space-x-2" aria-hidden>
          {KEYS.map((key) => (
            <span key={key} className="h-8 w-8 rounded-full ring-2 ring-surface-raised" style={{ backgroundColor: palette.colors[key] }} />
          ))}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-fg"><T>{palette.label}</T></span>
          <span className="block truncate text-xs text-fg/50">{KEYS.map((key) => t(palette.names[key])).join(" · ")}</span>
        </span>
        {selected ? (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-orange text-ink" aria-hidden>
            <CheckIcon />
          </span>
        ) : null}
        <span className="sr-only"><T>{palette.description}</T></span>
      </button>
    </li>
  );
}

function ColorRow({
  colorKey,
  value,
  error,
  check,
  name,
  onChange,
}: {
  colorKey: Key;
  value: string;
  error: string | null;
  check: { ok: boolean; message: string } | null;
  name: string;
  onChange: (value: string) => void;
}) {
  const role = BRAND_ROLES[colorKey];
  const valid = normalizeHexColor(value);
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5">
      <input
        type="color"
        aria-label={`Choisir : ${role.label}`}
        value={valid ?? "#000000"}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="h-11 w-11 shrink-0 cursor-pointer rounded-full border border-border/20 bg-transparent p-0.5 [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
      />
      <div className="min-w-0">
        <p className="text-sm font-bold text-fg">
          <T>{role.label}</T>
          <span className="ml-2 text-xs font-medium text-fg/45">{name}</span>
        </p>
        <p className="text-xs text-fg/55"><T>{role.hint}</T></p>
      </div>
      <div>
        <label htmlFor={`hex-${colorKey}`} className="sr-only">
          <T>Code hexadécimal :</T> <T>{role.label}</T>
        </label>
        <input
          id={`hex-${colorKey}`}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={Boolean(error)}
          className={`h-11 w-28 rounded-xl border bg-surface px-3 font-mono text-sm font-semibold uppercase text-fg outline-none focus:border-brand-orange ${
            error ? "border-danger" : "border-border/20"
          }`}
        />
      </div>
      {error ? (
        <p role="alert" className="col-span-3 text-xs font-medium text-danger">
          <T>{error}</T>
        </p>
      ) : check ? (
        <p className={`col-span-3 flex items-center gap-1.5 text-xs font-medium ${check.ok ? "text-success" : "text-warning"}`}>
          <span aria-hidden>{check.ok ? "✓" : "!"}</span>
          <T>{check.message}</T>
        </p>
      ) : null}
    </div>
  );
}

/** Mini-écran fidèle aux vrais composants : mêmes couleurs, mêmes textes (blanc sur la principale, encre sur l'accent). */
function LivePreview({ colors, theme }: { colors: BrandColors; theme: ThemeName }) {
  const primary = displayPrimary(colors.primary, theme);
  const accentText = displayAccentText(colors.accent, theme);
  return (
    <div className="overflow-hidden rounded-xl border border-border/15 bg-surface">
      <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: primary, color: "#FFFFFF" }}>
        <span className="text-sm font-extrabold tracking-wide"><T>SAMA HOME</T></span>
        <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: colors.secondary, color: "#FFFFFF", textShadow: "0 1px 1px rgba(0,0,0,.35)" }}>
          <T>Nouveau</T>
        </span>
      </div>
      <div className="flex flex-col gap-4 p-4">
        <div>
          <p className="text-sm font-bold text-fg"><T>Réservation de la chambre 101</T></p>
          <p className="mt-0.5 text-xs text-fg/55"><T>Du 29 au 31 octobre · 36 000 FCFA</T></p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-extrabold" style={{ backgroundColor: colors.accent, color: INK_COLOR }}>
            <T>Enregistrer</T>
          </span>
          <span className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-bold text-white" style={{ backgroundColor: primary }}>
            <T>Confirmer</T>
          </span>
          <span className="inline-flex h-10 items-center rounded-xl border px-4 text-sm font-bold" style={{ borderColor: colors.accent, color: accentText }}>
            <T>Annuler</T>
          </span>
        </div>
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-fg/10" aria-hidden>
            <div className="h-full w-2/3 rounded-full" style={{ backgroundColor: colors.accent }} />
          </div>
          <p className="mt-2 text-xs font-bold" style={{ color: accentText }}>
            <T>Paiement en cours : 67 % encaissé</T>
          </p>
        </div>
      </div>
    </div>
  );
}

export function AppearanceEditor({
  currentColors,
  theme,
  canSave,
}: {
  currentColors: BrandColors;
  theme: ThemeName;
  /** Faux tant que les informations de l'établissement n'ont jamais été enregistrées. */
  canSave: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState<BrandColors>(currentColors);
  const [editor, setEditor] = useState<BrandColors>(currentColors);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const savedRef = useRef<BrandColors>(currentColors);

  // En quittant la page sans enregistrer, l'aperçu temporaire est retiré : on revient à la palette enregistrée.
  useEffect(() => {
    return () => applyPreview(savedRef.current, theme);
  }, [theme]);

  const fieldErrors = Object.fromEntries(
    KEYS.map((key) => [key, normalizeHexColor(editor[key]) ? null : "Format invalide : #RRGGBB attendu (6 chiffres ou lettres A à F)."]),
  ) as Record<Key, string | null>;
  const valid = KEYS.every((key) => !fieldErrors[key]);
  const shown: BrandColors = valid
    ? { primary: editor.primary.toUpperCase(), secondary: editor.secondary.toUpperCase(), accent: editor.accent.toUpperCase() }
    : saved;
  const dirty = !sameColors(editor, saved);
  const selected = valid ? (BRAND_PALETTES.find((p) => sameColors(p.colors, shown))?.id ?? null) : null;
  const contrast = checkBrandContrast(shown);
  const isDefaultSaved = sameColors(saved, DEFAULT_BRAND_COLORS);

  function updateEditor(next: BrandColors) {
    setEditor(next);
    setMessage(null);
    if (KEYS.every((key) => normalizeHexColor(next[key]))) applyPreview(next, theme);
  }

  function handleSave() {
    if (!valid || pending || !canSave) return;
    const colors = { primary: shown.primary, secondary: shown.secondary, accent: shown.accent };
    setMessage(null);
    startTransition(async () => {
      const result = await saveBrandColors(colors);
      if (result.error) {
        setMessage({ kind: "error", text: result.error });
        applyPreview(saved, theme);
        return;
      }
      savedRef.current = colors;
      setSaved(colors);
      setEditor(colors);
      setMessage({ kind: "ok", text: "Palette enregistrée. Elle s'applique à toute l'application." });
      applyPreview(colors, theme);
      router.refresh();
    });
  }

  function handleRestoreDefault() {
    if (pending || !canSave) return;
    setMessage(null);
    startTransition(async () => {
      const result = await saveBrandColors(null);
      if (result.error) {
        setMessage({ kind: "error", text: result.error });
        applyPreview(saved, theme);
        return;
      }
      savedRef.current = DEFAULT_BRAND_COLORS;
      setSaved(DEFAULT_BRAND_COLORS);
      setEditor(DEFAULT_BRAND_COLORS);
      setMessage({ kind: "ok", text: "Palette SAMA HOME classique rétablie." });
      applyPreview(DEFAULT_BRAND_COLORS, theme);
      router.refresh();
    });
  }

  function handleCancel() {
    setEditor(saved);
    setMessage(null);
    applyPreview(saved, theme);
  }

  const matchedPalette = (key: Key): string => {
    const palette = BRAND_PALETTES.find((p) => p.colors[key].toUpperCase() === shown[key].toUpperCase());
    return palette ? palette.names[key] : "Personnalisée";
  };

  return (
    <div className="flex flex-col gap-8">
      {!canSave ? (
        <p role="status" className="rounded-xl bg-warning-bg px-4 py-3 text-sm font-medium text-warning">
          <T>Vous pouvez essayer les palettes, mais pour les enregistrer il faut d&apos;abord renseigner votre établissement.</T>{" "}
          <Link href="/settings/etablissement" className="font-bold underline underline-offset-2">
            <T>Renseigner l&apos;établissement</T>
          </Link>
        </p>
      ) : null}

      {/* Sur ordinateur : choix à gauche, aperçu fixe à droite (on voit le résultat sans remonter). Sur
          téléphone : palettes, aperçu, puis réglage fin, dans cet ordre. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start lg:gap-x-12">
        <SettingsBlock
          title="Palette"
          description="Cinq combinaisons prêtes à l'emploi. Un clic montre le résultat dans toute l'application, sans rien enregistrer."
          className="lg:col-start-1 lg:row-start-1"
        >
          <ul className="divide-y divide-border/10 overflow-hidden rounded-xl border border-border/15 bg-surface-raised">
            {BRAND_PALETTES.map((palette) => (
              <PaletteOption
                key={palette.id}
                palette={palette}
                selected={selected === palette.id}
                onSelect={() => updateEditor({ ...palette.colors })}
              />
            ))}
          </ul>
        </SettingsBlock>

        <SettingsBlock
          title="Aperçu"
          description="Les mêmes boutons et couleurs que dans l'application."
          className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:border-t-0 lg:pt-0"
        >
          <LivePreview colors={shown} theme={theme} />
        </SettingsBlock>

        <SettingsBlock
          title="Couleurs personnalisées"
          description="Partez d'une palette puis ajustez, ou composez la vôtre. Le texte blanc ou sombre posé dessus est vérifié pour rester lisible."
          className="lg:col-start-1 lg:row-start-2"
        >
          <div className="flex flex-col gap-6">
            {KEYS.map((key) => (
              <ColorRow
                key={key}
                colorKey={key}
                value={editor[key]}
                error={fieldErrors[key]}
                check={key === "primary" ? contrast.primary : key === "accent" ? contrast.accent : null}
                name={matchedPalette(key)}
                onChange={(value) => updateEditor({ ...editor, [key]: value })}
              />
            ))}
          </div>
        </SettingsBlock>
      </div>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 flex flex-col gap-3 rounded-2xl border border-border/15 bg-surface-raised/95 p-3 shadow-card backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
        <p role={message?.kind === "error" ? "alert" : "status"} className={`px-1 text-sm font-medium ${message?.kind === "error" ? "text-danger" : message ? "text-success" : "text-fg/60"}`}>
          {message ? message.text : dirty ? <T>{"Modifications non enregistrées."}</T> : <T>{"Aucune modification."}</T>}
        </p>
        <div className="flex flex-wrap gap-2">
          {!isDefaultSaved && !dirty ? (
            <button
              type="button"
              onClick={handleRestoreDefault}
              disabled={pending || !canSave}
              className="h-11 rounded-xl border border-border/20 px-4 text-sm font-bold text-fg transition-colors hover:bg-fg/5 disabled:opacity-40"
            >
              <T>Rétablir le classique</T>
            </button>
          ) : null}
          {dirty ? (
            <button
              type="button"
              onClick={handleCancel}
              disabled={pending}
              className="h-11 rounded-xl border border-border/20 px-4 text-sm font-bold text-fg transition-colors hover:bg-fg/5 disabled:opacity-40"
            >
              <T>Annuler</T>
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || !valid || pending || !canSave}
            className="h-11 rounded-xl bg-brand-orange px-5 text-sm font-extrabold text-ink transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {pending ? "Enregistrement..." : <T>{"Enregistrer la palette"}</T>}
          </button>
        </div>
      </div>
    </div>
  );
}
