import { describe, expect, it, vi } from "vitest";

import { createPrismaAdminAuditRepository } from "./audit-repository";

const event = {
  membershipId: "11111111-1111-4111-8111-111111111111",
  actorSupabaseUserId: "22222222-2222-4222-8222-222222222222",
  action: "CATALOG_PRODUCT_UPDATED",
  entityType: "Product",
  entityId: "33333333-3333-4333-8333-333333333333",
  outcome: "SUCCEEDED" as const,
  context: { changedFields: "name,price", correlationCode: "catalog_123" },
};

describe("Prisma admin audit repository", () => {
  it("appends a bounded event and exposes no mutation API", async () => {
    const create = vi.fn().mockResolvedValue({ id: "audit-1" });
    const repository = createPrismaAdminAuditRepository({ adminAuditEvent: { create } });

    await expect(repository.append(event)).resolves.toBeUndefined();
    expect(create).toHaveBeenCalledWith({ data: event });
    expect("update" in repository).toBe(false);
    expect("delete" in repository).toBe(false);
  });

  it("rejects secret-like and oversized context before persistence", async () => {
    const create = vi.fn();
    const repository = createPrismaAdminAuditRepository({ adminAuditEvent: { create } });

    await expect(repository.append({ ...event, context: { accessToken: "must-not-be-audited" } })).rejects.toThrow("not permitted");
    await expect(repository.append({ ...event, context: { correlationCode: "x".repeat(161) } })).rejects.toThrow("too large");
    expect(create).not.toHaveBeenCalled();
  });
});
