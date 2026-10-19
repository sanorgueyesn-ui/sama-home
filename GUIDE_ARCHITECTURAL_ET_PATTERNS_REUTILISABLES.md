# GUIDE ARCHITECTURAL, RÈGLES DE SÉCURITÉ & PATTERNS RÉUTILISABLES
> **Ce document est une boîte à outils universelle et un référentiel de bonnes pratiques.**  
> Il regroupe l'ensemble des règles architecturales, des problèmes réels rencontrés, des pièges évités et des solutions techniques éprouvées sur **SAMA HOME**. Il est conçu pour être réutilisé directement dans tout futur projet SaaS ou applicatif moderne.

---

## 1. Philosophie Générale : "Security & Reliability by Design"

Dans toute application SaaS de gestion, la règle absolue est : **"Never Trust the Client" (Ne jamais faire confiance au navigateur)**.

1. **Validation côté serveur obligatoire** : Aucun masquage d'un bouton ou champ dans l'interface React ne constitue une sécurité. Tout contrôle de droit, de statut ou d'existence doit être réexécuté au niveau de la Server Action / API.
2. **Étanchéité par défaut** : Chaque requête SQL / ORM doit être bornée par le périmètre de l'utilisateur authentifié.
3. **Tolérance aux pannes réseau** : Les services tiers (SMTP, Stockage S3, OAuth) doivent toujours posséder une stratégie de secours automatique (failover).
4. **Zéro dette technique** : Aucun `any` toléré en TypeScript, 0 erreur de compilation, 0 avertissement de re-render en cascade React.

---

## 2. Architecture Multi-Tenant & Contrôle d'Accès (Anti-IDOR)

### 2.1 Le Piège de l'IDOR (Insecure Direct Object Reference)
* **Problème** : Un utilisateur de l'établissement A passe dans l'URL ou un formulaire l'ID d'une ressource (chambre, client, contrat, dépense) appartenant à l'établissement B. Si l'application fait simplement `prisma.property.findUnique({ where: { id } })`, elle divulgue ou modifie les données d'un concurrent.
* **Règle d'or** : 
  * L'`establishmentId` (ou `tenantId`) ne doit **jamais** provenir d'un paramètre envoyé par le client (`req.body` ou `formData`).
  * Il est extrait **exclusivement de la session vérifiée en base de données** côté serveur.

### 2.2 Pattern DAL (Data Access Layer) Réutilisable
Créer un fichier centralisé `src/lib/dal.ts` qui encapsule la vérification de l'utilisateur avec `React.cache()` :
```typescript
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionCookiePayload } from "@/lib/session-token";

// 1. Vérification de la session en base (pas seulement la signature du cookie)
export const verifySession = cache(async () => {
  const sessionPayload = await getSessionCookiePayload();
  if (!sessionPayload?.sessionId) redirect("/login");

  const session = await prisma.session.findUnique({
    where: { id: sessionPayload.sessionId },
    select: { userId: true, expiresAt: true },
  });

  if (!session || session.expiresAt.getTime() <= Date.now()) {
    redirect("/login");
  }
  return { userId: session.userId };
});

// 2. Récupération sûre du profil utilisateur avec exclusion absolue du hash de mot de passe
export const getCurrentUser = cache(async () => {
  const { userId } = await verifySession();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      role: true,
      establishmentId: true,
      isPlatformAdmin: true,
      permissions: true,
    },
  });
  if (!user) redirect("/login");
  return user;
});

// 3. Contrôle de rôle administrateur de tenant
export const requireAdmin = cache(async () => {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
});

// 4. Contrôle super-administrateur de plateforme (étanchéité totale avec les admins de tenant)
export const requirePlatformAdmin = cache(async () => {
  const user = await getCurrentUser();
  if (!user.isPlatformAdmin) redirect("/");
  return user;
});
```

### 2.3 Injection Systématique du Filtre Tenant
Toutes les lectures et mutations en base de données doivent obligatoirement inclure le filtre de tenant :
```typescript
// BONNE PRATIQUE : Impossible d'accéder aux données d'un autre tenant
const property = await prisma.property.findFirst({
  where: {
    id: propertyId,
    establishmentId: user.establishmentId, // Verrou multi-tenant absolu
  },
});
```

---

## 3. Authentification, Sécurité des Mots de Passe & RGPD

