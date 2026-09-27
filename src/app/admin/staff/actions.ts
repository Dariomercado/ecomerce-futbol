"use server";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin-authorization";
import { requireAdminRequestIntegrity } from "@/lib/auth/request-integrity";
import { changeStaffAccess } from "@/lib/auth/staff-management";

export async function updateStaffAccess(form: FormData) {
  const incoming = await headers();
  const store = await cookies();
  const forwarded = new Headers(incoming);
  forwarded.set("cookie", store.getAll().map(({ name, value }) => `${name}=${value}`).join("; "));
  const submittedToken = form.get("csrfToken");
  forwarded.set("x-csrf-token", typeof submittedToken === "string" ? submittedToken : "");
  const integrity = requireAdminRequestIntegrity({ method: "POST", headers: forwarded });
  if (!integrity.valid) redirect(`/admin/staff?error=${integrity.code}`);
  const auth = await requireAdmin({}, "staff");
  if (!auth.authorized) redirect(`/admin/staff?error=${auth.code}`);
  const targetId = form.get("membershipId");
  const role = form.get("role");
  const active = form.get("isActive");
  if (typeof targetId !== "string" || !/^[0-9a-f-]{36}$/i.test(targetId) || (role !== "ADMIN" && role !== "EDITOR") || (active !== "true" && active !== "false")) redirect("/admin/staff?error=STAFF_INPUT_INVALID");
  try {
    await changeStaffAccess(auth.membership.id, auth.user.id, targetId, role, active === "true");
  } catch (error) {
    const safe = ["STAFF_NOT_FOUND", "STAFF_SELF_CHANGE_DENIED", "STAFF_LAST_ADMIN_REQUIRED", "ADMIN_ACCESS_DENIED"];
    const code = error instanceof Error && safe.includes(error.message) ? error.message : "STAFF_SAVE_UNAVAILABLE";
    redirect(`/admin/staff?error=${code}`);
  }
  revalidatePath("/admin/staff");
  redirect("/admin/staff");
}
