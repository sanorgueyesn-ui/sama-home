import "server-only";
import { headers } from "next/headers";

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

// Global in-memory cache preserved across requests within the server process
const store = new Map<string, RateLimitRecord>();

/**
 * Extrait l'adresse IP client depuis les en-têtes de la requête (reverse proxy, CDN ou fallback).
 */
export async function getClientIp(): Promise<string> {
  try {
    const headerStore = await headers();
    const forwarded = headerStore.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }
    const realIp = headerStore.get("x-real-ip");
    if (realIp) return realIp.trim();
  } catch {
    // Fallback hors contexte de requête Next.js (tests, scripts)
  }
  return "127.0.0.1";
}

/**
 * Limiteur de débit à fenêtre glissante / fixe en mémoire.
 * @param key Identifiant unique (ex: "login:192.168.1.1" ou "register:192.168.1.1")
 * @param limit Nombre maximal de tentatives autorisées dans la fenêtre
 * @param windowSeconds Durée de la fenêtre en secondes
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const record = store.get(key);

  // Nettoyage opportuniste si la table dépasse 10 000 clés
  if (store.size > 10_000) {
    for (const [k, v] of store.entries()) {
      if (v.resetAt <= now) {
        store.delete(k);
      }
    }
  }

  if (!record || record.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (record.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  record.count += 1;
  return { allowed: true, remaining: limit - record.count, retryAfterSeconds: 0 };
}

/**
 * Réinitialise le compteur pour une clé donnée (ex: après un login réussi).
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}
