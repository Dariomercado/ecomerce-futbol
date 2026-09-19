import { describe, expect, it, vi } from "vitest";

import { requireAdmin } from "./admin-authorization";
import type { AdminMembershipRepository } from "./admin-membership-repository";

const activeUserId = "11111111-1111-4111-8111-111111111111";
const revokedUserId = "22222222-2222-4222-8222-222222222222";
const membership = { id: "33333333-3333-4333-8333-333333333333", supabaseUserId: activeUserId };
const configuredEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
};

function authClient(user: { id: string } | null, error: unknown = null) {
  return {
    auth: {
      getUser: async () => ({ data: { user }, error }),
    },
  };
}

function membershipRepository(findActiveBySupabaseUserId: AdminMembershipRepository["findActiveBySupabaseUserId"]): AdminMembershipRepository {
  return { findActiveBySupabaseUserId };
}

describe("requireAdmin", () => {
  it("returns 401 when no verified Supabase session is present", async () => {
    await expect(requireAdmin({
      env: configuredEnvironment,
      createClient: () => authClient(null),
      membershipRepository: membershipRepository(vi.fn()),
    })).resolves.toEqual({
      authorized: false,
      status: 401,
      code: "ADMIN_SESSION_REQUIRED",
    });
  });

  it("returns 403 when a verified user has no active membership, regardless of metadata claims", async () => {
    const findActiveBySupabaseUserId = vi.fn().mockResolvedValue(null);

    await expect(requireAdmin({
      env: configuredEnvironment,
      createClient: () => authClient({ id: revokedUserId, app_metadata: { role: "admin" } } as { id: string }),
      membershipRepository: membershipRepository(findActiveBySupabaseUserId),
    })).resolves.toEqual({
      authorized: false,
      status: 403,
      code: "ADMIN_ACCESS_DENIED",
    });
    expect(findActiveBySupabaseUserId).toHaveBeenCalledWith(revokedUserId);
  });

  it("checks membership on every request so a revocation takes effect next time", async () => {
    const findActiveBySupabaseUserId = vi.fn()
      .mockResolvedValueOnce(membership)
      .mockResolvedValueOnce(null);
    const dependencies = {
      env: configuredEnvironment,
      createClient: () => authClient({ id: activeUserId }),
      membershipRepository: membershipRepository(findActiveBySupabaseUserId),
    };

    await expect(requireAdmin(dependencies)).resolves.toEqual({ authorized: true, user: { id: activeUserId }, membership });
    await expect(requireAdmin(dependencies)).resolves.toEqual({
      authorized: false,
      status: 403,
      code: "ADMIN_ACCESS_DENIED",
    });
    expect(findActiveBySupabaseUserId).toHaveBeenCalledTimes(2);
  });

  it("fails closed with 503 for incomplete configuration, invalid identities, membership failures, or Supabase failures", async () => {
    await expect(requireAdmin({ env: {} })).resolves.toEqual({
      authorized: false,
      status: 503,
      code: "ADMIN_AUTH_UNAVAILABLE",
    });
    await expect(requireAdmin({
      env: configuredEnvironment,
      createClient: () => authClient({ id: "not-a-uuid" }),
      membershipRepository: membershipRepository(vi.fn()),
    })).resolves.toEqual({
      authorized: false,
      status: 503,
      code: "ADMIN_AUTH_UNAVAILABLE",
    });
    await expect(requireAdmin({
      env: configuredEnvironment,
      createClient: () => authClient({ id: activeUserId }),
      membershipRepository: membershipRepository(vi.fn().mockRejectedValue(new Error("database unavailable"))),
    })).resolves.toEqual({
      authorized: false,
      status: 503,
      code: "ADMIN_AUTH_UNAVAILABLE",
    });
    await expect(requireAdmin({
      env: configuredEnvironment,
      createClient: () => authClient(null, new Error("identity unavailable")),
      membershipRepository: membershipRepository(vi.fn()),
    })).resolves.toEqual({
      authorized: false,
      status: 503,
      code: "ADMIN_AUTH_UNAVAILABLE",
    });
  });
});
