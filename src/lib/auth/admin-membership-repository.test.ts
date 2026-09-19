import { describe, expect, it, vi } from "vitest";

import { createPrismaAdminMembershipRepository } from "./admin-membership-repository";

const supabaseUserId = "11111111-1111-4111-8111-111111111111";

describe("Prisma admin membership repository", () => {
  it("queries only active, unrevoked memberships by immutable Supabase ID", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "membership-1", supabaseUserId });
    const repository = createPrismaAdminMembershipRepository({ adminMembership: { findFirst } });

    await expect(repository.findActiveBySupabaseUserId(supabaseUserId)).resolves.toEqual({ id: "membership-1", supabaseUserId });
    expect(findFirst).toHaveBeenCalledWith({
      where: { supabaseUserId, isActive: true, revokedAt: null },
      select: { id: true, supabaseUserId: true },
    });
  });
});
