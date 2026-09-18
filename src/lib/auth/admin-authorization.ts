import "server-only";

import { createSupabaseServerClient, loadSupabaseServerConfig } from "./supabase-server";
import type { SupabaseServerConfig } from "./supabase-server";
import { createPrismaAdminMembershipRepository } from "./admin-membership-repository";
import type { AdminMembership, AdminMembershipRepository } from "./admin-membership-repository";

type Environment = Record<string, string | undefined>;

type AuthenticatedUser = { id: string };

export type AdminAuthorizationResult =
  | { authorized: true; user: AuthenticatedUser; membership: AdminMembership }
  | {
      authorized: false;
      status: 401 | 403 | 503;
      code: "ADMIN_SESSION_REQUIRED" | "ADMIN_ACCESS_DENIED" | "ADMIN_AUTH_UNAVAILABLE";
    };

export type AdminAuthClient = {
  auth: {
    getUser(): Promise<{
      data: { user: AuthenticatedUser | null };
      error: unknown | null;
    }>;
  };
};

type RequireAdminDependencies = {
  env?: Environment;
  createClient?: (config: SupabaseServerConfig) => Promise<AdminAuthClient> | AdminAuthClient;
  membershipRepository?: AdminMembershipRepository;
};

/**
 * Server-side authorization boundary for future human admin routes.
 *
 * Supabase verifies identity; the application database owns authorization.
 * Every invocation reads the active membership so revocation takes effect on
 * the next sensitive request. User metadata and JWT role claims never decide
 * access here.
 */
export async function requireAdmin(dependencies: RequireAdminDependencies = {}): Promise<AdminAuthorizationResult> {
  const env = dependencies.env ?? process.env;
  const config = loadSupabaseServerConfig(env);

  if (!config) {
    return unavailable();
  }

  try {
    const client = await (dependencies.createClient ?? createSupabaseServerClient)(config);
    const { data, error } = await client.auth.getUser();

    if (error) return unavailable();
    if (!data.user) {
      return { authorized: false, status: 401, code: "ADMIN_SESSION_REQUIRED" };
    }
    if (!isUuid(data.user.id)) {
      return unavailable();
    }

    const membership = await (dependencies.membershipRepository ?? createPrismaAdminMembershipRepository())
      .findActiveBySupabaseUserId(data.user.id);
    if (!membership) {
      return { authorized: false, status: 403, code: "ADMIN_ACCESS_DENIED" };
    }

    return { authorized: true, user: { id: data.user.id }, membership };
  } catch {
    return unavailable();
  }
}

function unavailable(): AdminAuthorizationResult {
  return { authorized: false, status: 503, code: "ADMIN_AUTH_UNAVAILABLE" };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
