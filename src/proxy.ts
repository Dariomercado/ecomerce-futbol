import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import { loadSupabaseServerConfig } from "@/lib/auth/supabase-server";

const csrfCookieName = "admin_csrf_token";

/**
 * Refreshes Supabase's cookie-backed session before the auth and admin trees
 * render. Authorization stays in the server-only requireAdmin boundary.
 */
export async function proxy(request: NextRequest) {
  let refreshedCookies: Array<{ name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] }> = [];

  const config = loadSupabaseServerConfig();

  try {
    const supabase = createServerClient(config?.url ?? request.nextUrl.origin, config?.publishableKey ?? "", {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          refreshedCookies = cookiesToSet;
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        },
      },
    });

    const auth = supabase.auth as {
      getClaims?: () => Promise<unknown>;
      getUser: () => Promise<unknown>;
    };

    // Claims are the verified identity signal. getUser also keeps cookie
    // refresh compatible with the existing SSR adapter contract; neither
    // result authorizes an admin request.
    if (typeof auth.getClaims === "function") {
      await auth.getClaims();
    }
    await auth.getUser();
  } catch {
    // The request-specific authorization boundary reports outages fail-closed.
  }

  const csrfToken = request.nextUrl.pathname.startsWith("/admin")
    ? request.cookies.get(csrfCookieName)?.value ?? crypto.randomUUID()
    : null;
  // Make a newly minted HttpOnly value available to the server-rendered shell
  // in this same request; the browser still receives it only as HttpOnly.
  if (csrfToken && !request.cookies.get(csrfCookieName)) {
    request.cookies.set(csrfCookieName, csrfToken);
  }

  const response = NextResponse.next({ request });
  response.headers.set("cache-control", "private, no-store");
  refreshedCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));

  if (csrfToken) {
    response.cookies.set(csrfCookieName, csrfToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/auth/:path*"],
};
