import "server-only";

import { prisma } from "@/lib/prisma";

const maxContextFields = 12;
const maxContextKeyLength = 64;
const maxContextStringLength = 160;

export type AdminAuditOutcome = "ATTEMPTED" | "SUCCEEDED" | "FAILED";
export type AdminAuditContextValue = boolean | number | string | null;
export type AdminAuditContext = Record<string, AdminAuditContextValue>;

export type AppendAdminAuditEvent = {
  membershipId: string;
  actorSupabaseUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  outcome: AdminAuditOutcome;
  context: AdminAuditContext;
};

export type AdminAuditRepository = {
  append(event: AppendAdminAuditEvent): Promise<void>;
};

type AdminAuditEventModel = {
  create(args: {
    data: AppendAdminAuditEvent;
  }): Promise<unknown>;
};

type AdminAuditPrismaClient = {
  adminAuditEvent: AdminAuditEventModel;
};

/**
 * Appends bounded operational evidence. The database trigger makes the
 * persisted events immutable; this repository intentionally exposes no update
 * or delete operation.
 */
export function createPrismaAdminAuditRepository(
  client: AdminAuditPrismaClient = prisma as unknown as AdminAuditPrismaClient,
): AdminAuditRepository {
  return {
    async append(event) {
      await client.adminAuditEvent.create({ data: validateAuditEvent(event) });
    },
  };
}

function validateAuditEvent(event: AppendAdminAuditEvent): AppendAdminAuditEvent {
  if (!isUuid(event.membershipId) || !isUuid(event.actorSupabaseUserId)) {
    throw new Error("Invalid admin audit actor");
  }
  if (!isBoundedIdentifier(event.action) || !isBoundedIdentifier(event.entityType) || !isBoundedIdentifier(event.entityId)) {
    throw new Error("Invalid admin audit target");
  }

  return { ...event, context: normalizeContext(event.context) };
}

function normalizeContext(context: AdminAuditContext): AdminAuditContext {
  const entries = Object.entries(context);
  if (entries.length > maxContextFields) throw new Error("Admin audit context is too large");

  return Object.fromEntries(entries.map(([key, value]) => {
    if (!/^[a-z][a-zA-Z0-9_]*$/.test(key) || key.length > maxContextKeyLength || /token|secret|password|authorization|cookie/i.test(key)) {
      throw new Error("Admin audit context key is not permitted");
    }
    if (typeof value === "string" && value.length > maxContextStringLength) {
      throw new Error("Admin audit context value is too large");
    }
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean" && value !== null) {
      throw new Error("Admin audit context value is invalid");
    }
    return [key, value];
  }));
}

function isBoundedIdentifier(value: string): boolean {
  return value.length > 0 && value.length <= 128;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
