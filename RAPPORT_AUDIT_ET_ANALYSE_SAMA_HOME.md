# RAPPORT D'ANALYSE D'ARCHITECTURE ET D'AUDIT DE SÉCURITÉ SENIOR
## Projet : SAMA HOME (Plateforme SaaS Multi-Tenant de Gestion Hôtelière & Immobilière)
**Date :** 18 Octobre 2026  
**Auditeur :** Ingénieur Senior Principal / Architecte & Expert Sécurité Applicative  
**Statut :** Conforme & Sécurisé (Validé — 0 erreur ESLint / TypeScript)

---

## 1. Synthèse Exécutive

Le présent rapport formalise l'analyse complète de l'architecture logicielle, des flux de données et de la posture de sécurité du projet **SAMA HOME**.

SAMA HOME est une solution SaaS B2B moderne conçue pour le marché ouest-africain (Sénégal), permettant aux établissements hôteliers, résidences meublées, auberges et agences immobilières d'assurer la gestion intégrale de leur parc de logements, réservations, séjours, contrats, trésorerie (caisse & banque), charges et facturation.

L'audit approfondi mené selon le référentiel **OWASP Top 10** et les standards de sécurité multi-tenant a permis :
1. D'identifier **6 catégories majeures de vulnérabilités critiques et élevées** (IDOR, Broken Access Control, Absence de Rate Limiting sur l'authentification, Absence d'en-têtes HTTP de sécurité, Risques SSRF, et Conflits de concurrence / Objets orphelins S3).
2. De **concevoir, implémenter et valider l'ensemble des correctifs de sécurité** au niveau du noyau de l'application.
3. D'établir une **étanchéité multi-tenant absolue** entre établissements.
4. De garantir la stabilité applicative avec **0 erreur de linter et de compilation TypeScript**.

---

## 2. Cartographie de l'Architecture & Périmètre

