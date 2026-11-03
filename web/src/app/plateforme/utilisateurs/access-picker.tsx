"use client";

import { useMemo, useState } from "react";
import {
  PLATFORM_CAPABILITIES,
  PLATFORM_DOMAINS,
  PLATFORM_ROLES,
  canGrant,
  effectivePlatformCapabilities,
  roleOf,
  type PlatformCapabilityId,
  type PlatformRoleId,
} from "@/lib/platform-access";

const LEVEL_LABEL = { view: "Consulter", act: "Agir", sensitive: "Sensible" } as const;
const LEVEL_STYLE = {
  view: "bg-sky-500/15 text-sky-300",
  act: "bg-amber-500/15 text-amber-300",
  sensitive: "bg-rose-500/15 text-rose-300",
} as const;

/**
 * Choix des droits d'un administrateur de plateforme : un RÔLE prêt à l'emploi (cas courant) ou un accès
 * PERSONNALISÉ droit par droit. Envoie `permissionsMode` et `permissions` avec le formulaire. Les droits que
 * celui qui modifie ne possède pas lui-même sont grisés (le serveur refuse de toute façon : anti-escalade).
 */
export function AccessPicker({
  initialStored,
  actorPermissions,
}: {
  /** Droits actuels de la personne modifiée (`null` = super-administrateur). `undefined` = nouveau compte. */
  initialStored: string | null | undefined;
  /** Droits de la personne connectée. */
  actorPermissions: string | null;
}) {
  const initialRole = initialStored === undefined ? "SUPPORT" : (roleOf(initialStored) ?? "CUSTOM");
  const [roleId, setRoleId] = useState<PlatformRoleId | "CUSTOM">(initialRole);
  const [selected, setSelected] = useState<Set<PlatformCapabilityId>>(() =>
    initialStored === undefined
      ? new Set(PLATFORM_ROLES.find((r) => r.id === "SUPPORT")!.capabilities)
      : effectivePlatformCapabilities(initialStored),
  );

  const isSuper = roleId === "SUPER_ADMIN";
  const actor = useMemo(() => effectivePlatformCapabilities(actorPermissions), [actorPermissions]);

  function chooseRole(id: PlatformRoleId | "CUSTOM") {
    setRoleId(id);
    if (id !== "CUSTOM") setSelected(new Set(PLATFORM_ROLES.find((r) => r.id === id)!.capabilities));
  }

  function toggle(id: PlatformCapabilityId, on: boolean) {
    setRoleId("CUSTOM");
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const effective = effectivePlatformCapabilities(JSON.stringify([...selected]));
  const can = PLATFORM_CAPABILITIES.filter((c) => effective.has(c.id));
  const cannot = PLATFORM_CAPABILITIES.filter((c) => !effective.has(c.id));

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="permissionsMode" value={isSuper ? "ALL" : "CUSTOM"} />
      {!isSuper ? [...selected].map((id) => <input key={id} type="hidden" name="permissions" value={id} />) : null}

      <div>
        <span className="mb-2 block text-xs font-black uppercase tracking-wider text-brand-orange">Rôle</span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PLATFORM_ROLES.map((role) => {
            const allowed = canGrant(actorPermissions, role.id === "SUPER_ADMIN" ? null : JSON.stringify(role.capabilities));
            const active = roleId === role.id;
            return (
              <button
                key={role.id}
                type="button"
                disabled={!allowed}
                aria-pressed={active}
                onClick={() => chooseRole(role.id)}
                className={`flex flex-col rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  active ? "border-brand-orange bg-brand-orange/10" : "border-white/10 bg-white/5 hover:border-white/25"
                }`}
              >
                <span className="text-xs font-extrabold text-white">{role.label}</span>
                <span className="mt-0.5 text-[11px] leading-snug text-white/55">{role.description}</span>
                {!allowed ? <span className="mt-1 text-[10px] font-bold text-white/40">Vous ne possédez pas tous ces droits.</span> : null}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={roleId === "CUSTOM"}
            onClick={() => chooseRole("CUSTOM")}
            className={`flex flex-col rounded-xl border p-3 text-left transition-colors ${
              roleId === "CUSTOM" ? "border-brand-orange bg-brand-orange/10" : "border-white/10 bg-white/5 hover:border-white/25"
            }`}
          >
            <span className="text-xs font-extrabold text-white">Accès personnalisé</span>
            <span className="mt-0.5 text-[11px] leading-snug text-white/55">Choisir les droits un par un, pour un cas particulier.</span>
          </button>
        </div>
      </div>

      {roleId === "CUSTOM" ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          {PLATFORM_DOMAINS.map((domain) => (
            <fieldset key={domain.id} className="flex flex-col gap-1.5">
              <legend className="mb-1 text-[11px] font-black uppercase tracking-wider text-white/50">{domain.label}</legend>
              {PLATFORM_CAPABILITIES.filter((c) => c.domain === domain.id).map((cap) => {
                const checked = selected.has(cap.id);
                const allowed = actor.has(cap.id);
                return (
                  <label
                    key={cap.id}
                    className={`flex items-start gap-2.5 rounded-xl border p-2.5 ${
                      checked ? "border-brand-orange/40 bg-brand-orange/10" : "border-white/5 bg-surface/50"
                    } ${allowed ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!allowed}
                      onChange={(e) => toggle(cap.id, e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-brand-orange"
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold leading-snug text-white">{cap.label}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${LEVEL_STYLE[cap.level]}`}>
                          {LEVEL_LABEL[cap.level]}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[10px] leading-tight text-white/50">{cap.description}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 sm:grid-cols-2" aria-live="polite">
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">Cette personne pourra</span>
          <ul className="mt-1.5 space-y-0.5 text-[11px] text-white/80">
            {can.length === 0 ? <li className="text-white/40">Rien pour l&apos;instant.</li> : can.map((c) => <li key={c.id}>✓ {c.label}</li>)}
          </ul>
        </div>
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-white/40">Elle ne pourra pas</span>
          <ul className="mt-1.5 space-y-0.5 text-[11px] text-white/45">
            {cannot.length === 0 ? <li>Aucune restriction.</li> : cannot.map((c) => <li key={c.id}>✕ {c.label}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
