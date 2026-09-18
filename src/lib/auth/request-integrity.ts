import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

const csrfCookieName = "admin_csrf_token";
const csrfHeaderName = "x-csrf-token";

type Environment = Record<string, string | undefined>;

export type RequestIntegrityResult =
  | { valid: true }
  | {
      valid: false;
      status: 403 | 503;
      code: "ADMIN_ORIGIN_INVALID" | "ADMIN_FETCH_METADATA_INVALID" | "ADMIN_CSRF_INVALID" | "ADMIN_INTEGRITY_UNAVAILABLE";
    };

/**
 * Rejects unsafe cookie-authenticated requests before a route looks up a
 * membership, invokes a provider, or changes data. The CSRF cookie is set by
 * the future admin shell as HttpOnly/Secure/SameSite=Strict and its shell
 * token is submitted in the request header.
 */
export function requireAdminRequestIntegrity(
  request: Pick<Request, "headers" | "method">,
  env: Environment = process.env,
): RequestIntegrityResult {
  if (!isUnsafeMethod(request.method)) return { valid: true };

  const appOrigin = loadAppOrigin(env);
  if (!appOrigin) return { valid: false, status: 503, code: "ADMIN_INTEGRITY_UNAVAILABLE" };
  if (request.headers.get("origin") !== appOrigin) return { valid: false, status: 403, code: "ADMIN_ORIGIN_INVALID" };

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== "same-origin" && fetchSite !== "same-site") {
    return { valid: false, status: 403, code: "ADMIN_FETCH_METADATA_INVALID" };
  }

  const cookieToken = readCookie(request.headers.get("cookie"), csrfCookieName);
  const headerToken = request.headers.get(csrfHeaderName);
  if (!cookieToken || !headerToken || !constantTimeEqual(cookieToken, headerToken)) {
    return { valid: false, status: 403, code: "ADMIN_CSRF_INVALID" };
  }

  return { valid: true };
}

export function getAdminCsrfCookieName(): string {
  return csrfCookieName;
}

function isUnsafeMethod(method: string): boolean {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

export function loadAppOrigin(env: Environment = process.env): string | null {
  const appOrigin = env.APP_ORIGIN?.trim();
  if (appOrigin) return parseExactHttpOrigin(appOrigin);

  return parseExactHttpOrigin(env.DEPLOY_PRIME_URL?.trim());
}

function parseExactHttpOrigin(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (
      !["http:", "https:"].includes(parsed.protocol)
      || parsed.username
      || parsed.password
      || parsed.hostname.includes("*")
      || parsed.origin !== value
    ) {
      return null;
    }

    return value;
  } catch {
    return null;
  }
}

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;

  for (const segment of cookieHeader.split(";")) {
    const [key, ...value] = segment.trim().split("=");
    if (key === name && value.length === 1 && value[0]) return value[0];
  }
  return null;
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}
