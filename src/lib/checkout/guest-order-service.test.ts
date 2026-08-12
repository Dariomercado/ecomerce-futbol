import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { hashStatusCapability, rejectRawCardData } from "./contracts";
import { createGuestOrder } from "./guest-order-service";
import { reserveOrder } from "./order-repository";

const root = resolve(import.meta.dirname, "../../..");
const validOrder = {
  contact: { email: "buyer@example.com", fullName: "Buyer", phone: "+5491100000000" },
  shippingAddress: { addressLine1: "Street 1", city: "Buenos Aires", province: "Buenos Aires", postalCode: "1000" },
  lines: [{ productId: "11111111-1111-4111-8111-111111111111", variantId: null, quantity: 1 }],
};

const reservableOrder = {
  id: "22222222-2222-4222-8222-222222222222",
  userId: null,
  contact: validOrder.contact,
  shippingAddress: validOrder.shippingAddress,
  lines: [{ productId: validOrder.lines[0].productId, variantId: "33333333-3333-4333-8333-333333333333", quantity: 1, name: "Boot", unitPrice: 18000, lineTotal: 18000 }],
  currency: "ARS" as const,
  total: 18000,
  status: "PENDING_CONFIRMATION" as const,
};

function stripSqlComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "");
}

function createReservationPrisma(stock: number) {
  const state = { stock, orders: 0, options: undefined as unknown };
  const prisma = {
    async $transaction(callback: (tx: unknown) => Promise<unknown>, options: unknown) {
      const staged = { ...state };
      const tx = {
        productVariant: {
          updateMany: async ({ where }: { where: { stock: { gte: number } } }) => {
            if (staged.stock < where.stock.gte) return { count: 0 };
            staged.stock -= where.stock.gte;
            return { count: 1 };
          },
        },
        order: {
          create: async () => {
            staged.orders += 1;
            return { id: reservableOrder.id, lines: [], reservations: [] };
          },
        },
      };
      try {
        const result = await callback(tx);
        Object.assign(state, staged);
        state.options = options;
        return result;
      } catch (error) {
        state.options = options;
        throw error;
      }
    },
  };
  return { prisma, state };
}

describe("checkout payment foundation", () => {
  it("defines durable orders, immutable attempts, and stock reservations", () => {
    const schema = readFileSync(resolve(root, "prisma/schema.prisma"), "utf8");
    expect(schema).toContain("model Order");
    expect(schema).toContain("model PaymentAttempt");
    expect(schema).toContain("model StockReservation");
    expect(schema).toContain("@@unique([orderId, intentId])");
  });

  it("creates executable reservation tables and constraints rather than comment-only SQL", () => {
    const migration = readFileSync(resolve(root, "prisma/migrations/20260803_checkout_payments/migration.sql"), "utf8");
    const executableMigration = stripSqlComments(migration);
    const commentOnlyFixture = '-- CREATE TABLE "StockReservation" ();\n/* CREATE UNIQUE INDEX "StockReservation_orderId_variantId_key" ON "StockReservation"("orderId", "variantId"); */';
    expect(executableMigration).toMatch(/CREATE TABLE "StockReservation"/);
    expect(executableMigration).toMatch(/CREATE TABLE "PaymentAttempt"/);
    expect(executableMigration).toMatch(/CREATE UNIQUE INDEX "StockReservation_orderId_variantId_key"/);
    expect(executableMigration).toMatch(/ADD CONSTRAINT "StockReservation_variantId_fkey"/);
    expect(stripSqlComments(commentOnlyFixture)).not.toMatch(/CREATE (TABLE|UNIQUE INDEX)/);
  });

  it("hashes status capabilities and rejects raw card fields before catalog access", async () => {
    expect(hashStatusCapability("capability")).toMatch(/^[a-f0-9]{64}$/);
    expect(rejectRawCardData({ nested: { cardNumber: "4111111111111111" } })).toBeTruthy();
    expect(rejectRawCardData({ card: { number: "4111111111111111" } })).toBeTruthy();
    expect(rejectRawCardData({ card: { details: { number: "4111111111111111" } } })).toBeTruthy();
    expect(rejectRawCardData({ card: [{ details: { cvv: "123" } }] })).toBeTruthy();
    expect(rejectRawCardData({ product: { details: { number: 42 } } })).toBeNull();
    await expect(createGuestOrder({ ...validOrder, cvv: "123" } as unknown)).resolves.toMatchObject({
      error: { code: "INVALID_CHECKOUT" },
    });
  });

  it("uses a Serializable transaction and persists a reservation only after a conditional decrement", async () => {
    const { prisma, state } = createReservationPrisma(1);
    await expect(reserveOrder(prisma as never, reservableOrder, "hash")).resolves.toMatchObject({ id: reservableOrder.id });
    expect(state).toMatchObject({ stock: 0, orders: 1, options: { isolationLevel: "Serializable" } });
  });

  it("rolls back the reservation when the conditional stock decrement fails", async () => {
    const { prisma, state } = createReservationPrisma(0);
    await expect(reserveOrder(prisma as never, reservableOrder, "hash")).rejects.toThrow("STOCK_RESERVATION_UNAVAILABLE");
    expect(state).toMatchObject({ stock: 0, orders: 0, options: { isolationLevel: "Serializable" } });
  });
});