### 3.1 Protection contre les "Timing Attacks" (Énumération de comptes)
* **Problème** : Si un utilisateur n'existe pas, une fonction de login renvoie immédiatement une erreur en 5ms, alors que si le compte existe, `bcrypt.compare()` prend 100ms. Un attaquant peut ainsi lister tous les e-mails valides de la plateforme en mesurant le temps de réponse.
* **Solution universelle** :
  Toujours exécuter `verifyPassword` en temps constant avec un hash factice (`dummy hash`) même si l'utilisateur est inexistant :
  ```typescript
  const DUMMY_HASH = "$2a$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNO";
  
  export async function verifyPassword(password: string, realHash: string | null): Promise<boolean> {
    if (!realHash) {
      await bcrypt.compare(password, DUMMY_HASH);
      return false;
    }
    return bcrypt.compare(password, realHash);
  }
  ```

### 3.2 Limitation de Débit (Rate Limiting) par IP
Protéger les points d'entrée critiques (`/login`, `/forgot-password`, `/verify-otp`) contre les attaques par force brute :
```typescript
const ip = await getClientIp();
const rate = checkRateLimit(`login:${ip}`, 5, 60); // 5 tentatives par minute max
if (!rate.allowed) {
  return { error: `Trop de tentatives. Veuillez patienter ${rate.retryAfterSeconds}s.` };
}
```

### 3.3 Purge Définitive & Suppression en Cascade (Droit à l'oubli)
* **Problème** : Lors de la suppression d'un utilisateur ou d'un compte de test, des clés étrangères `NOT NULL` ou des tables de jetons orphelines bloquent la suppression ou permettent à l'utilisateur de continuer à recevoir des codes OTP ou de réinitialiser un compte supposé mort.
* **Solution universelle** :
  1. Délier les clés optionnelles (`SetNull` sur les audits, validations).
  2. Réassigner les clés obligatoires vers un administrateur pérenne de la plateforme.
  3. Révoquer immédiatement les sessions actives (`deleteMany({ where: { userId } })`).
  4. Détruire tous les jetons `PasswordResetToken` et `OtpVerification` liés à cette adresse.
  5. Supprimer la ligne `User`.

---

## 4. Stratégie d'Envoi d'E-mails & Contournement des Ports Bloqués

### 4.1 Le Piège Classique des Hébergeurs Cloud (Port 25, 465, 587)
* **Constat** : Railway, DigitalOcean, Render, AWS EC2 ou les FAI locaux bloquent souvent les connexions SMTP sortantes vers Google (smtp.gmail.com:465 ou 587) pour prévenir le spam. Résultat : `ETIMEDOUT` ou `ESOCKETTIMEDOUT` et impossibilité d'envoyer les codes OTP de réinitialisation.
* **Solution universelle "Double Détente"** :
  1. **Canal Principal (Prioritaire) : Relais HTTPS Google Apps Script (Port 443)**
     * Le port HTTPS (443) n'est **jamais bloqué** par aucun pare-feu ni hébergeur.
     * Un simple script Google Apps Script gratuit déployé en Web App reçoit la requête POST chiffrée avec une clé secrète partagée et appelle `GmailApp.sendEmail()`.
  2. **Canal Secondaire (Secours) : SMTP Nodemailer direct**
     * Si le relais HTTPS ne répond pas, bascule automatique transparente vers le transport SMTP standard.

```typescript
// Architecture du relais dans src/lib/mail.ts
if (GOOGLE_SCRIPT_URL) {
  try {
    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html, text }),
      signal: AbortSignal.timeout(10000), // Timeout strict 10s
    });
    if (res.ok) return { success: true };
  } catch (err) {
    console.warn("Relais HTTPS en échec, repli vers SMTP...");
  }
}
// Repli SMTP ici...
```

---

## 5. Compatibilité Cross-Platform (Windows vs Linux & Build Next.js)

### 5.1 L'erreur "EISDIR / os error 1" sur disques externes / partitions non-NTFS
* **Problème** : Sur Windows avec des disques secondaires (FAT32/exFAT), Turbopack ou Webpack échoue avec `readlink EISDIR: illegal operation on a directory` ou `os error 1`. Node.js sous Windows renvoie parfois le code d'erreur `EISDIR` au lieu de `EINVAL` lorsqu'il appelle `readlink` sur un fichier régulier.
* **Solution universelle dans `next.config.ts`** :
  Insérer un patch d'interception transparent au tout début de `next.config.ts` :
  ```typescript
  import fs from "node:fs";

  if (process.platform === "win32") {
    const origSync = fs.readlinkSync;
    (fs as any).readlinkSync = function (p: any, options: any) {
      try {
        return origSync(p, options);
      } catch (err: any) {
        if (err && err.code === "EISDIR") err.code = "EINVAL";
        throw err;
      }
    };

    const origAsync = fs.readlink;
    (fs as any).readlink = function (p: any, ...args: any[]) {
      const cb = typeof args[args.length - 1] === "function" ? args[args.length - 1] : null;
      if (cb) {
        args[args.length - 1] = function (err: any, linkString: any) {
          if (err && err.code === "EISDIR") err.code = "EINVAL";
          return cb(err, linkString);
        };
      }
      return (origAsync as any).apply(fs, [p, ...args]);
    };
  }

  const nextConfig: NextConfig = {
    webpack: (config) => {
      config.resolve = config.resolve || {};
      config.resolve.symlinks = false; // Désactiver la résolution des liens symboliques fragiles
      return config;
    },
  };
  ```

