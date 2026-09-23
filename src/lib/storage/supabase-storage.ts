import "server-only";

import { createServerClient } from "@supabase/ssr";

export type SupabaseStorageConfig = {
  url: string;
  serviceRoleKey: string;
  productImagesBucket: string;
};

type Environment = Record<string, string | undefined>;

export function loadSupabaseStorageConfig(env: Environment = process.env): SupabaseStorageConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const productImagesBucket = env.SUPABASE_PRODUCT_IMAGES_BUCKET?.trim() || "product-images";
  if (!url || !serviceRoleKey || !productImagesBucket) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") return null;
  } catch {
    return null;
  }
  return { url, serviceRoleKey, productImagesBucket };
}

/** Server-only privileged client. The service-role key must never cross a client boundary. */
export function createSupabaseStorageClient(config: SupabaseStorageConfig) {
  return createServerClient(config.url, config.serviceRoleKey, {
    cookies: { getAll: () => [], setAll: () => undefined },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
