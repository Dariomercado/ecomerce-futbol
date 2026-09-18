import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export type SupabaseServerConfig = {
  url: string;
  publishableKey: string;
};

export type SupportedEmailTokenType = "invite" | "magiclink";

export const adminRedirectPath = "/admin";

type Environment = Record<string, string | undefined>;

/**
 * Returns only the browser-safe Supabase connection settings. Authentication
 * authorization is evaluated separately on the server; no service-role key is
 * needed for this boundary.
 */
export function loadSupabaseServerConfig(env: Environment = process.env): SupabaseServerConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) return null;

  try {
    new URL(url);
  } catch {
    return null;
  }

  return { url, publishableKey };
}

/**
 * Only invitation and passwordless sign-in links may establish an operator
 * session. The callback route must not turn recovery or email-change links
 * into an admin redirect.
 */
export function isSupportedOperatorEmailTokenType(value: string | null): value is SupportedEmailTokenType {
  return value === "invite" || value === "magiclink";
}

/**
 * Creates a request-scoped client from Supabase Auth cookies. This module is
 * server-only so the cookie adapter and authorization boundary cannot enter a
 * client bundle.
 */
export async function createSupabaseServerClient(config: SupabaseServerConfig) {
  const cookieStore = await cookies();

  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies. Route handlers can, and
          // getUser still verifies the request-scoped session in both cases.
        }
      },
    },
  });
}
