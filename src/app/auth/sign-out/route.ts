import { NextResponse } from "next/server";

import { createSupabaseServerClient, loadSupabaseServerConfig } from "@/lib/auth/supabase-server";

export async function POST(request: Request) {
  const config = loadSupabaseServerConfig();
  if (!config) return noStore(NextResponse.json({ error: "Authentication is unavailable" }, { status: 503 }));

  try {
    const supabase = await createSupabaseServerClient(config);
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    return noStore(NextResponse.json({ error: "Authentication is unavailable" }, { status: 503 }));
  }

  return noStore(NextResponse.redirect(new URL("/auth/sign-in", request.url), 303));
}

function noStore(response: NextResponse): NextResponse {
  response.headers.set("cache-control", "private, no-store");
  return response;
}
