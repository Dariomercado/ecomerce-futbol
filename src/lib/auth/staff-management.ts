import "server-only";
import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";

export async function changeStaffAccess(actorId: string, userId: string, targetId: string, role: "ADMIN" | "EDITOR", isActive: boolean, client: PrismaClient = prisma) {
  if (!["ADMIN", "EDITOR"].includes(role) || typeof isActive !== "boolean") throw new Error("STAFF_INPUT_INVALID");
  return client.$transaction(async (tx) => {
    // Serialize every membership write, including maintenance SQL, before reading invariants.
    await tx.$executeRaw`LOCK TABLE "AdminMembership" IN SHARE ROW EXCLUSIVE MODE`;
    const actor = await tx.adminMembership.findUnique({ where: { id: actorId } });
    if (!actor || actor.supabaseUserId !== userId || actor.role !== "ADMIN" || !actor.isActive || actor.revokedAt) throw new Error("ADMIN_ACCESS_DENIED");
    const target = await tx.adminMembership.findUnique({ where: { id: targetId } });
    if (!target) throw new Error("STAFF_NOT_FOUND");
    if (actorId === targetId && (role !== "ADMIN" || !isActive)) throw new Error("STAFF_SELF_CHANGE_DENIED");
    if (target.role === "ADMIN" && target.isActive && !target.revokedAt && (role !== "ADMIN" || !isActive)) {
      if (await tx.adminMembership.count({ where: { role: "ADMIN", isActive: true, revokedAt: null } }) <= 1) throw new Error("STAFF_LAST_ADMIN_REQUIRED");
    }
    await tx.adminMembership.update({ where: { id: targetId }, data: { role, isActive, revokedAt: isActive ? null : new Date() } });
    await tx.adminAuditEvent.create({ data: { membershipId: actorId, actorSupabaseUserId: userId, action: "STAFF_ACCESS_CHANGED", entityType: "AdminMembership", entityId: targetId, outcome: "SUCCEEDED", context: { previousRole: target.role, role, isActive } } });
  });
}
