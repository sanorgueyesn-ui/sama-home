-- Lot 3B — demandes de paiement manuel / prolongation soumises à seconde validation.
--
-- Migration STRICTEMENT ADDITIVE : crée deux types et une table. Elle ne lit, ne modifie et ne
-- supprime aucune ligne existante, et n'ajoute aucune colonne à une table existante
-- (SubscriptionPayment, Subscription, User et Establishment sont inchangés).
--
-- Retour arrière (uniquement tant qu'aucune demande n'a été appliquée en production ; les
-- règlements créés à l'approbation restent dans "SubscriptionPayment" quoi qu'il arrive) :
--   DROP TABLE "SubscriptionChangeRequest";
--   DROP TYPE "SubscriptionChangeStatus";
--   DROP TYPE "SubscriptionChangeKind";
--
-- Les contraintes CHECK ci-dessous ne sont pas modélisées par Prisma : ne jamais régénérer ce
-- fichier automatiquement. Chaque expression est écrite sans dépendre de la logique à trois
-- valeurs de SQL : un CHECK dont l'expression vaut NULL est ACCEPTÉ par PostgreSQL, donc chaque
-- colonne obligatoire d'une branche est testée explicitement avec IS NOT NULL.

-- CreateEnum
CREATE TYPE "SubscriptionChangeKind" AS ENUM ('MANUAL_PAYMENT', 'PROLONGATION');

