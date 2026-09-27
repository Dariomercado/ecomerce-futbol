import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth/admin-authorization";
import { prisma } from "@/lib/prisma";
import { updateStaffAccess } from "./actions";

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const auth = await requireAdmin({}, "staff");
  if (!auth.authorized) return <p>Staff management access denied.</p>;
  const csrfToken = (await cookies()).get("admin_csrf_token")?.value;
  if (!csrfToken) return <p>Staff management is unavailable. Refresh this page to retry.</p>;
  const members = await prisma.adminMembership.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, supabaseUserId: true, role: true, isActive: true, revokedAt: true } });
  const { error } = await searchParams;
  return <section><h1 className="text-2xl font-semibold">Staff access</h1>
    <p className="my-4">Manage existing invited operators. New accounts are provisioned separately. You cannot demote or revoke your own administrator access.</p>
    {error && <p role="alert">Access could not be updated. Check the target and keep at least one active administrator.</p>}
    {members.map((member) => <form key={member.id} action={updateStaffAccess} className="my-4 flex flex-wrap items-center gap-3 rounded border p-4">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <input type="hidden" name="membershipId" value={member.id} />
      <span className="break-all">{member.supabaseUserId}{member.id === auth.membership.id ? " (you)" : ""}</span>
      <label>Role <select name="role" defaultValue={member.role} className="rounded border p-2"><option value="ADMIN">ADMIN</option><option value="EDITOR">EDITOR</option></select></label>
      <label>Access <select name="isActive" defaultValue={String(member.isActive && !member.revokedAt)} className="rounded border p-2"><option value="true">Active</option><option value="false">Revoked</option></select></label>
      <button type="submit" className="rounded border px-3 py-2">Save access</button>
    </form>)}
  </section>;
}
