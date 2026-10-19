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

## 6. GESTION DES PROBLÈMES TECHNIQUES COURANTS (TROUBLESHOOTING & RECETTES)

### 6.1 Verrouillage de Fichiers sous Windows (`EPERM` / `EBUSY` sur `prisma generate` et `next build`)
* **Problème :** `Error: EPERM: operation not permitted, mkdir '...\src\generated\prisma\models'` ou `EBUSY: resource busy or locked`.
* **Cause :** Sous Windows, le serveur de développement (`next dev`) ou des processus d'arrière-plan Node orphelins maintiennent des verrous sur les fichiers générés par Prisma.
* **Solution universelle :** Avant toute regénération Prisma ou build de production, tuer systématiquement les processus Node orphelins :
  ```powershell
  Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
  ```
  Puis ré-exécuter `npx prisma generate` ou `npm run build`.

### 6.2 Décalage de Version Majeure PostgreSQL (`pg_dump` 16 vs Serveur 17)
* **Problème :** Échec du script de backup avec `pg_dump: erreur : annulation à cause de la différence des versions. version du serveur : 17.11 ; pg_dump version : 16.14`.
* **Règle PostgreSQL :** `pg_dump` refuse formellement de dumper un serveur de version majeure supérieure à la sienne.
* **Solutions :**
  1. Dans les scripts d'automatisation (`backup-db.mts`), capturer `error.stderr || error.message` au lieu de tronquer avec `split('\n')[0]`, afin d'afficher immédiatement la cause réelle.
  2. Sur l'hôte ou conteneur de sauvegarde, installer la version cliente correspondant à la version du serveur (PostgreSQL 17 pour Supabase v17).
  3. En environnement cloud managé, doubler les sauvegardes par les snapshots natifs de l'hébergeur.

### 6.3 Bug du Double Header & Isolation du Shell (`shell-switcher.tsx`)
* **Problème :** Un utilisateur connecté visitant la page d'accueil `/` voyait deux en-têtes superposés (l'en-tête de la landing page + l'AppShell interne de l'application).
* **Cause :** Condition erronée basée sur la session : `isStandalonePublic = (pathname === "/" && !userRole)`. Dès qu'un cookie existait, l'AppShell enveloppait la landing page.
* **Solution :** Découplage strict entre la route et l'état de session :
  ```typescript
  const isStandalonePublic =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/register/") ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/forgot-password/");
  ```
  La landing page est un contrat d'affichage public isolé : elle ne doit JAMAIS être enveloppée par `AppShell`, même en présence d'une session valide.

### 6.4 Interception des Images par le Proxy/Middleware Next.js
* **Problème :** Les images des pages publiques (/login, /register) retournent une erreur `The requested resource isn't a valid image`.
* **Cause :** Le middleware Next.js interceptait les requêtes internes de Next Image (`/_next/image?url=/images/...`) et les redirigeait vers `/login` avec un code 307. Next.js recevait du HTML au lieu des octets de l'image.
* **Solution :** Exclure obligatoirement les dossiers d'images et d'actifs statiques dans le matcher :
  ```typescript
  export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|brand/|images/).*)"],
  };
  ```

### 6.5 Concurrence d'Écriture & Fichiers Orphelins S3 / Object Storage
* **Problème :** Écrasement silencieux lors d'éditions concurrentes, ou fichiers orphelins sur le bucket cloud si l'écriture SQL échoue après l'upload.
* **Solution :**
  1. **Upload-first sécurisé :** Téléverser le nouvel objet sur S3. Si la transaction SQL échoue, appeler immédiatement `deleteImageObject(upload.key)`.
  2. **Verrouillage optimiste (`@updatedAt`) :**
     ```typescript
     const result = await prisma.property.updateMany({
       where: { id, updatedAt: existing.updatedAt, establishmentId: user.establishmentId },
       data: { ...data, photo: nextPhoto }
     });
     if (result.count === 0) {
       await deleteImageObject(upload.key); // Annulation de l'upload orphelin
       return { message: "Ce document a été modifié par un autre utilisateur. Rechargez la page." };
     }
     ```
  3. **Suppression différée :** Ne supprimer l'ancienne photo du bucket S3 qu'APRÈS confirmation de l'écriture en base (`result.count === 1`).

### 6.6 Suppression en Cascade & Intégrité Référentielle (Prisma Transactions)
* **Problème :** Violations de clés étrangères (`ForeignKeyConstraintViolation`) lors de la suppression de ressources complexes liées (logements, baux, réservations, paiements).
* **Solution :** Encapsuler dans `prisma.$transaction(async (tx) => ...)` avec vérification des règles métier préalables (ex: interdiction formelle de supprimer un logement si un séjour est actif `status === "ACTIVE"`), puis suppression ordonnée : paiements rattachés -> extensions de location -> locations -> réservations -> tarifs -> ressource principale -> nettoyage S3.

### 6.7 Bouton Flottant Permanent (FAB) Responsive
* **Problème :** Sur smartphone, un bouton flottant standard avec libellé long encombre l'écran et masque le pied de page.
* **Solution :**
  * Position : `fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40`.
  * Libellé adaptatif : Texte complet sur desktop/tablette (`Accéder à l'application`), format pilule compacte sur mobile (`Accéder à l'app`).
  * `overflow-x-hidden` sur le conteneur racine pour interdire tout défilement horizontal.

### 6.8 Pages d'Erreur Personnalisées (`not-found.tsx` & `error.tsx`)
* Toujours inclure dans `src/app/` :
  * `not-found.tsx` : Page 404 respectant la charte graphique avec boutons de redirection vers `/` et `/dashboard`.
  * `error.tsx` : Error boundary client avec journalisation d'erreur et bouton de réessai.

---

## 7. MÉTHODOLOGIE DE TRAVAIL RAPIDE (FAST DELIVERY)

1. **Validation locale systématique** : Avant tout déploiement ou push Git, exécuter `npm run build` en local pour vérifier que les 0 erreurs TypeScript et 0 warnings ESLint sont respectés.
2. **Scripts d'hygiène préventive** : Toujours inclure dans `scripts/` :
   * `backup-db.mts` : Sauvegarde instantanée avant mise en production.
   * `restore-db.mts` : Restauration d'urgence.
3. **Tester sur une base propre** : Les bugs d'authentification et de mot de passe oublié doivent toujours être testés à la fois sur un compte actif, un compte inexistant et un compte supprimé.

