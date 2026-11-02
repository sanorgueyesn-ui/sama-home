"use client";

import { useState } from "react";
import {
  ESTABLISHMENT_MODULE_PERMISSIONS,
  ESTABLISHMENT_ACTION_PERMISSIONS,
  parseUserPermissions,
} from "@/lib/permissions";
import { CrownIcon, ShieldIcon, KeyIcon, CashIcon } from "@/components/ui/icons";
import { T } from "@/components/i18n/i18n-provider";

export function EstablishmentPermissionsSelector({
  defaultPermissions,
  role,
}: {
  defaultPermissions?: string | null;
  role: string;
}) {
  const initialPerms = parseUserPermissions(defaultPermissions);
  const initialMode =
    role === "ADMIN" && (!defaultPermissions || initialPerms.includes("ESTABLISHMENT_ALL"))
      ? "ALL"
      : defaultPermissions
      ? "CUSTOM"
      : "RECEPTION";

  const [mode, setMode] = useState<"ALL" | "CUSTOM">(initialMode === "ALL" ? "ALL" : "CUSTOM");

  const [selected, setSelected] = useState<string[]>(() => {
    if (initialPerms.length > 0) return initialPerms;
    if (role === "ADMIN") return ["ESTABLISHMENT_ALL"];
    // Par défaut pour un gestionnaire : profil réceptionniste
    return [
      "MODULE_SEJOUR",
      "MODULE_RESERVATIONS",
      "MODULE_LOCATIONS",
      "MODULE_CLIENTS",
      "MODULE_LOGEMENTS",
    ];
  });

  function applyPreset(preset: "RECEPTION" | "CASHIER" | "ALL") {
    setMode("CUSTOM");
    if (preset === "RECEPTION") {
      setSelected([
        "MODULE_SEJOUR",
        "MODULE_RESERVATIONS",
        "MODULE_LOCATIONS",
        "MODULE_CLIENTS",
        "MODULE_LOGEMENTS",
      ]);
    } else if (preset === "CASHIER") {
      setSelected([
        "MODULE_SEJOUR",
        "MODULE_LOCATIONS",
        "MODULE_CAISSE",
        "MODULE_DEPENSES",
      ]);
    } else if (preset === "ALL") {
      setMode("ALL");
      setSelected(["ESTABLISHMENT_ALL"]);
    }
  }

  function togglePermission(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  return (
    <div className="rounded-2xl border border-border/15 bg-surface-raised p-4 sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-border/10 pb-3">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-brand-orange">
            <T>Permissions &amp; Limites d&apos;accès</T>
          </span>
          <p className="text-[11px] text-fg/60 mt-0.5">
            <T>Choisissez exactement les pages et actions autorisées pour ce collaborateur.</T>
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        <label className="flex items-center gap-2.5 rounded-xl border border-border/15 bg-surface p-3 cursor-pointer hover:border-brand-orange/40 transition-colors">
          <input
            type="radio"
            name="permissionsMode"
            value="ALL"
            checked={mode === "ALL"}
            onChange={() => applyPreset("ALL")}
            className="accent-brand-orange h-4 w-4"
          />
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-fg">
              <CrownIcon className="h-4 w-4 text-app-good" />
              <span><T>Pleins Pouvoirs (Patron / Administrateur)</T></span>
            </span>
            <p className="text-[11px] text-fg/50"><T>Accès illimité à tous les modules, modification des tarifs et suppression.</T></p>
          </div>
        </label>

        <label className="flex items-center gap-2.5 rounded-xl border border-border/15 bg-surface p-3 cursor-pointer hover:border-brand-orange/40 transition-colors">
          <input
            type="radio"
            name="permissionsMode"
            value="CUSTOM"
            checked={mode === "CUSTOM"}
            onChange={() => setMode("CUSTOM")}
            className="accent-brand-orange h-4 w-4"
          />
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-fg">
              <KeyIcon className="h-4 w-4 text-app-warn" />
              <span><T>Accès Limité &amp; Personnalisé (Caisse, Réception, Assistant)</T></span>
            </span>
            <p className="text-[11px] text-fg/50"><T>Seules les pages et actions cochées ci-dessous seront accessibles.</T></p>
          </div>
        </label>
      </div>

      {mode === "CUSTOM" && (
        <div className="mt-4 pt-4 border-t border-border/10 flex flex-col gap-4 animate-in fade-in duration-150">
          {/* Raccourcis / Profils types */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-fg/50 mr-1"><T>Profils types :</T></span>
            <button
              type="button"
              onClick={() => applyPreset("RECEPTION")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-surface border border-border/15 px-2.5 py-1 text-[11px] font-bold text-fg hover:border-brand-orange hover:text-brand-orange transition-colors cursor-pointer"
            >
              <ShieldIcon className="h-3 w-3" />
              <span><T>Réceptionniste (Tarifs bloqués)</T></span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset("CASHIER")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-surface border border-border/15 px-2.5 py-1 text-[11px] font-bold text-fg hover:border-brand-orange hover:text-brand-orange transition-colors cursor-pointer"
            >
              <CashIcon className="h-3 w-3" />
              <span><T>Caissier / Caisse</T></span>
            </button>
          </div>

          {/* Groupe 1 : Modules accessibles */}
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-fg/70 block mb-2">
              <T>1. Pages visibles dans le menu</T>
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ESTABLISHMENT_MODULE_PERMISSIONS.map((mod) => {
                const checked = selected.includes(mod.id);
                return (
                  <label
                    key={mod.id}
                    className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-colors ${
                      checked
                        ? "border-brand-orange/40 bg-brand-orange/10"
                        : "border-border/10 bg-surface/50 opacity-60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="permissions"
                      value={mod.id}
                      checked={checked}
                      onChange={() => togglePermission(mod.id)}
                      className="accent-brand-orange h-4 w-4 mt-0.5"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-fg block leading-snug"><T>{mod.label}</T></span>
                      <p className="text-[10px] text-fg/50 leading-tight mt-0.5"><T>{mod.description}</T></p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Groupe 2 : Limites & Actions sensibles */}
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-fg/70 block mb-2">
              <T>2. Limites &amp; Actions autorisées</T>
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ESTABLISHMENT_ACTION_PERMISSIONS.map((action) => {
                const checked = selected.includes(action.id);
                return (
                  <label
                    key={action.id}
                    className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-colors ${
                      checked
                        ? "border-success/40 bg-success/10"
                        : "border-border/10 bg-surface/50 opacity-60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="permissions"
                      value={action.id}
                      checked={checked}
                      onChange={() => togglePermission(action.id)}
                      className="accent-brand-orange h-4 w-4 mt-0.5"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-fg block leading-snug"><T>{action.label}</T></span>
                        {!checked && (
                          <span className="rounded bg-danger/15 px-1 py-0.2 text-[9px] font-bold text-app-bad">
                            <T>Bloqué</T>
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-fg/50 leading-tight mt-0.5"><T>{action.description}</T></p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
