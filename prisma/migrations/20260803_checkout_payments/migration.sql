-- Durable guest orders, attempts, and stock reservations for payment submission.
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_CONFIRMATION', 'PAYMENT_PENDING', 'PAID', 'PAYMENT_FAILED');
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('CREATED', 'DISPATCHING', 'PENDING', 'PAID', 'FAILED');
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED');

CREATE TABLE "Order" (
  "id" UUID NOT NULL, "userId" UUID, "contactEmail" TEXT NOT NULL, "contactFullName" TEXT NOT NULL,
  "contactPhone" TEXT NOT NULL, "shippingAddress" JSONB NOT NULL, "currency" "CurrencyCode" NOT NULL DEFAULT 'ARS',
  "total" INTEGER NOT NULL, "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
  "statusCapabilityHash" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OrderLine" (
  "id" UUID NOT NULL, "orderId" UUID NOT NULL, "productId" UUID NOT NULL, "variantId" UUID,
  "name" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "unitPrice" INTEGER NOT NULL, "lineTotal" INTEGER NOT NULL,
  CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PaymentAttempt" (
  "id" UUID NOT NULL, "orderId" UUID NOT NULL, "intentId" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL,
  "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'CREATED', "payloadHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StockReservation" (
  "id" UUID NOT NULL, "orderId" UUID NOT NULL, "variantId" UUID NOT NULL, "quantity" INTEGER NOT NULL,
  "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentAttempt_idempotencyKey_key" ON "PaymentAttempt"("idempotencyKey");
CREATE UNIQUE INDEX "PaymentAttempt_orderId_intentId_key" ON "PaymentAttempt"("orderId", "intentId");
CREATE UNIQUE INDEX "StockReservation_orderId_variantId_key" ON "StockReservation"("orderId", "variantId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "OrderLine_orderId_idx" ON "OrderLine"("orderId");
CREATE INDEX "PaymentAttempt_orderId_status_idx" ON "PaymentAttempt"("orderId", "status");
CREATE INDEX "StockReservation_variantId_status_idx" ON "StockReservation"("variantId", "status");
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
