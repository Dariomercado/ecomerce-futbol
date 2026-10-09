import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyOtp = vi.fn();
const exchangeCodeForSession = vi.fn();
const signOut = vi.fn();
const createSupabaseServerClient = vi.fn();

vi.mock("@/lib/auth/supabase-server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/supabase-server")>()),
  createSupabaseServerClient,
}));

describe("operator auth routes", () => {
  afterEach(() => vi.restoreAllMocks());
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

  it("rejects a callback without confirmation credentials", async () => {
    const { GET } = await import("@/app/auth/confirm/route");
    const response = await GET(new Request("http://localhost/auth/confirm"));
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it.each([
    [{ code: "pkce_code_verifier_not_found" }, "pkce_verifier_missing"],
    [{ name: "AuthPKCECodeVerifierMissingError" }, "pkce_verifier_missing"],
    [{ code: "bad_code_verifier" }, "pkce_verifier_mismatch"],
    [{ code: "otp_expired" }, "link_invalid_or_expired"],
    [{ code: "flow_state_not_found" }, "link_invalid_or_expired"],
    [{ code: "flow_state_expired" }, "link_invalid_or_expired"],
    [{ code: "over_request_rate_limit" }, "rate_limited"],
    [{ name: "AuthRetryableFetchError" }, "provider_unavailable"],
    [{ code: "request_timeout" }, "provider_unavailable"],
    [{ code: "validation_failed" }, "confirmation_rejected"],
    [{ code: "secret-provider-value", name: "secret-name" }, "confirmation_rejected"],
  ])("logs only a safe category for returned failure %s", async (error, category) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    exchangeCodeForSession.mockResolvedValueOnce({ error: { ...error, message: "secret-message", cookie: "secret-cookie" } });
    const { GET } = await import("@/app/auth/confirm/route");
    const response = await GET(new Request("http://localhost/auth/confirm?code=secret-code"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/auth/sign-in?error=confirmation_failed");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(warn).toHaveBeenCalledExactlyOnceWith("auth_confirmation_failed", { category });
  });

  it("keeps OTP failures generic and logs no token hash or raw exception", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    verifyOtp.mockRejectedValueOnce(new Error("secret-provider-message"));
    const { GET } = await import("@/app/auth/confirm/route");
    const response = await GET(new Request("http://localhost/auth/confirm?token_hash=secret-token&type=email"));
    expect(response.headers.get("location")).toBe("http://localhost/auth/sign-in?error=confirmation_failed");
    expect(warn).toHaveBeenCalledExactlyOnceWith("auth_confirmation_failed", { category: "unexpected_failure" });
  });

  it("preserves failure redirects even when diagnostic logging throws", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => { throw new Error("logger unavailable"); });
    exchangeCodeForSession.mockResolvedValueOnce({ error: { code: "otp_expired" } });
    const { GET } = await import("@/app/auth/confirm/route");
    const response = await GET(new Request("http://localhost/auth/confirm?code=secret-code"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost/auth/sign-in?error=confirmation_failed");
  });
});
