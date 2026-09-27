import { describe, expect, it, vi } from "vitest";
import { changeStaffAccess } from "./staff-management";
const actor = { id: "actor", supabaseUserId: "user", role: "ADMIN", isActive: true, revokedAt: null };
function setup(target = { ...actor, id: "target", supabaseUserId: "other" }, count = 2) {
  const tx = { $executeRaw: vi.fn(), adminMembership: { findUnique: vi.fn().mockResolvedValueOnce(actor).mockResolvedValueOnce(target), count: vi.fn().mockResolvedValue(count), update: vi.fn() }, adminAuditEvent: { create: vi.fn() } };
  const client = { $transaction: async (fn: (value: typeof tx) => unknown) => fn(tx) };
  return { tx, client };
}
describe("staff management", () => {
  it("locks before revalidating actor and atomically audits a role change", async () => {
    const { tx, client } = setup();
    await changeStaffAccess("actor", "user", "target", "EDITOR", true, client as never);
    expect(tx.$executeRaw).toHaveBeenCalledOnce();
    expect(tx.adminMembership.update).toHaveBeenCalledWith({ where: { id: "target" }, data: { role: "EDITOR", isActive: true, revokedAt: null } });
    expect(tx.adminAuditEvent.create).toHaveBeenCalledOnce();
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.adminMembership.findUnique.mock.invocationCallOrder[0]);
  });
  it("rejects self-demotion and self-revocation", async () => {
    for (const active of [true, false]) {
      const { client, tx } = setup(actor);
      await expect(changeStaffAccess("actor", "user", "actor", "EDITOR", active, client as never)).rejects.toThrow("STAFF_SELF_CHANGE_DENIED");
      expect(tx.adminMembership.update).not.toHaveBeenCalled();
    }
  });
  it("rejects removing the last active administrator", async () => {
    const { client, tx } = setup(undefined, 1);
    await expect(changeStaffAccess("actor", "user", "target", "EDITOR", true, client as never)).rejects.toThrow("STAFF_LAST_ADMIN_REQUIRED");
    expect(tx.adminMembership.update).not.toHaveBeenCalled();
  });
  it("rechecks revocation after locking", async () => {
    const { client, tx } = setup();
    tx.adminMembership.findUnique.mockReset().mockResolvedValue({ ...actor, role: "EDITOR" });
    await expect(changeStaffAccess("actor", "user", "target", "ADMIN", true, client as never)).rejects.toThrow("ADMIN_ACCESS_DENIED");
    expect(tx.adminMembership.update).not.toHaveBeenCalled();
  });
});
