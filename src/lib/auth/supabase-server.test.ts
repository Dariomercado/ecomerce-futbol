import { describe, expect, it } from "vitest";

import { adminRedirectPath, hasVerifiedSupabaseSession, isSupportedOperatorEmailTokenType, loadSupabaseServerConfig } from "./supabase-server";

const env = {
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
};

describe("Supabase operator session helpers", () => {
  it("accepts passwordless email confirmation types and rejects unrelated types", () => {
    expect(isSupportedOperatorEmailTokenType("email")).toBe(true);
    expect(isSupportedOperatorEmailTokenType("invite")).toBe(true);
    expect(isSupportedOperatorEmailTokenType("magiclink")).toBe(true);
    expect(isSupportedOperatorEmailTokenType("recovery")).toBe(false);
    expect(isSupportedOperatorEmailTokenType("email_change")).toBe(false);
    expect(isSupportedOperatorEmailTokenType(null)).toBe(false);
  });

  it("uses a fixed admin redirect rather than accepting caller-controlled destinations", () => {
    expect(adminRedirectPath).toBe("/admin");
  });

  it("loads only complete, valid public Supabase connection configuration", () => {
    expect(loadSupabaseServerConfig({
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
    })).toEqual({ url: "https://project.supabase.co", publishableKey: "publishable-key" });
    expect(loadSupabaseServerConfig({ NEXT_PUBLIC_SUPABASE_URL: "not-a-url", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "key" })).toBeNull();
  });

  it("derives navigation state only from a verified Auth user", async () => {
    const createClient = (user: { id: string } | null, error: unknown = null) => () => ({
      auth: { getUser: async () => ({ data: { user }, error }) },
    });

    expect(await hasVerifiedSupabaseSession({ env, createClient: createClient({ id: "user-1" }) })).toBe(true);
    expect(await hasVerifiedSupabaseSession({ env, createClient: createClient(null) })).toBe(false);
    expect(await hasVerifiedSupabaseSession({ env, createClient: createClient({ id: "user-1" }, new Error("Auth unavailable")) })).toBe(false);
    expect(await hasVerifiedSupabaseSession({ env: {}, createClient: createClient({ id: "user-1" }) })).toBe(false);
  });
});
