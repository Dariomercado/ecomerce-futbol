import { describe, expect, it } from "vitest";

import { authorizeReconciliationRequest } from "./temporary-admin-auth";

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

  it("does not accept the retired human admin token in place of the scheduler secret", () => {
    expect(authorizeReconciliationRequest(new Request("http://localhost", { headers: { authorization: "Bearer reconciliation-scheduler-secret" } }), configured)).toEqual({ authorized: true });
    expect(authorizeReconciliationRequest(new Request("http://localhost", { headers: { authorization: "Bearer temporary-server-secret" } }), configured)).toEqual({
      authorized: false,
      status: 403,
      code: "RECONCILIATION_AUTH_INVALID",
    });
  });
});
