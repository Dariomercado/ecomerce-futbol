-- Post-payment operation state and idempotency ledger
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';
CREATE TYPE "PostPaymentOperationType" AS ENUM ('CANCEL', 'REFUND');
CREATE TYPE "PostPaymentOperationStatus" AS ENUM ('RUNNING', 'COMPLETED');
CREATE TABLE "PostPaymentOperation" (
  "id" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "type" "PostPaymentOperationType" NOT NULL,
  "status" "PostPaymentOperationStatus" NOT NULL DEFAULT 'RUNNING',
  "idempotencyKey" TEXT NOT NULL,
  "providerOrderId" TEXT,
  "providerStatus" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "PostPaymentOperation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PostPaymentOperation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PostPaymentOperation_idempotencyKey_key" ON "PostPaymentOperation"("idempotencyKey");
CREATE UNIQUE INDEX "PostPaymentOperation_orderId_type_key" ON "PostPaymentOperation"("orderId", "type");
CREATE INDEX "PostPaymentOperation_orderId_status_idx" ON "PostPaymentOperation"("orderId", "status");
