import { NextResponse } from "next/server";

import {
  adminRedirectPath,
  createSupabaseServerClient,
  isSupportedOperatorEmailTokenType,
  loadSupabaseServerConfig,
} from "@/lib/auth/supabase-server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  if (!tokenHash || !isSupportedOperatorEmailTokenType(type)) {
    return noStore(NextResponse.json({ error: "Invalid confirmation link" }, { status: 400 }));
  }

  const config = loadSupabaseServerConfig();
  if (!config) {
    return noStore(NextResponse.json({ error: "Authentication is unavailable" }, { status: 503 }));
  }

  try {
    const supabase = await createSupabaseServerClient(config);
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return noStore(NextResponse.redirect(new URL("/auth/sign-in?error=confirmation_failed", requestUrl), 303));
  } catch {
    return noStore(NextResponse.redirect(new URL("/auth/sign-in?error=confirmation_failed", requestUrl), 303));
  }

  return noStore(NextResponse.redirect(new URL(adminRedirectPath, requestUrl), 303));
}

function noStore(response: NextResponse): NextResponse {
  response.headers.set("cache-control", "private, no-store");
  return response;
}
