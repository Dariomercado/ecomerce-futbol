import { beforeEach, expect, it, vi } from "vitest";
const { auth, change, getHeaders, getCookies, revalidate } = vi.hoisted(() => ({ auth: vi.fn(), change: vi.fn(), getHeaders: vi.fn(), getCookies: vi.fn(), revalidate: vi.fn() }));
vi.mock("next/headers", () => ({ headers: getHeaders, cookies: getCookies }));
vi.mock("next/cache", () => ({ revalidatePath: revalidate }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(path); } }));
vi.mock("@/lib/auth/admin-authorization", () => ({ requireAdmin: auth }));
vi.mock("@/lib/auth/staff-management", () => ({ changeStaffAccess: change }));
import { updateStaffAccess } from "./actions";
beforeEach(() => {
  vi.clearAllMocks();
  getHeaders.mockResolvedValue(new Headers({ origin: "https://shop.example.com", "sec-fetch-site": "same-origin" }));
  getCookies.mockResolvedValue({ get: () => ({ value: "csrf" }), getAll: () => [{ name: "admin_csrf_token", value: "csrf" }] });
  vi.stubEnv("APP_ORIGIN", "https://shop.example.com");
  auth.mockResolvedValue({ authorized: true, membership: { id: "actor" }, user: { id: "user" } });
});
function form() { const value = new FormData(); value.set("csrfToken", "csrf"); value.set("membershipId", "11111111-1111-4111-8111-111111111111"); value.set("role", "EDITOR"); value.set("isActive", "false"); return value; }
it("rejects CSRF before authorization or mutation", async () => {
  const input = form(); input.delete("csrfToken");
  await expect(updateStaffAccess(input)).rejects.toThrow("ADMIN_CSRF_INVALID");
  expect(auth).not.toHaveBeenCalled(); expect(change).not.toHaveBeenCalled();
});
it("rejects EDITOR before mutation", async () => {
  auth.mockResolvedValue({ authorized: false, code: "ADMIN_ACCESS_DENIED" });
  await expect(updateStaffAccess(form())).rejects.toThrow("ADMIN_ACCESS_DENIED");
  expect(auth).toHaveBeenCalledWith({}, "staff"); expect(change).not.toHaveBeenCalled();
});
it("forwards verified actor, never a browser-supplied actor", async () => {
  await expect(updateStaffAccess(form())).rejects.toThrow("/admin/staff");
  expect(change).toHaveBeenCalledWith("actor", "user", "11111111-1111-4111-8111-111111111111", "EDITOR", false);
  expect(revalidate).toHaveBeenCalledWith("/admin/staff");
});
it("rejects unsupported roles", async () => {
  const input = form(); input.set("role", "OWNER");
  await expect(updateStaffAccess(input)).rejects.toThrow("STAFF_INPUT_INVALID");
  expect(change).not.toHaveBeenCalled();
});

it("rejects a mismatched form token even when a valid cookie is automatically attached", async () => {
  const input = form(); input.set("csrfToken", "attacker");
  await expect(updateStaffAccess(input)).rejects.toThrow("ADMIN_CSRF_INVALID");
  expect(auth).not.toHaveBeenCalled(); expect(change).not.toHaveBeenCalled();
});
it("rejects cross-origin submissions even with a matching form token", async () => {
  getHeaders.mockResolvedValue(new Headers({ origin: "https://attacker.example", "sec-fetch-site": "cross-site" }));
  await expect(updateStaffAccess(form())).rejects.toThrow("ADMIN_ORIGIN_INVALID");
  expect(auth).not.toHaveBeenCalled(); expect(change).not.toHaveBeenCalled();
});
