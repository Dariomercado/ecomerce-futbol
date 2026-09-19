import { describe, expect, it } from "vitest";

import { adminRedirectPath, isSupportedOperatorEmailTokenType, loadSupabaseServerConfig } from "./supabase-server";

describe("Supabase operator session helpers", () => {
  it("accepts only invite and magic-link confirmation types", () => {
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
});
