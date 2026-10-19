---
name: production-saas-rules
description: Règles globales de production pour tout projet SaaS Next.js/React - Sécurité OWASP, Isolation Multi-Tenant, DAL, Relais Email HTTPS, Compatibilité Windows et React 19.
globs: "**/*"
always_on: true
---

# RÈGLES GLOBALES DE CONCEPTION & DÉVELOPPEMENT SAAS (PRODUCTION READY)

> **Directive Permanente de l'Agent :**
> Ces règles s'appliquent à l'ensemble des projets SaaS et applications web. Elles capitalisent sur l'expérience et les résolutions d'incidents critiques (SAMA HOME). Suivre ces directives dès le début évite les régressions, garantit une sécurité de niveau bancaire et accélère considérablement le développement.

---

## 1. RÈGLE D'OR DE SÉCURITÉ & MULTI-TENANCY (ANTI-IDOR)

### 1.1 "Never Trust the Client" (Ne jamais faire confiance au navigateur)
1. **Interdiction formelle** de faire confiance à un `establishmentId`, `tenantId`, `userId` ou `organizationId` transmis dans les formulaires (`formData`), les paramètres d'URL (`searchParams`) ou le corps de requête (`body`).
2. **Extraction exclusive depuis la session serveur** :
   * L'identifiant de tenant doit obligatoirement provenir de la session authentifiée en base de données (`const user = await getCurrentUser(); const tenantId = user.establishmentId;`).
3. **Le masquage d'un bouton ne protège rien** :
   * Tout formulaire masqué ou bouton désactivé dans l'interface React DOIT avoir son garde strict vérifié côté serveur dans la Server Action (`if (user.role !== 'ADMIN') throw new Error("Accès refusé");`).

### 1.2 Isolation Absolue des Requêtes Base de Données (Anti-IDOR)
* **Chaque requête** (SELECT, UPDATE, DELETE) touchant une donnée métier DOIT impérativement inclure le filtre du tenant :
  ```typescript
  // OBLIGATOIRE :
  await prisma.property.findFirst({
    where: { id: targetId, establishmentId: user.establishmentId }
  });
  ```
* **Distinction nette des rôles** :
  * Ne jamais confondre l'administrateur d'un tenant (`role === "ADMIN"`) avec le super-administrateur de la plateforme (`isPlatformAdmin === true`). Ce sont deux concepts strictement hermétiques.

---

## 2. AUTHENTIFICATION, SESSIONS & PROTECTION CONTRE LES ATTAQUES

### 2.1 Protection contre les Timing Attacks (Énumération de comptes)
* Pour empêcher les attaquants de déterminer si une adresse email existe en mesurant le temps de réponse du serveur :
  * Exécuter systématiquement un hachage bcrypt factice en temps constant (`DUMMY_HASH`) même lorsque l'utilisateur n'existe pas en base.
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

### 2.2 Limitation de Débit (Rate Limiting) Obligatoire
* Appliquer un rate-limiter par IP sur toutes les routes sensibles :
  * Connexion (`/login`) : 5 tentatives par minute max.
  * Mot de passe oublié & OTP (`/forgot-password`, `/verify-otp`) : 15 tentatives par 15 minutes.

### 2.3 Sessions Sécurisées & Déconnexion Réelle
* Les sessions sont enregistrées en base de données (`Session`).
* Le cookie client ne contient qu'un jeton signé (HS256) contenant `{ sessionId }`.
* Attributs de cookie obligatoires : `httpOnly: true`, `secure: process.env.NODE_ENV === "production"`, `sameSite: "lax"`.
* À la déconnexion, supprimer la ligne en base ET supprimer le cookie.

