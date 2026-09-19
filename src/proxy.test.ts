import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const createServerClient = vi.fn();

vi.mock("@supabase/ssr", () => ({ createServerClient }));

describe("Supabase cookie refresh proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    createServerClient.mockImplementation((_url: string, _key: string, options: { cookies: { setAll: (cookies: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => void } }) => ({
      auth: {
        getUser: async () => {
          options.cookies.setAll([{ name: "sb-access-token", value: "refreshed-token", options: { httpOnly: true } }]);
          return getUser();
        },
      },
    }));
  });

  it("copies refreshed Supabase cookies onto the response for protected requests", async () => {
    const { proxy } = await import("@/proxy");

    const response = await proxy(new NextRequest("http://localhost/admin"));

    expect(response.cookies.get("sb-access-token")?.value).toBe("refreshed-token");
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(response.headers.get("cache-control")).toContain("private");
  });
});
