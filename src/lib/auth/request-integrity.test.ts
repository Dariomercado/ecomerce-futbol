import { describe, expect, it } from "vitest";

import { getAdminCsrfCookieName, requireAdminRequestIntegrity } from "./request-integrity";

const env = { APP_ORIGIN: "https://shop.example.com" };
const csrf = "csrf-value-from-the-admin-shell";

function unsafeRequest(headers: HeadersInit = {}) {
  return new Request("https://shop.example.com/api/internal/catalog/products", {
    method: "POST",
    headers: {
      origin: env.APP_ORIGIN,
      "sec-fetch-site": "same-origin",
      cookie: `${getAdminCsrfCookieName()}=${csrf}`,
      "x-csrf-token": csrf,
      ...headers,
    },
  });
}

describe("admin mutation request integrity", () => {
  it("accepts unsafe requests only with exact origin, non-cross-site metadata, and a matching CSRF cookie/header", () => {
    expect(requireAdminRequestIntegrity(unsafeRequest(), env)).toEqual({ valid: true });
    expect(requireAdminRequestIntegrity(unsafeRequest({ "sec-fetch-site": "same-site" }), env)).toEqual({ valid: true });
  });

  it("rejects missing or non-exact origins before a route can reach collaborators", () => {
    expect(requireAdminRequestIntegrity(unsafeRequest({ origin: "https://attacker.example" }), env)).toEqual({
      valid: false,
      status: 403,
      code: "ADMIN_ORIGIN_INVALID",
    });
    expect(requireAdminRequestIntegrity(unsafeRequest({ origin: "" }), env)).toEqual({
      valid: false,
      status: 403,
      code: "ADMIN_ORIGIN_INVALID",
    });
  });

  it("rejects cross-site, missing, and malformed Fetch Metadata", () => {
    expect(requireAdminRequestIntegrity(unsafeRequest({ "sec-fetch-site": "cross-site" }), env)).toMatchObject({
      valid: false,
      code: "ADMIN_FETCH_METADATA_INVALID",
    });
    expect(requireAdminRequestIntegrity(unsafeRequest({ "sec-fetch-site": "" }), env)).toMatchObject({
      valid: false,
      code: "ADMIN_FETCH_METADATA_INVALID",
    });
  });

  it("rejects absent or mismatched CSRF evidence", () => {
    expect(requireAdminRequestIntegrity(unsafeRequest({ cookie: "", "x-csrf-token": "" }), env)).toMatchObject({
      valid: false,
      code: "ADMIN_CSRF_INVALID",
    });
    expect(requireAdminRequestIntegrity(unsafeRequest({ "x-csrf-token": "attacker-value" }), env)).toMatchObject({
      valid: false,
      code: "ADMIN_CSRF_INVALID",
    });
  });

  it("does not require CSRF evidence for safe reads", () => {
    expect(requireAdminRequestIntegrity(new Request("https://shop.example.com/admin"), env)).toEqual({ valid: true });
  });

  it("fails closed when the canonical app origin is unavailable", () => {
    expect(requireAdminRequestIntegrity(unsafeRequest(), {})).toEqual({
      valid: false,
      status: 503,
      code: "ADMIN_INTEGRITY_UNAVAILABLE",
    });
  });
});
