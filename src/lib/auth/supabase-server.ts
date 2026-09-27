import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export type SupabaseServerConfig = {
  url: string;
  publishableKey: string;
};

export type SupportedEmailTokenType = "email" | "invite" | "magiclink";

export const adminRedirectPath = "/admin";

type Environment = Record<string, string | undefined>;
type VerifiedUserClient = {
  auth: {
    getUser(): Promise<{ data: { user: { id: string } | null }; error: unknown | null }>;
  };
};

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
  return value === "email" || value === "invite" || value === "magiclink";
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

/** Resolve navigation from the Auth server, not from unverified session cookies. */
export async function hasVerifiedSupabaseSession(dependencies: {
  env?: Environment;
  createClient?: (config: SupabaseServerConfig) => Promise<VerifiedUserClient> | VerifiedUserClient;
} = {}): Promise<boolean> {
  const config = loadSupabaseServerConfig(dependencies.env);
  if (!config) return false;

  try {
    const client = await (dependencies.createClient ?? createSupabaseServerClient)(config);
    const { data, error } = await client.auth.getUser();
    return !error && Boolean(data.user);
  } catch {
    return false;
  }
}
