import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const prismaDirectory = path.dirname(fileURLToPath(import.meta.url));

describe("admin membership and audit persistence", () => {
  it("declares the authorization and immutable audit models with their required indexes", async () => {
    const schema = await readFile(path.join(prismaDirectory, "schema.prisma"), "utf8");

    expect(schema).toContain("model AdminMembership");
    expect(schema).toContain("supabaseUserId String            @unique @db.Uuid");
    expect(schema).toContain("model AdminAuditEvent");
    expect(schema).toContain("@@index([actorSupabaseUserId, createdAt])");
    expect(schema).toContain("@@index([entityType, entityId, createdAt])");
  });

  it("enables RLS, removes Data API role grants, and rejects audit updates or deletes", async () => {
    const migration = await readFile(
      path.join(prismaDirectory, "migrations", "20260916000000_admin_membership_audit_foundation", "migration.sql"),
      "utf8",
    );

    expect(migration).toContain('ALTER TABLE "AdminMembership" ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('ALTER TABLE "AdminAuditEvent" ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('REVOKE ALL ON TABLE "AdminMembership", "AdminAuditEvent" FROM anon');
    expect(migration).toContain('REVOKE ALL ON TABLE "AdminMembership", "AdminAuditEvent" FROM authenticated');
    expect(migration).toContain('BEFORE UPDATE OR DELETE ON "AdminAuditEvent"');
  });
});
