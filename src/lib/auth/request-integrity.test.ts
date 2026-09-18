import { describe, expect, it } from "vitest";

import { getAdminCsrfCookieName, loadAppOrigin, requireAdminRequestIntegrity } from "./request-integrity";

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
  it("uses the explicit application origin before Netlify's trusted deploy primary URL", () => {
    expect(loadAppOrigin({
      APP_ORIGIN: "https://shop.example.com",
      DEPLOY_PRIME_URL: "https://deploy-preview-42--shop.netlify.app",
    })).toBe("https://shop.example.com");
  });

  it("uses Netlify's deploy primary URL only when no explicit application origin is configured", () => {
    const previewOrigin = "https://deploy-preview-42--shop.netlify.app";

    expect(loadAppOrigin({ DEPLOY_PRIME_URL: previewOrigin })).toBe(previewOrigin);
    expect(requireAdminRequestIntegrity(new Request(`${previewOrigin}/api/internal/catalog/products`, {
      method: "POST",
      headers: {
        origin: previewOrigin,
        "sec-fetch-site": "same-origin",
        cookie: `${getAdminCsrfCookieName()}=${csrf}`,
        "x-csrf-token": csrf,
      },
    }), { DEPLOY_PRIME_URL: previewOrigin })).toEqual({ valid: true });
  });

  it.each([
    "https://shop.example.com/path",
    "https://shop.example.com?query=value",
    "https://shop.example.com#fragment",
    "https://user:password@shop.example.com",
    "https://*.netlify.app",
    "ftp://shop.example.com",
  ])("rejects a non-origin or untrusted origin value: %s", (value) => {
    expect(loadAppOrigin({ DEPLOY_PRIME_URL: value })).toBeNull();
  });

  it("fails closed rather than falling back when an explicit application origin is invalid", () => {
    expect(loadAppOrigin({
      APP_ORIGIN: "https://shop.example.com/path",
      DEPLOY_PRIME_URL: "https://deploy-preview-42--shop.netlify.app",
    })).toBeNull();
  });

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
