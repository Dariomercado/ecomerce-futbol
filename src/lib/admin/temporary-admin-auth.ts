import { createHash, timingSafeEqual } from "node:crypto";

export type TemporaryAdminAuthResult =
  | { authorized: true }
  | {
      authorized: false;
      status: 401 | 403 | 503;
      code: "ADMIN_AUTH_REQUIRED" | "ADMIN_AUTH_INVALID" | "POST_PAYMENT_UNAVAILABLE";
    };

export type ReconciliationAuthResult =
  | { authorized: true }
  | {
      authorized: false;
      status: 401 | 403 | 503;
      code: "RECONCILIATION_AUTH_REQUIRED" | "RECONCILIATION_AUTH_INVALID" | "RECONCILIATION_AUTH_UNAVAILABLE";
    };

type Environment = Record<string, string | undefined>;

/**
 * Node crypto makes this module server-only; import it solely from Node route
 * handlers and never expose POST_PAYMENT_ADMIN_TOKEN through client config.
 */
export function authorizeTemporaryAdminRequest(
  request: Pick<Request, "headers">,
  env: Environment = process.env,
): TemporaryAdminAuthResult {
  return authorizeBearerRequest(request, env.POST_PAYMENT_ADMIN_TOKEN, {
    required: "ADMIN_AUTH_REQUIRED",
    invalid: "ADMIN_AUTH_INVALID",
    unavailable: "POST_PAYMENT_UNAVAILABLE",
  });
}

/**
 * Authorizes the server-to-server reconciliation scheduler. This deliberately
 * uses a dedicated secret so scheduler access cannot invoke admin operations.
 */
export function authorizeReconciliationRequest(
  request: Pick<Request, "headers">,
  env: Environment = process.env,
): ReconciliationAuthResult {
  return authorizeBearerRequest(request, env.RECONCILIATION_CRON_SECRET, {
    required: "RECONCILIATION_AUTH_REQUIRED",
    invalid: "RECONCILIATION_AUTH_INVALID",
    unavailable: "RECONCILIATION_AUTH_UNAVAILABLE",
  });
}

function authorizeBearerRequest<Code extends string>(
  request: Pick<Request, "headers">,
  configuredToken: string | undefined,
  codes: { required: Code; invalid: Code; unavailable: Code },
):
  | { authorized: true }
  | {
      authorized: false;
      status: 401 | 403 | 503;
      code: Code;
    } {
  if (!configuredToken) return { authorized: false, status: 503, code: codes.unavailable };

  const presentedToken = parseBearerToken(request.headers.get("authorization"));
  if (!presentedToken) return { authorized: false, status: 401, code: codes.required };

  if (!timingSafeEqual(sha256(configuredToken), sha256(presentedToken))) {
    return { authorized: false, status: 403, code: codes.invalid };
  }

  return { authorized: true };
}

function parseBearerToken(value: string | null): string | null {
  const match = value?.match(/^Bearer ([^\s]+)$/i);
  return match?.[1] ?? null;
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}
