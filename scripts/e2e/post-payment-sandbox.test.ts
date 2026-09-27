import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { assertSandboxExecutionIntent, invokeOperation, readConfig } from "./post-payment-sandbox.mjs";

const cookie = "sb-sandbox-auth-token=mock-session; admin_csrf_token=mock-csrf";

describe("post-payment sandbox session transport", () => {
  beforeEach(() => {
    const env = {
      NODE_ENV: "test", DATABASE_URL: "mock-database", MERCADO_PAGO_ACCESS_TOKEN: "mock-provider",
      MERCADO_PAGO_WEBHOOK_SECRET: "mock-webhook", E2E_POST_PAYMENT_BASE_URL: "https://sandbox.example",
      E2E_POST_PAYMENT_ORDER_ID: "order/one", E2E_POST_PAYMENT_ADMIN_COOKIE: cookie,
      E2E_POST_PAYMENT_CSRF_TOKEN: "mock-csrf", E2E_POST_PAYMENT_WEBHOOK_SIGNATURE: "mock-signature",
      E2E_POST_PAYMENT_WEBHOOK_BODY_BASE64: Buffer.from(JSON.stringify({ application_id: "app", type: "order", data: { id: "provider" } })).toString("base64"),
      E2E_POST_PAYMENT_ENVIRONMENT: "sandbox", E2E_POST_PAYMENT_CONFIRM: "SANDBOX_ONLY",
      E2E_POST_PAYMENT_SECRET_SOURCE: "secret-manager",
    };
    Object.entries(env).forEach(([name, value]) => vi.stubEnv(name, value));
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it.each(["cancel", "refund"] as const)("sends %s with session and request-integrity headers, never bearer credentials", async (operation) => {
    const response = new Response("{}", { status: 200 });
    const fetch = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetch);
    expect(await invokeOperation(readConfig(operation))).toBe(response);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(`https://sandbox.example/api/internal/orders/order%2Fone/${operation}`, {
      method: "POST", redirect: "error", headers: { cookie, origin: "https://sandbox.example", "sec-fetch-site": "same-origin", "x-csrf-token": "mock-csrf" },
    });
  });

  it.each(["E2E_POST_PAYMENT_ADMIN_COOKIE", "E2E_POST_PAYMENT_CSRF_TOKEN"])("requires %s even with a legacy token", (name) => {
    vi.stubEnv("POST_PAYMENT_ADMIN_TOKEN", "obsolete"); vi.stubEnv(name, "");
    expect(() => readConfig("cancel")).toThrow(`E2E_ENVIRONMENT_MISSING_${name}`);
  });
  it.each([
    ["admin_csrf_token=mock-csrf", "E2E_ADMIN_SESSION_COOKIE_REQUIRED"],
    ["sb-sandbox-auth-token=mock; admin_csrf_token=other", "E2E_ADMIN_CSRF_MISMATCH"],
    ["sb-sandbox-auth-token=mock; admin_csrf_token=mock-csrf; Path=/", "E2E_ADMIN_COOKIE_INVALID"],
    [cookie + "; admin_csrf_token=mock-csrf", "E2E_ADMIN_COOKIE_INVALID"],
    [cookie + "\r\nx-header: injected", "E2E_ADMIN_COOKIE_INVALID"],
  ])("rejects malformed/incomplete session input without echoing it", (value, code) => {
    vi.stubEnv("E2E_POST_PAYMENT_ADMIN_COOKIE", value);
    expect(() => readConfig("refund")).toThrow(code);
  });
  it("preserves chunked Supabase session cookies", () => {
    vi.stubEnv("E2E_POST_PAYMENT_ADMIN_COOKIE", "sb-sandbox-auth-token.0=chunk-one; sb-sandbox-auth-token.1=chunk-two; admin_csrf_token=mock-csrf");
    expect(readConfig("cancel").adminCookie).toContain("auth-token.1=chunk-two");
  });
  it.each(["https://user:secret@sandbox.example", "https://sandbox.example/path", "https://sandbox.example?query=secret", "https://sandbox.example#secret", "not-a-url", "http://remote.example"])("refuses an unsafe target", (value) => {
    vi.stubEnv("E2E_POST_PAYMENT_BASE_URL", value);
    expect(() => readConfig("cancel")).toThrow(/^E2E_BASE_URL/);
  });
  it("accepts an isolated localhost origin", () => {
    vi.stubEnv("E2E_POST_PAYMENT_BASE_URL", "http://localhost:3000");
    expect(readConfig("cancel").baseUrl).toBe("http://localhost:3000");
  });
  it("preserves the explicit execution guard", () => {
    expect(() => assertSandboxExecutionIntent([])).toThrow("E2E_EXECUTION_NOT_CONFIRMED");
    expect(() => assertSandboxExecutionIntent(["--execute"])).not.toThrow();
  });
  it.each([
    ["NODE_ENV", "production", "E2E_PRODUCTION_MODE_FORBIDDEN"],
    ["E2E_POST_PAYMENT_ENVIRONMENT", "live", "E2E_SANDBOX_ENVIRONMENT_REQUIRED"],
    ["E2E_POST_PAYMENT_CONFIRM", "", "E2E_SANDBOX_CONFIRMATION_REQUIRED"],
    ["E2E_POST_PAYMENT_SECRET_SOURCE", "file", "E2E_SECRET_SOURCE_INVALID"],
  ])("preserves fail-closed sandbox guards", (name, value, code) => {
    vi.stubEnv(name, value);
    expect(() => assertSandboxExecutionIntent(["--execute"])).toThrow(code);
  });
});

