"use client";

import { useState } from "react";
import Link from "next/link";
import { T } from "@/components/i18n/i18n-provider";

export function CheckInDirectWidget() {
  const [tab, setTab] = useState<"chambre" | "appartement">("chambre");
  const [duration, setDuration] = useState("2 heures");
  const [tariff, setTariff] = useState("10 000 FCFA");
  const [selectedUnit, setSelectedUnit] = useState("");

  const handleTabChange = (nextTab: "chambre" | "appartement") => {
    setTab(nextTab);
    if (nextTab === "chambre") {
      setTariff(duration === "2 heures" ? "10 000 FCFA" : "25 000 FCFA");
    } else {
      setTariff(duration === "2 heures" ? "20 000 FCFA" : "50 000 FCFA");
    }
  };

  const handleDurationChange = (nextDur: string) => {
    setDuration(nextDur);
    if (tab === "chambre") {
      setTariff(nextDur === "2 heures" ? "10 000 FCFA" : "25 000 FCFA");
    } else {
      setTariff(nextDur === "2 heures" ? "20 000 FCFA" : "50 000 FCFA");
    }
  };

  return (
    <div className="rounded-2xl border border-app-line bg-app-panel p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563eb]/20 text-[#38bdf8]">
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M2 4v16" />
            <path d="M2 8h18a2 2 0 0 1 2 2v10" />
            <path d="M2 17h20" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-bold text-fg tracking-tight"><T>Check-in direct</T></h2>
          <p className="text-[11px] text-app-faint"><T>Enregistrer rapidement une arrivée</T></p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-app-sidebar p-1 border border-app-line mb-3.5">
        <button
          type="button"
          onClick={() => handleTabChange("chambre")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            tab === "chambre" ? "bg-[#2563eb] text-white shadow-sm" : "text-app-muted hover:text-app-text"
          }`}
        >
          <T>Chambre</T>
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("appartement")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            tab === "appartement" ? "bg-[#2563eb] text-white shadow-sm" : "text-app-muted hover:text-app-text"
          }`}
        >
          <T>Appartement</T>
        </button>
      </div>

      {/* Form Fields */}
      <div className="flex flex-col gap-3">
        {/* Select Logement */}
        <div>
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="w-full h-9 rounded-xl bg-app-panel-hi border border-app-line px-3 text-xs text-fg outline-none focus:border-[#2563eb]"
          >
            <option value="">
              {tab === "chambre" ? <T>{"Sélectionner une chambre disponible"}</T> : <T>{"Sélectionner un appartement disponible"}</T>}
            </option>
            {tab === "chambre" ? (
              <>
                <option value="102"><T>Chambre 102 — RDC</T></option>
                <option value="103"><T>Chambre 103 — 1er étage</T></option>
                <option value="201"><T>Chambre 201 — 2ème étage</T></option>
                <option value="204"><T>Chambre 204 — 2ème étage</T></option>
              </>
            ) : (
              <>
                <option value="A4"><T>Appartement A4 — 1er étage</T></option>
                <option value="B1"><T>Appartement B1 — Rez-de-jardin</T></option>
              </>
            )}
          </select>
        </div>

        {/* Durée & Tarif */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[10px] font-bold text-app-faint uppercase mb-1"><T>Durée</T></label>
            <select
              value={duration}
              onChange={(e) => handleDurationChange(e.target.value)}
              className="w-full h-9 rounded-xl bg-app-panel-hi border border-app-line px-3 text-xs text-fg outline-none focus:border-[#2563eb]"
            >
              <option value="2 heures"><T>2 heures</T></option>
              <option value="Nuitée"><T>Nuitée (24h)</T></option>
              <option value="Semaine"><T>1 Semaine</T></option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-app-faint uppercase mb-1"><T>Tarif</T></label>
            <div className="h-9 rounded-xl bg-app-panel-hi border border-app-line flex items-center justify-center font-black text-xs text-fg">
              {tariff}
            </div>
          </div>
        </div>

        {/* CTA Enregistrer */}
        <Link
          href={`/locations/new${selectedUnit ? `?propertyId=${selectedUnit}` : ""}`}
          className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ef4444] to-[#dc2626] text-xs font-bold text-white shadow-lg hover:brightness-110 active:scale-[0.99] transition-all"
        >
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[#dc2626]">
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </div>
          <span><T>Enregistrer le check-in</T></span>
        </Link>
      </div>
    </div>
  );
}