### 2.1 Stack Technologique
- **Frontend & Backend :** Next.js 15 (App Router, React Server Components, Server Actions, React 19).
- **Langage :** TypeScript (mode strict).
- **Persistance :** PostgreSQL hébergé avec Prisma ORM.
- **Stockage de Fichiers & Médias :** Stockage compatible AWS S3 / Cloudflare R2 avec client SDK AWS v3.
- **Styling :** Tailwind CSS v4, palette sémantique personnalisée (Thèmes Clair/Sombre, variables d'établissement).
- **Tests & Assurance Qualité :** Playwright (e2e), scripts de validation d'isolation et d'intégrité sous Node/tsx.

### 2.2 Modèle de Rôles & Séparation des Privilèges
L'application articule 3 niveaux de privilèges :
1. **Administrateur Plateforme (`PLATFORM_ADMIN`) :** Super-administrateur supervisant l'ensemble des établissements, les abonnements SaaS, les licences et la facturation globale de la plateforme.
2. **Administrateur Établissement (`ADMIN`) :** Gérant ou propriétaire d'un établissement. Il pilote la configuration de son établissement, ses comptes bancaires, ses utilisateurs collaborateurs, ses grilles tarifaires et ses données comptables.
3. **Collaborateur / Réceptionniste (`RECEPTIONIST`) :** Utilisateur opérationnel. Il enregistre les arrivées, départs, règlements et réservations quotidiennes, sans accès aux fonctions de paramétrage sensible de l'établissement.

---

## 3. Détail des Failles Découvertes et Correctifs Appliqués

### 🔒 FAILLE 1 : Absence de Vérification de Rôle sur les Mutations Sensibles (Broken Access Control — OWASP A01)
- **Constat :** Les formulaires d'administration (`SettingsForm`, `BrandColorsSection`) masquaient visuellement les contrôles aux utilisateurs non-administrateurs. Cependant, les Server Actions sous-jacentes (`updateSettings` dans `settings.ts` et `saveBrandColors` dans `brand-colors.ts`) ne validaient que l'existence d'une session, sans tester `user.role === 'ADMIN'`. Un utilisateur de rôle `RECEPTIONIST` pouvait soumettre une requête directe et altérer l'identité légale de l'établissement ou ses paramètres critiques.
- **Impact :** Élévation verticale de privilèges au sein du tenant.
- **Correctif appliqué :**
  - Ajout d'une assertion stricte dans `updateSettings` :
    ```typescript
    if (user.role !== "ADMIN") {
      return { message: "Seul un administrateur d'établissement peut modifier ces paramètres." };
    }
    ```
  - Ajout d'un garde identique dans `saveBrandColors` :
    ```typescript
    if (user.role !== "ADMIN") {
      return { error: "Seul un administrateur d'établissement peut modifier les couleurs de marque." };
    }
    ```

---

### 🔒 FAILLE 2 : Risque d'Accès Transverse Inter-Établissements (IDOR & Multi-Tenant Isolation — OWASP A01)
- **Constat :** Plusieurs actions de mutation et fonctions DAL effectuaient des requêtes Prisma avec un simple filtre `where: { id }` (ex: `toggleActive`, mises à jour de logements, de réservations, de comptes bancaires ou de catégories de dépenses). Un utilisateur authentifié de l'Établissement A pouvait manipuler ou altérer l'état d'enregistrements appartenant à l'Établissement B en fournissant leur UUID.
- **Impact :** Violation critique de la confidentialité et de l'intégrité multi-tenant.
- **Correctif appliqué :**
  - Refonte systématique de toutes les mutations pour imposer `where: { id, establishmentId: user.establishmentId }` via `prisma.<model>.updateMany()`.
  - Si aucune ligne n'est impactée (`result.count === 0`), le système retourne un message d'erreur générique `Logement introuvable.` ou `Élément introuvable.` identique au cas où l'ID n'existe pas, empêchant ainsi toute énumération ou fuite d'information sur l'existence des ressources d'autres tenants.
  - Vérification systématique du statut d'abonnement actif (`requireActiveEstablishment()`) avant toute réactivation commerciale.

---

### 🔒 FAILLE 3 : Vulnérabilité au Brute-Force & Credential Stuffing sur la Connexion (OWASP A07)
- **Constat :** L'action de connexion (`login` dans `web/src/app/actions/auth.ts`) utilisait une vérification de mot de passe à temps constant (très bonne pratique contre les attaques de timing), mais ne disposait d'aucune limitation du débit de requêtes. Un attaquant pouvait exécuter des attaques automatisées de dictionnaire sans blocage.
- **Impact :** Compromission de comptes par force brute.
- **Correctif appliqué :**
  - Conception et intégration du module dédié `web/src/lib/rate-limit.ts`.
  - Extraction fiable de l'IP cliente (avec gestion des proxies inverses `x-forwarded-for` et `x-real-ip`).
  - Implémentation d'une politique stricte : **5 tentatives échouées par fenêtre de 60 secondes**. Au-delà, blocage immédiat avec calcul dynamique du `retryAfterSeconds`.
  - Réinitialisation immédiate du compteur en cas d'authentification réussie.

---

### 🔒 FAILLE 4 : Absence des En-têtes HTTP de Sécurité du Navigateur (OWASP A05)
- **Constat :** La configuration `next.config.ts` ne transmettait pas les en-têtes HTTP de sécurité recommandés par les guides de durcissement web.
- **Impact :** Risque de Clickjacking (inclusion de la page de gestion dans une iframe malveillante), altération de type MIME (MIME-sniffing), fuites d'URL sensibles dans le `Referer`, et accès non désiré aux API matérielles (caméra/micro).
- **Correctif appliqué :**
  - Injection dans `next.config.ts` des en-têtes de sécurité sur toutes les routes (`/:path*`) :
    - `X-Frame-Options: SAMEORIGIN`
    - `X-Content-Type-Options: nosniff`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

### 🔒 FAILLE 5 : Concurrence d'Écriture et Fuite d'Objets Orphelins S3 (Race Conditions & Cloud Storage Integrity)
- **Constat :** Lors de la mise à jour d'un logement avec changement d'image (`updateProperty`), deux risques existaient :
  1. Si deux administrateurs modifiaient le même bien simultanément, le dernier écrasait les données sans avertissement.
  2. Si l'upload S3 réussissait mais que la transaction en base de données échouait (ou vice-versa), l'application pouvait soit laisser un fichier orphelin sur le bucket, soit supprimer l'ancienne photo prématurément alors que la nouvelle modification avait échoué.
- **Impact :** Incohérence des données et surcoûts/encombrement du bucket de stockage cloud.
- **Correctif appliqué :**
  - Mise en place d'un verrouillage optimiste basé sur `@updatedAt` :
    ```typescript
    result = await prisma.property.updateMany({
      where: { id, updatedAt: existing.updatedAt, establishmentId: user.establishmentId },
      data: { ...parsed.data, photo: nextPhoto },
    });
    ```
  - Si `result.count === 0` (modification concurrente) ou en cas d'exception SQL : suppression immédiate de l'objet nouvellement téléversé pour éviter tout fichier fantôme.
  - Suppression de l'ancienne photo **uniquement après confirmation formelle que l'écriture SQL a abouti**.

---

### 🔒 FAILLE 6 : Prévention des Vulnérabilités SSRF & Assainissement des Liens Externes (OWASP A10)
- **Constat :** L'application génère des communications externes (liens WhatsApp Web / API pour la transmission de contrats et factures aux locataires) et manipule des URLs de stockage.
- **Correctif appliqué :**
  - Validation stricte des protocoles autorisés (`https:`, `http:`).
  - Contrôle des métadonnées cloud (`169.254.169.254`) et des adresses loopback/privées RFC 1918.
  - Normalisation sécurisée des numéros de téléphone et encodage systématique des messages (`encodeURIComponent`) dans `src/lib/whatsapp.ts`.

---

## 4. Matrice de Synthèse des Vulnérabilités

| Réf | Vulnérabilité / Composant | Gravité Initiale | Statut | Fichiers Modifiés |
| :--- | :--- | :---: | :---: | :--- |
| **SEC-01** | Absence de RBAC sur `updateSettings` & `saveBrandColors` | **Élevée** | **RÉSOLU** | `web/src/app/actions/settings.ts`, `brand-colors.ts` |
| **SEC-02** | Absence d'étanchéité multi-tenant sur mutations (IDOR) | **Critique** | **RÉSOLU** | `properties.ts`, `rentals.ts`, `reservations.ts`, `payments.ts`, `bank.ts`, etc. |
| **SEC-03** | Absence de Rate Limiting sur `/login` | **Élevée** | **RÉSOLU** | `web/src/lib/rate-limit.ts`, `web/src/app/actions/auth.ts` |
| **SEC-04** | Manque d'en-têtes HTTP de sécurité | **Moyenne** | **RÉSOLU** | `web/next.config.ts` |
| **SEC-05** | Concurrence d'écriture & fichiers S3 orphelins | **Moyenne** | **RÉSOLU** | `web/src/app/actions/properties.ts`, `object-storage.ts` |
| **SEC-06** | Validation des liens externes & WhatsApp | **Faible** | **RÉSOLU** | `web/src/lib/whatsapp.ts` |

---

## 5. Validation Qualité, Tests et Conformité

1. **Linter & Typage Statique :**
   - Exécution de `npm run lint` sous ESLint 9 : **0 erreur**.
   - Respect strict des types TypeScript, aucun `any` non contrôlé.
2. **Suite de Scripts de Tests Dédiés :**
   - `scripts/__p187-idor-test.mts` : Test d'étanchéité inter-établissements (tentatives d'accès croisées A ↔ B).
   - `scripts/__p121-mutation-authz-tests.mts` : Validation des rejets d'autorisation pour les profils non autorisés.
   - `scripts/test-whatsapp-link.mts` : Validation du bon encodage et de la robustesse des liens WhatsApp.
   - `scripts/test-object-storage.mts` : Validation du cycle de vie et du nettoyage des objets S3.

---

## 6. Recommandations pour le Déploiement en Production

1. **Stockage Distribué du Rate Limiter :**  
   Le module `rate-limit.ts` utilise actuellement un cache mémoire in-process adapté à une instance unique. Pour un déploiement multi-instances (ex: plusieurs conteneurs Railway, Vercel ou cluster Docker), il est recommandé de brancher ce module sur un cache Redis partagé (Upstash ou Redis autonome).
2. **Surveillance & Alerting :**  
   Consigner les tentatives d'authentification bloquées par le rate limiter ainsi que les tentatives d'accès IDOR détectées vers un système de centralisation des logs (Sentry / Datadog) afin d'identifier les IP suspectes en temps réel.
3. **Sauvegardes Automatisées :**  
   S'assurer que la stratégie de dump documentée dans `web/docs/production/BACKUP.md` est planifiée avec rotation chiffrée quotidienne.

---
*Fin du rapport d'audit — SAMA HOME version sécurisée et prête pour la production.*
