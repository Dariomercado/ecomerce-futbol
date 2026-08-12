-- Durable provider evidence, reconciliation scheduling, and verified webhook receipt identity.
CREATE TYPE "WebhookReceiptState" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'RETRYABLE_FAILED');
ALTER TABLE "PaymentAttempt"
  ADD COLUMN "providerOrderId" TEXT,
  ADD COLUMN "providerPaymentId" TEXT,
  ADD COLUMN "providerOrderStatus" TEXT,
  ADD COLUMN "providerPaymentStatus" TEXT,
  ADD COLUMN "providerStatusDetail" TEXT,
  ADD COLUMN "providerUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "reconcileCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "nextReconcileAt" TIMESTAMP(3),
  ADD COLUMN "reconcileLeaseUntil" TIMESTAMP(3),
  ADD COLUMN "reconcileLastError" TEXT;
CREATE UNIQUE INDEX "PaymentAttempt_providerOrderId_key" ON "PaymentAttempt"("providerOrderId");
CREATE INDEX "PaymentAttempt_status_nextReconcileAt_id_idx" ON "PaymentAttempt"("status", "nextReconcileAt", "id");
CREATE TABLE "WebhookReceipt" (
  "id" UUID NOT NULL, "provider" TEXT NOT NULL, "applicationId" TEXT NOT NULL, "topic" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL, "resourceId" TEXT NOT NULL, "action" TEXT, "liveMode" BOOLEAN,
  "providerCreatedAt" TIMESTAMP(3), "requestId" TEXT, "signatureTimestamp" TEXT, "signatureVersion" TEXT,
  "rawBodySha256" TEXT NOT NULL, "state" "WebhookReceiptState" NOT NULL DEFAULT 'RECEIVED',
  "leaseUntil" TIMESTAMP(3), "attemptCount" INTEGER NOT NULL DEFAULT 0, "lastAttemptAt" TIMESTAMP(3),
  "lastErrorCode" TEXT, "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "processedAt" TIMESTAMP(3),
  CONSTRAINT "WebhookReceipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WebhookReceipt_provider_applicationId_topic_notificationId_key" ON "WebhookReceipt"("provider", "applicationId", "topic", "notificationId");
CREATE INDEX "WebhookReceipt_state_leaseUntil_idx" ON "WebhookReceipt"("state", "leaseUntil");
