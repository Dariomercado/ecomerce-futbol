import "server-only";

import { prisma } from "@/lib/prisma";

export type AdminMembership = {
  id: string;
  supabaseUserId: string;
};

export type AdminMembershipRepository = {
  findActiveBySupabaseUserId(supabaseUserId: string): Promise<AdminMembership | null>;
};

type AdminMembershipModel = {
  findFirst(args: {
    where: { supabaseUserId: string; isActive: true; revokedAt: null };
    select: { id: true; supabaseUserId: true };
  }): Promise<AdminMembership | null>;
};

type AdminMembershipPrismaClient = {
  adminMembership: AdminMembershipModel;
};

/**
 * Resolves the repository-owned authorization record on every sensitive
 * request. The narrow local type keeps this source type-safe before a newly
 * added Prisma migration has regenerated the local client.
 */
export function createPrismaAdminMembershipRepository(
  client: AdminMembershipPrismaClient = prisma as unknown as AdminMembershipPrismaClient,
): AdminMembershipRepository {
  return {
    findActiveBySupabaseUserId(supabaseUserId) {
      return client.adminMembership.findFirst({
        where: { supabaseUserId, isActive: true, revokedAt: null },
        select: { id: true, supabaseUserId: true },
      });
    },
  };
}
