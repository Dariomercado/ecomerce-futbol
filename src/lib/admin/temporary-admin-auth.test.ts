import { describe, expect, it } from "vitest";

import { authorizeReconciliationRequest, authorizeTemporaryAdminRequest } from "./temporary-admin-auth";

const configured = { POST_PAYMENT_ADMIN_TOKEN: "temporary-server-secret" };

describe("temporary admin authentication", () => {
  it("rejects absent or malformed credentials without exposing a configured token", () => {
    expect(authorizeTemporaryAdminRequest(new Request("http://localhost"), configured)).toEqual({
      authorized: false,
      status: 401,
      code: "ADMIN_AUTH_REQUIRED",
    });
    expect(authorizeTemporaryAdminRequest(new Request("http://localhost", { headers: { authorization: "Basic temporary-server-secret" } }), configured)).toEqual({
      authorized: false,
      status: 401,
      code: "ADMIN_AUTH_REQUIRED",
    });
  });

  it("rejects mismatched Bearer credentials", () => {
    expect(authorizeTemporaryAdminRequest(new Request("http://localhost", { headers: { authorization: "Bearer wrong-token" } }), configured)).toEqual({
      authorized: false,
      status: 403,
      code: "ADMIN_AUTH_INVALID",
    });
  });

  it("fails closed when the server token is not configured", () => {
    expect(authorizeTemporaryAdminRequest(new Request("http://localhost", { headers: { authorization: "Bearer any-token" } }), {})).toEqual({
      authorized: false,
      status: 503,
      code: "POST_PAYMENT_UNAVAILABLE",
    });
  });

  it("accepts the configured Bearer credential", () => {
    expect(authorizeTemporaryAdminRequest(new Request("http://localhost", { headers: { authorization: "Bearer temporary-server-secret" } }), configured)).toEqual({ authorized: true });
  });
});

describe("reconciliation scheduler authentication", () => {
  const configured = { RECONCILIATION_CRON_SECRET: "reconciliation-scheduler-secret" };

  it("uses a dedicated secret and reports reconciliation-specific authentication failures", () => {
    expect(authorizeReconciliationRequest(new Request("http://localhost"), configured)).toEqual({
      authorized: false,
      status: 401,
      code: "RECONCILIATION_AUTH_REQUIRED",
    });
    expect(authorizeReconciliationRequest(new Request("http://localhost", { headers: { authorization: "Basic reconciliation-scheduler-secret" } }), configured)).toEqual({
      authorized: false,
      status: 401,
      code: "RECONCILIATION_AUTH_REQUIRED",
    });
    expect(authorizeReconciliationRequest(new Request("http://localhost", { headers: { authorization: "Bearer wrong-token" } }), configured)).toEqual({
      authorized: false,
      status: 403,
      code: "RECONCILIATION_AUTH_INVALID",
    });
    expect(authorizeReconciliationRequest(new Request("http://localhost", { headers: { authorization: "Bearer any-token" } }), {})).toEqual({
      authorized: false,
      status: 503,
      code: "RECONCILIATION_AUTH_UNAVAILABLE",
    });
  });

  it("does not accept the temporary admin secret in place of the scheduler secret", () => {
    expect(authorizeReconciliationRequest(new Request("http://localhost", { headers: { authorization: "Bearer reconciliation-scheduler-secret" } }), configured)).toEqual({ authorized: true });
    expect(authorizeReconciliationRequest(new Request("http://localhost", { headers: { authorization: "Bearer temporary-server-secret" } }), configured)).toEqual({
      authorized: false,
      status: 403,
      code: "RECONCILIATION_AUTH_INVALID",
    });
  });
});