-- CreateEnum
CREATE TYPE "SubscriptionChangeStatus" AS ENUM ('PENDING_SECOND_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "SubscriptionChangeRequest" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "kind" "SubscriptionChangeKind" NOT NULL,
    "status" "SubscriptionChangeStatus" NOT NULL DEFAULT 'PENDING_SECOND_APPROVAL',
    "amountFcfa" INTEGER,
    "periodMonths" INTEGER,
    "days" INTEGER,
    "reference" TEXT,
    "reason" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "requestedByUserId" TEXT,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "appliedPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionChangeRequest_appliedPaymentId_key" ON "SubscriptionChangeRequest"("appliedPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionChangeRequest_requestedByUserId_idempotencyKey_key" ON "SubscriptionChangeRequest"("requestedByUserId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "SubscriptionChangeRequest_status_createdAt_idx" ON "SubscriptionChangeRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SubscriptionChangeRequest_establishmentId_idx" ON "SubscriptionChangeRequest"("establishmentId");

-- CreateIndex
CREATE INDEX "SubscriptionChangeRequest_requestedByUserId_idx" ON "SubscriptionChangeRequest"("requestedByUserId");

-- CreateIndex
CREATE INDEX "SubscriptionChangeRequest_decidedByUserId_idx" ON "SubscriptionChangeRequest"("decidedByUserId");

-- AddForeignKey
ALTER TABLE "SubscriptionChangeRequest" ADD CONSTRAINT "SubscriptionChangeRequest_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey (SET NULL : la purge d'un utilisateur ne doit jamais échouer)
ALTER TABLE "SubscriptionChangeRequest" ADD CONSTRAINT "SubscriptionChangeRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey (SET NULL : idem)
ALTER TABLE "SubscriptionChangeRequest" ADD CONSTRAINT "SubscriptionChangeRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey (RESTRICT : un règlement appliqué ne peut pas être supprimé sous une demande)
ALTER TABLE "SubscriptionChangeRequest" ADD CONSTRAINT "SubscriptionChangeRequest_appliedPaymentId_fkey" FOREIGN KEY ("appliedPaymentId") REFERENCES "SubscriptionPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 1. Champs cohérents avec le type de demande (bornes validées).
--    MANUAL_PAYMENT : montant 100..10 000 000, durée 1..36 mois, pas de jours.
--    PROLONGATION   : 1..366 jours, ni montant ni durée en mois.
ALTER TABLE "SubscriptionChangeRequest" ADD CONSTRAINT "SubscriptionChangeRequest_kind_fields_check" CHECK (
    (
        "kind" = 'MANUAL_PAYMENT'
        AND "amountFcfa" IS NOT NULL AND "amountFcfa" BETWEEN 100 AND 10000000
        AND "periodMonths" IS NOT NULL AND "periodMonths" BETWEEN 1 AND 36
        AND "days" IS NULL
    )
    OR
    (
        "kind" = 'PROLONGATION'
        AND "days" IS NOT NULL AND "days" BETWEEN 1 AND 366
        AND "amountFcfa" IS NULL
        AND "periodMonths" IS NULL
    )
);

-- 2. Textes bornés (caractères Unicode, comme la validation applicative) ; clé d'idempotence
--    au format validé. Les colonnes nullables NULL sont acceptées (absence de valeur).
ALTER TABLE "SubscriptionChangeRequest" ADD CONSTRAINT "SubscriptionChangeRequest_text_check" CHECK (
    ("reference" IS NULL OR char_length("reference") <= 200)
    AND ("reason" IS NULL OR char_length("reason") <= 500)
    AND ("decisionReason" IS NULL OR char_length("decisionReason") <= 500)
    AND char_length("idempotencyKey") BETWEEN 16 AND 64
    AND "idempotencyKey" ~ '^[A-Za-z0-9_-]+$'
);

-- 3. Statut cohérent avec les champs de décision. Pas de décideur exigé pour APPROVED/REJECTED/
--    CANCELLED : "decidedByUserId" passe à NULL si l'utilisateur est supprimé (SET NULL), et un
--    CHECK l'exigeant ferait échouer la purge. L'application l'écrit toujours.
ALTER TABLE "SubscriptionChangeRequest" ADD CONSTRAINT "SubscriptionChangeRequest_status_fields_check" CHECK (
    (
        "status" = 'PENDING_SECOND_APPROVAL'
        AND "decidedAt" IS NULL
        AND "decidedByUserId" IS NULL
        AND "decisionReason" IS NULL
        AND "appliedPaymentId" IS NULL
    )
    OR
    (
        "status" IN ('APPROVED', 'REJECTED', 'CANCELLED')
        AND "decidedAt" IS NOT NULL
    )
);

-- 4. Un rejet porte un motif non vide (espaces, tabulations et retours à la ligne exclus).
ALTER TABLE "SubscriptionChangeRequest" ADD CONSTRAINT "SubscriptionChangeRequest_reject_reason_check" CHECK (
    "status" <> 'REJECTED'
    OR (
        "decisionReason" IS NOT NULL
        AND char_length(btrim("decisionReason", E' \t\r\n')) > 0
    )
);

-- 5. Règlement appliqué : exactement un pour une demande APPROVED de type MANUAL_PAYMENT,
--    aucun dans tous les autres cas (prolongation, attente, rejet, annulation).
ALTER TABLE "SubscriptionChangeRequest" ADD CONSTRAINT "SubscriptionChangeRequest_applied_payment_check" CHECK (
    (
        "status" = 'APPROVED' AND "kind" = 'MANUAL_PAYMENT'
        AND "appliedPaymentId" IS NOT NULL
    )
    OR
    (
        NOT ("status" = 'APPROVED' AND "kind" = 'MANUAL_PAYMENT')
        AND "appliedPaymentId" IS NULL
    )
);

-- 6. Le demandeur ne décide jamais (approbation, rejet) de sa propre demande. Appliqué quand les
--    deux identités sont présentes : après la suppression de l'un d'eux (SET NULL), le CHECK
--    reste satisfait.
ALTER TABLE "SubscriptionChangeRequest" ADD CONSTRAINT "SubscriptionChangeRequest_no_self_decision_check" CHECK (
    "status" NOT IN ('APPROVED', 'REJECTED')
    OR "requestedByUserId" IS NULL
    OR "decidedByUserId" IS NULL
    OR "decidedByUserId" <> "requestedByUserId"
);

-- 7. Seul le demandeur annule sa demande (ou le système, décideur NULL, lors de la purge du
--    demandeur).
ALTER TABLE "SubscriptionChangeRequest" ADD CONSTRAINT "SubscriptionChangeRequest_cancel_by_requester_check" CHECK (
    "status" <> 'CANCELLED'
    OR "decidedByUserId" IS NULL
    OR "requestedByUserId" IS NULL
    OR "decidedByUserId" = "requestedByUserId"
);
