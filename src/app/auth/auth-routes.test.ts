import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyOtp = vi.fn();
const exchangeCodeForSession = vi.fn();
const signOut = vi.fn();
const createSupabaseServerClient = vi.fn();

vi.mock("@/lib/auth/supabase-server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/supabase-server")>()),
  createSupabaseServerClient,
}));

describe("operator auth routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    createSupabaseServerClient.mockResolvedValue({ auth: { verifyOtp, exchangeCodeForSession, signOut } });
    verifyOtp.mockResolvedValue({ data: { session: { user: { id: "user-1" } } }, error: null });
    exchangeCodeForSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } }, error: null });
    signOut.mockResolvedValue({ error: null });
  });

  it("exchanges a PKCE callback code and redirects to the fixed admin path", async () => {
    const { GET } = await import("@/app/auth/confirm/route");

    const response = await GET(new Request("http://localhost/auth/confirm?code=pkce-code"));

    expect(response.status).toBe(303);
    expect(new URL(response.headers.get("location") ?? "http://localhost").pathname).toBe("/admin");
    expect(exchangeCodeForSession).toHaveBeenCalledWith("pkce-code");
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it.each(["email", "invite", "magiclink"])("confirms an allowed %s link and redirects to the fixed admin path", async (type) => {
    const { GET } = await import("@/app/auth/confirm/route");

    const response = await GET(new Request(`http://localhost/auth/confirm?token_hash=token-123&type=${type}`));

    expect(response.status).toBe(303);
    expect(new URL(response.headers.get("location") ?? "http://localhost").pathname).toBe("/admin");
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "token-123", type });
  });

  it("rejects unsupported confirmation types without creating an operator session", async () => {
    const { GET } = await import("@/app/auth/confirm/route");

    const response = await GET(new Request("http://localhost/auth/confirm?token_hash=token-123&type=recovery"));

    expect(response.status).toBe(400);
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("signs out locally and redirects to sign-in", async () => {
    const { POST } = await import("@/app/auth/sign-out/route");

    const response = await POST(new Request("http://localhost/auth/sign-out", { method: "POST" }));

    expect(response.status).toBe(303);
    expect(new URL(response.headers.get("location") ?? "http://localhost").pathname).toBe("/auth/sign-in");
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
