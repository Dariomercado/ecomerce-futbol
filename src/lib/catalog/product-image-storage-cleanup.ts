import "server-only";

import { createSupabaseStorageClient, loadSupabaseStorageConfig } from "@/lib/storage/supabase-storage";

export type StorageCleanupResult = { status: "not_required" | "completed" | "failed" };

/**
 * Deletes only paths that were removed from a successfully committed product
 * replacement. It deliberately never throws: database success must not turn
 * into a failed PATCH because object cleanup is unavailable.
 */
export async function cleanupReplacedProductImages(storagePaths: readonly string[]): Promise<StorageCleanupResult> {
  const paths = [...new Set(storagePaths.map((path) => path.trim()).filter(Boolean))];
  if (paths.length === 0) return { status: "not_required" };

  try {
    const config = loadSupabaseStorageConfig();
    if (!config) throw new Error("STORAGE_UNAVAILABLE");

    const result = await createSupabaseStorageClient(config)
      .storage
      .from(config.productImagesBucket)
      .remove(paths);
    if (result.error) throw result.error;
    return { status: "completed" };
  } catch {
    // Do not log object paths, bucket names, or provider details in the API process.
    console.error("Product image storage cleanup failed", { pathCount: paths.length });
    return { status: "failed" };
  }
}