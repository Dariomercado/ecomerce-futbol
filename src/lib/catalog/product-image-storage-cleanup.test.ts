import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSupabaseStorageClient, loadSupabaseStorageConfig, remove } = vi.hoisted(() => ({
  createSupabaseStorageClient: vi.fn(),
  loadSupabaseStorageConfig: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/lib/storage/supabase-storage", () => ({
  createSupabaseStorageClient,
  loadSupabaseStorageConfig,
}));

import { cleanupReplacedProductImages } from "./product-image-storage-cleanup";

const config = {
  url: "https://project.supabase.co",
  serviceRoleKey: "service-role-key",
  productImagesBucket: "product-images",
};

describe("cleanupReplacedProductImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadSupabaseStorageConfig.mockReturnValue(config);
    createSupabaseStorageClient.mockReturnValue({ storage: { from: vi.fn(() => ({ remove })) } });
    remove.mockResolvedValue({ error: null });
  });

  it("removes unique replacement paths from Storage", async () => {
    await expect(cleanupReplacedProductImages([
      "products/product-1/old.webp",
      "products/product-1/old.webp",
      "  products/product-1/second.jpg  ",
    ])).resolves.toEqual({ status: "completed" });

    expect(remove).toHaveBeenCalledWith([
      "products/product-1/old.webp",
      "products/product-1/second.jpg",
    ]);
  });

  it("does not turn a Storage failure into an exception or leak paths", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    remove.mockResolvedValue({ error: new Error("provider unavailable") });

    await expect(cleanupReplacedProductImages(["products/product-1/old.webp"]))
      .resolves.toEqual({ status: "failed" });
    expect(error).toHaveBeenCalledWith("Product image storage cleanup failed", { pathCount: 1 });
    error.mockRestore();
  });
});