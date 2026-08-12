import { describe, expect, it, vi } from "vitest";

import { reconcileProviderOrder } from "./service";

const evidence = { id: "mp-order", externalReference: "local-order", status: "in_process", statusDetail: "pending", updatedAt: "2026-08-05T10:00:00.000Z", payment: { id: "mp-payment", status: "in_process", statusDetail: "pending" } };

describe("provider reconciliation", () => {
  it("performs provider lookup before the database evidence transition", async () => {
    const events: string[] = [];
    const repository = { applyProviderEvidence: vi.fn(async () => { events.push("transaction"); }), markReconcilePending: vi.fn() };
    const gateway = { getOrder: vi.fn(async () => { events.push("lookup"); return evidence; }) };
    await reconcileProviderOrder({ repository, gateway, attempt: { id: "attempt", orderId: "local-order", providerOrderId: "mp-order" } });
    expect(events).toEqual(["lookup", "transaction"]);
  });

  it.each([undefined, { ...evidence, externalReference: "another-order" }, { ...evidence, payment: null }])("keeps missing, mismatched, or invalid evidence pending", async (providerEvidence) => {
    const repository = { applyProviderEvidence: vi.fn(), markReconcilePending: vi.fn() };
    await reconcileProviderOrder({ repository, gateway: { getOrder: vi.fn(async () => providerEvidence) as never }, attempt: { id: "attempt", orderId: "local-order", providerOrderId: "mp-order" } });
    expect(repository.applyProviderEvidence).not.toHaveBeenCalled();
    expect(repository.markReconcilePending).toHaveBeenCalledWith("attempt", expect.any(String));
  });
});

