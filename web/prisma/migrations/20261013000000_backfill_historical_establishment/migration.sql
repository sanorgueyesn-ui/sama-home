-- D12-P151 — Correctif de backfill multi-tenant.
--
-- Positionnée délibérément ENTRE 20261012000000_add_multi_tenant_notifications_subscriptions
-- (ajoute establishmentId nullable sur 18 tables + la table Establishment,
-- sans aucun backfill) et 20261014120000_make_settings_establishmentid_required
-- (rend Settings.establishmentId obligatoire). Sans ce correctif, cette
-- dernière échoue dès qu'une ligne Settings historique préexiste — preuve
-- directe obtenue en lecture seule sur Railway (D12-P146/P148) : 1 ligne
-- Settings réelle ("RESIDENCE ATLANTIQUE"), 3 utilisateurs réels, données
-- métier réelles dans 9 autres tables.
--
-- Portée : UNIQUEMENT les lignes dont establishmentId est encore NULL au
-- moment précis où cette migration s'exécute (entre 18 et 19). Aucune
-- ligne déjà rattachée n'est jamais touchée. Idempotent par construction :
-- si rejouée sur un état déjà corrigé, la boucle ne trouve plus aucune
-- ligne Settings orpheline et ne crée donc rien de plus.
--
-- Établissement historique : créé à partir de Settings.establishmentName
-- (donnée métier réelle déjà en base, jamais inventée), statut ACTIVE —
-- légitime et déjà supporté par le code réel (registerEstablishment() crée
-- déjà des établissements directement ACTIVE en mode auto-approbation).
--
-- Abonnement historique : même formule que createTrialSubscriptionAndAudit()
-- (src/lib/establishment-activation.ts) — trialStartedAt = l'instant réel
-- d'exécution de cette migration (jamais une date choisie à l'avance),
-- currentPeriodEnd = trialStartedAt + trialDurationMonths, lu depuis
-- PricingSettings si une ligne existe déjà, sinon la même constante
-- DEFAULT_TRIAL_DURATION_MONTHS = 2 déjà utilisée par le code applicatif.
--
-- Exceptions légitimes jamais rattachées (conformes aux règles réelles du
-- projet, vérifiées dans D12-P148/P149) :
--   - User.isPlatformAdmin = true (compte de plateforme)
--   - AuditLog dont l'action est une action de plateforme connue
-- Aucune des deux catégories n'a pu exister avant cette migration (le code
-- qui les écrit dépend de tables que CETTE migration et la 18 créent pour
-- la première fois) — confirmé empiriquement sur Railway : les 10 lignes
-- AuditLog réelles actuelles ne portent que des actions métier.

DO $$
DECLARE
  settings_row RECORD;
  new_establishment_id TEXT;
  trial_months INTEGER;
  trial_started TIMESTAMP(3);
  period_end TIMESTAMP(3);
BEGIN
  FOR settings_row IN
    SELECT id, "establishmentName" FROM "Settings" WHERE "establishmentId" IS NULL
  LOOP
    new_establishment_id := gen_random_uuid()::text;
    trial_started := now();

    -- Même source que le code applicatif réel : PricingSettings si déjà
    -- configuré, sinon la constante DEFAULT_TRIAL_DURATION_MONTHS (2),
    -- jamais une valeur choisie arbitrairement pour ce correctif.
    SELECT "trialDurationMonths" INTO trial_months
    FROM "PricingSettings" WHERE id = 'singleton';
    IF trial_months IS NULL THEN
      trial_months := 2;
    END IF;
    period_end := trial_started + (trial_months || ' months')::interval;

    -- 1. Établissement historique.
    INSERT INTO "Establishment" (id, name, status, "createdAt", "updatedAt")
    VALUES (new_establishment_id, settings_row."establishmentName", 'ACTIVE', trial_started, trial_started);

    -- 2. Abonnement historique — même formule que createTrialSubscriptionAndAudit().
    INSERT INTO "Subscription" (id, "establishmentId", "trialStartedAt", "currentPeriodEnd", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, new_establishment_id, trial_started, period_end, trial_started, trial_started);

    -- 3. Settings — la ligne qui a déclenché cette boucle.
    UPDATE "Settings" SET "establishmentId" = new_establishment_id WHERE id = settings_row.id;

    -- 4. Utilisateurs historiques — jamais les comptes de plateforme.
    UPDATE "User"
    SET "establishmentId" = new_establishment_id
    WHERE "establishmentId" IS NULL AND "isPlatformAdmin" = false;

    -- 5. Données métier — toujours inconditionnel, jamais de cas légitime NULL.
    UPDATE "Client" SET "establishmentId" = new_establishment_id WHERE "establishmentId" IS NULL;
    UPDATE "Property" SET "establishmentId" = new_establishment_id WHERE "establishmentId" IS NULL;
    UPDATE "Tariff" SET "establishmentId" = new_establishment_id WHERE "establishmentId" IS NULL;
    UPDATE "Reservation" SET "establishmentId" = new_establishment_id WHERE "establishmentId" IS NULL;
    UPDATE "Rental" SET "establishmentId" = new_establishment_id WHERE "establishmentId" IS NULL;
    UPDATE "RentalExtension" SET "establishmentId" = new_establishment_id WHERE "establishmentId" IS NULL;
    UPDATE "Payment" SET "establishmentId" = new_establishment_id WHERE "establishmentId" IS NULL;
    UPDATE "ExpenseCategory" SET "establishmentId" = new_establishment_id WHERE "establishmentId" IS NULL;
    UPDATE "Expense" SET "establishmentId" = new_establishment_id WHERE "establishmentId" IS NULL;
    UPDATE "CashRegister" SET "establishmentId" = new_establishment_id WHERE "establishmentId" IS NULL;
    UPDATE "CashSession" SET "establishmentId" = new_establishment_id WHERE "establishmentId" IS NULL;
    UPDATE "CashCorrection" SET "establishmentId" = new_establishment_id WHERE "establishmentId" IS NULL;
    UPDATE "BankAccount" SET "establishmentId" = new_establishment_id WHERE "establishmentId" IS NULL;
    UPDATE "BankTransfer" SET "establishmentId" = new_establishment_id WHERE "establishmentId" IS NULL;
    UPDATE "TransferSchedule" SET "establishmentId" = new_establishment_id WHERE "establishmentId" IS NULL;

    -- 6. AuditLog — jamais les actions de plateforme (liste exhaustive des
    -- actions réellement écrites avec establishmentId: null dans le code,
    -- voir establishment-approval.ts / platform-settings.ts / subscription.ts).
    UPDATE "AuditLog"
    SET "establishmentId" = new_establishment_id
    WHERE "establishmentId" IS NULL
      AND "action" NOT IN (
        'ESTABLISHMENT_APPROVED',
        'ESTABLISHMENT_AUTO_APPROVED',
        'ESTABLISHMENT_REJECTED',
        'ESTABLISHMENT_SUSPENDED',
        'ESTABLISHMENT_REACTIVATED',
        'PLATFORM_AUTO_APPROVAL_ENABLED',
        'PLATFORM_AUTO_APPROVAL_DISABLED',
        'PRICING_SETTINGS_UPDATED',
        'SUBSCRIPTION_PAYMENT_CONFIRMED',
        'SUBSCRIPTION_PAYMENT_REQUESTED'
      );
  END LOOP;
END $$;
