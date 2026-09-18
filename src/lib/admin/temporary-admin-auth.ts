import { createHash, timingSafeEqual } from "node:crypto";

export type ReconciliationAuthResult =
  | { authorized: true }
  | {
      authorized: false;
      status: 401 | 403 | 503;
      code: "RECONCILIATION_AUTH_REQUIRED" | "RECONCILIATION_AUTH_INVALID" | "RECONCILIATION_AUTH_UNAVAILABLE";
    };

type Environment = Record<string, string | undefined>;

/**
 * Authorizes the server-to-server reconciliation scheduler. Human order
 * actions use the Supabase session and membership boundary instead.
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
