import { beforeEach, expect, it, vi } from "vitest";
const { auth, members, orders, cookieStore } = vi.hoisted(() => ({ auth: vi.fn(), members: vi.fn(), orders: vi.fn(), cookieStore: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: cookieStore }));
vi.mock("@/lib/auth/admin-authorization", () => ({ requireAdmin: auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { adminMembership: { findMany: members }, order: { findMany: orders } } }));
vi.mock("./staff/actions", () => ({ updateStaffAccess: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); auth.mockResolvedValue({ authorized: false }); });
it("does not query staff data for unauthorized direct navigation", async () => {
  const { default: Page } = await import("./staff/page");
  await Page({ searchParams: Promise.resolve({}) });
  expect(auth).toHaveBeenCalledWith({}, "staff"); expect(members).not.toHaveBeenCalled();
});
it("does not query order data for unauthorized direct navigation", async () => {
  const { default: Page } = await import("./orders/page");
  await Page();
  expect(auth).toHaveBeenCalledWith({}, "orders"); expect(orders).not.toHaveBeenCalled();
});

it("renders the issued CSRF token as an independently submitted hidden field", async () => {
  auth.mockResolvedValue({ authorized: true, membership: { id: "actor" } });
  cookieStore.mockResolvedValue({ get: () => ({ value: "issued-token" }) });
  members.mockResolvedValue([{ id: "target", supabaseUserId: "user", role: "EDITOR", isActive: true, revokedAt: null }]);
  const { default: Page } = await import("./staff/page");
  const page = await Page({ searchParams: Promise.resolve({}) });
  const { renderToStaticMarkup } = await import("react-dom/server");
  expect(renderToStaticMarkup(page)).toContain('name="csrfToken" value="issued-token"');
});
