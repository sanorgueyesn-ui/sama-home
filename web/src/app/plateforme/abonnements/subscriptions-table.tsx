"use client";

import { useState } from "react";
import type { PlatformSubscriptionEstablishmentView } from "@/lib/subscription-data";
import { SubscriptionActions } from "./subscription-actions";

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
}

export function SubscriptionsTable({
  establishments,
}: {
  establishments: PlatformSubscriptionEstablishmentView[];
}) {
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "ACTIVE" | "TRIAL" | "EXPIRED" | "NONE">("ALL");

  const filtered = establishments.filter((est) => {
    const q = query.trim().toLowerCase();
    const matchQuery =
      !q ||
      est.name.toLowerCase().includes(q) ||
      (est.adminName && est.adminName.toLowerCase().includes(q)) ||
      (est.adminEmail && est.adminEmail.toLowerCase().includes(q));

    if (!matchQuery) return false;

    if (filterType === "ALL") return true;
    if (filterType === "NONE") return !est.subscription;
    if (!est.subscription) return false;
    if (filterType === "EXPIRED") return est.subscription.isExpired;
    if (filterType === "TRIAL") return !est.subscription.isExpired && est.subscription.isTrial;
    if (filterType === "ACTIVE") return !est.subscription.isExpired;

    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Barre de recherche et filtres */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par établissement ou e-mail..."
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white placeholder-white/30 focus:border-brand-orange focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: "ALL", label: "Tous" },
              { id: "ACTIVE", label: "Actifs" },
              { id: "TRIAL", label: "En essai" },
              { id: "EXPIRED", label: "Expirés" },
              { id: "NONE", label: "Sans abonnement" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`rounded-xl px-3 py-1.5 text-[11px] font-bold transition-colors whitespace-nowrap ${
                filterType === f.id
                  ? "bg-brand-orange text-ink"
                  : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des abonnements */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/5 p-8 text-center text-xs text-white/40">
          Aucun établissement ne correspond aux filtres appliqués.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((est) => {
            const sub = est.subscription;
            let validityBadge = null;

            if (!sub) {
              validityBadge = (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/50">
                  Non configuré
                </span>
              );
            } else if (sub.isExpired) {
              validityBadge = (
                <span className="rounded-full bg-danger/15 px-2.5 py-0.5 text-[10px] font-bold text-danger">
                  Expiré ({Math.abs(sub.daysRemaining)} j)
                </span>
              );
            } else if (sub.daysRemaining <= 10) {
              validityBadge = (
                <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                  Expire bientôt ({sub.daysRemaining} j)
                </span>
              );
            } else {
              validityBadge = (
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                  Actif ({sub.daysRemaining} j restants)
                </span>
              );
            }

            return (
              <div
                key={est.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Infos établissement */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate text-sm font-extrabold text-white">{est.name}</h4>
                    {validityBadge}
                    {sub && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/70">
                        {sub.isTrial ? "Essai gratuit" : `Payant (${sub.confirmedPaymentsCount} règlement${sub.confirmedPaymentsCount > 1 ? "s" : ""})`}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 truncate text-xs text-white/50">
                    Admin : <span className="text-white/80">{est.adminName ?? "—"}</span> •{" "}
                    <span className="text-white/60">{est.adminEmail ?? "Sans email"}</span>
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/40">
                    <span>Inscrit le {fmtDate(est.createdAt)}</span>
                    {sub && (
                      <>
                        <span>•</span>
                        <span>Essai démarré le {fmtDate(sub.trialStartedAt)}</span>
                        <span>•</span>
                        <span className={sub.isExpired ? "font-bold text-danger" : "font-bold text-emerald-400"}>
                          Échéance : {fmtDate(sub.currentPeriodEnd)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions administratives */}
                <div className="shrink-0 pt-2 sm:pt-0">
                  <SubscriptionActions establishmentId={est.id} establishmentName={est.name} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