---

## 6. Règles de Développement React 19 & Next.js App Router

### 6.1 Interdiction des `setState` synchrones dans `useEffect`
* **Erreur** : `Calling setState synchronously within an effect can trigger cascading renders (react-hooks/set-state-in-effect)`.
* **Règle** : Si une valeur dépend des `props` ou d'un autre état, **ne pas créer un `useEffect` pour la synchroniser**. Calculer la valeur à la volée pendant le rendu (état dérivé / derived state) :
  ```typescript
  // MAUVAISE PRATIQUE :
  useEffect(() => {
    setTariffId(tariffs[0]?.id);
  }, [tariffs]);

  // BONNE PRATIQUE (React 19) :
  const effectiveTariffId = tariffs.some(t => t.id === tariffId) 
    ? tariffId 
    : (tariffs[0]?.id ?? "");
  ```

### 6.2 Protection des Variables d'Environnement
* **Règle absolue** : Ne jamais préfixer une clé secrète avec `NEXT_PUBLIC_`.
* Les variables comme `DATABASE_URL`, `SESSION_SECRET`, `GOOGLE_CLIENT_SECRET`, `S3_SECRET_KEY` doivent rester strictement inaccessibles au bundle client.
* Ajouter `"server-only";` en tête de tout module manipulant des secrets (`src/lib/session.ts`, `src/lib/dal.ts`, `src/lib/mail.ts`).

---

## 7. Base de Données, Prisma & Intégrité des Transactions

### 7.1 Typage Strict des Transactions Prisma
Pour éviter les erreurs TypeScript et l'utilisation de `any` dans les transactions multi-tables :
```typescript
import type { Prisma } from "@/generated/prisma/client";

export async function executePurge(
  tx: Prisma.TransactionClient, // Type officiel strict
  userId: string
) {
  await tx.session.deleteMany({ where: { userId } });
}
```

### 7.2 Scripts Utilitaires Indispensables
Tout projet en production doit intégrer dans son dossier `scripts/` :
1. `backup-db.mts` : Sauvegarde chiffrée PostgreSQL vers le stockage S3/local avant chaque déploiement majeur.
2. `restore-db.mts` : Restauration d'urgence en une seule commande en cas d'incident.
3. `clean-production-db.mts` : Script de remise à zéro contrôlée permettant de purger les comptes et réservations de test sans toucher aux comptes administrateurs maîtres.

---

## 8. Checklist des 10 Commandements pour Tout Nouveau Projet

| # | Règle / Contrôle | Validé |
|---|---|---|
| 1 | Toutes les Server Actions vérifient l'authentification et le rôle via `src/lib/dal.ts`. | [x] |
| 2 | Aucune requête SQL brute concaténée (utiliser Prisma ORM ou template strings sécurisées). | [x] |
| 3 | Aucun cookie de session lisible par JavaScript (`httpOnly: true`, `secure: true`, `sameSite: 'lax'`). | [x] |
| 4 | Rate limiting configuré sur le login et le mot de passe oublié. | [x] |
| 5 | Envoi d'e-mails sécurisé via HTTPS (Port 443) pour contourner les blocages de ports cloud. | [x] |
| 6 | Étanchéité multi-tenant systématique (`where: { tenantId }`) sur chaque lecture et écriture. | [x] |
| 7 | Gestion des états React selon les normes React 19 (zéro `set-state-in-effect`). | [x] |
| 8 | Patch Windows `readlink` dans `next.config.ts` pour garantir la compatibilité multi-OS. | [x] |
| 9 | Typage strict sans aucun `any` et 0 avertissement bloquant sur `npm run build`. | [x] |
| 10 | Scripts de sauvegarde (`backup-db`) et de vérification d'intégrité opérationnels. | [x] |
