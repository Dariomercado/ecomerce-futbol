import { NextResponse } from "next/server";

import {
  adminRedirectPath,
  createSupabaseServerClient,
  isSupportedOperatorEmailTokenType,
  loadSupabaseServerConfig,
} from "@/lib/auth/supabase-server";
import type { SupportedEmailTokenType } from "@/lib/auth/supabase-server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  if ((!code && !tokenHash) || (tokenHash && !isSupportedOperatorEmailTokenType(type))) {
    return noStore(NextResponse.json({ error: "Invalid confirmation link" }, { status: 400 }));
  }

  const config = loadSupabaseServerConfig();
  if (!config) {
    return noStore(NextResponse.json({ error: "Authentication is unavailable" }, { status: 503 }));
  }

  try {
    const supabase = await createSupabaseServerClient(config);
    const error = code
      ? (await supabase.auth.exchangeCodeForSession(code)).error
      : (await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type as SupportedEmailTokenType })).error;
    if (error) {
      logConfirmationFailure(error, "confirmation_rejected");
      return noStore(NextResponse.redirect(new URL("/auth/sign-in?error=confirmation_failed", requestUrl), 303));
    }
  } catch (error) {
    logConfirmationFailure(error, "unexpected_failure");
    return noStore(NextResponse.redirect(new URL("/auth/sign-in?error=confirmation_failed", requestUrl), 303));
  }

  return noStore(NextResponse.redirect(new URL(adminRedirectPath, requestUrl), 303));
}

// Only fixed categories leave this server boundary; never log provider payloads.
function logConfirmationFailure(error: unknown, fallback: "confirmation_rejected" | "unexpected_failure") {
  try {
    let category: string = fallback;
    if (typeof error === "object" && error !== null) {
      const name = "name" in error ? error.name : undefined;
      const code = "code" in error ? error.code : undefined;
      if (name === "AuthPKCECodeVerifierMissingError" || code === "pkce_code_verifier_not_found") {
        category = "pkce_verifier_missing";
      } else if (name === "AuthRetryableFetchError") {
        category = "provider_unavailable";
      } else {
        switch (code) {
          case "bad_code_verifier": category = "pkce_verifier_mismatch"; break;
          case "otp_expired":
          case "flow_state_not_found":
          case "flow_state_expired": category = "link_invalid_or_expired"; break;
          case "over_request_rate_limit": category = "rate_limited"; break;
          case "request_timeout": category = "provider_unavailable"; break;
        }
      }
    }
    console.warn("auth_confirmation_failed", { category });
  } catch {
    // Diagnostics must not change the confirmation result or failure redirect.
  }
}

function noStore(response: NextResponse): NextResponse {
  response.headers.set("cache-control", "private, no-store");
  return response;
}