### 2.4 Purge Définitive & Droit à l'Oubli (Zero Orphan Data)
* Lors de la suppression d'un compte utilisateur ou d'un tenant :
  1. Passer les clés étrangères optionnelles à `null` (`SetNull`).
  2. Réassigner les clés obligatoires `NOT NULL` vers un compte admin système pérenne.
  3. Supprimer toutes les sessions actives (`prisma.session.deleteMany`).
  4. Détruire définitivement tous les jetons de mot de passe (`PasswordResetToken`) et codes OTP (`OtpVerification`).
  5. Supprimer l'utilisateur.
  * **Résultat garanti** : L'adresse email n'a plus aucune existence et ne peut plus réinitialiser de mot de passe.

---

## 3. RÉSILIENCE DES E-MAILS & BLOCAGE DES PORTS CLOUD

### 3.1 Le Problème des Ports SMTP (25, 465, 587)
* La plupart des hébergeurs cloud (Railway, AWS, DigitalOcean, Render) et certains FAI bloquent le trafic SMTP sortant, provoquant des `ETIMEDOUT`.

### 3.2 La Solution : Architecture Hybride Failover
* **Canal 1 (Prioritaire)** : Relais HTTPS via Google Apps Script (port 443, non bloqué).
* **Canal 2 (Repli)** : Transport direct SMTP Nodemailer (SSL 465 / TLS 587).
* L'application tente d'abord le relais HTTPS sur le port web standard 443. En cas d'indisponibilité, elle bascule automatiquement sur SMTP.

---

## 4. COMPATIBILITÉ MULTI-OS & SYSTÈME DE FICHIERS (WINDOWS / LINUX)

### 4.1 L'erreur "EISDIR / os error 1" sur Windows (FAT32/exFAT)
* Node.js sous Windows sur disque secondaire non-NTFS renvoie parfois `EISDIR` sur un appel `readlink` sur un fichier régulier, ce qui fait crasher Webpack ou Turbopack.
* **Correctif universel dans `next.config.ts`** :
  ```typescript
  import fs from "node:fs";

  if (process.platform === "win32") {
    const origSync = fs.readlinkSync;
    (fs as any).readlinkSync = function (p: any, options: any) {
      try { return origSync(p, options); }
      catch (err: any) {
        if (err && err.code === "EISDIR") err.code = "EINVAL";
        throw err;
      }
    };
  }
  ```
* Dans `next.config.ts`, désactiver la résolution des symlinks :
  ```typescript
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.symlinks = false;
    return config;
  }
  ```

---

## 5. RÈGLES DE CODAGE REACT 19 & NEXT.JS APP ROUTER

1. **Interdiction des `setState` synchrones dans `useEffect`** :
   * Ne jamais utiliser `useEffect` pour recopier un prop dans un state local (erreur `react-hooks/set-state-in-effect`).
   * Toujours dériver l'état au moment du rendu :
     ```typescript
     const effectiveTariffId = tariffs.some(t => t.id === tariffId) ? tariffId : (tariffs[0]?.id ?? "");
     ```
2. **Zéro `any` en TypeScript** :
   * Typer explicitement les clients de transaction Prisma avec `tx: Prisma.TransactionClient`.
3. **Protection des Clés Secrètes** :
   * Ne jamais préfixer une clé API, secret de session ou URL interne de base de données par `NEXT_PUBLIC_`.
   * Ajouter `"server-only";` au début de tous les modules gérant des secrets ou de la persistance.

---

## 6. MÉTHODOLOGIE DE TRAVAIL RAPIDE (FAST DELIVERY)

1. **Validation locale systématique** : Avant tout déploiement, exécuter `npm run build` en local pour vérifier que les 0 erreurs TypeScript et 0 warnings ESLint sont respectés.
2. **Scripts d'hygiène préventive** : Toujours inclure dans `scripts/` :
   * `backup-db.mts` : Sauvegarde instantanée avant mise en production.
   * `restore-db.mts` : Restauration d'urgence.
3. **Tester sur une base propre** : Les bugs d'authentification et de mot de passe oublié doivent toujours être testés à la fois sur un compte actif, un compte inexistant et un compte supprimé.
