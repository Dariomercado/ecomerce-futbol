import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin, requireAdminRequestIntegrity, findUnique, upload, remove, getPublicUrl, createStorage, loadConfig } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  requireAdminRequestIntegrity: vi.fn(),
  findUnique: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  getPublicUrl: vi.fn(),
  createStorage: vi.fn(),
  loadConfig: vi.fn(),
}));

vi.mock("@/lib/auth/admin-authorization", () => ({ requireAdmin }));
vi.mock("@/lib/auth/request-integrity", () => ({ requireAdminRequestIntegrity }));
vi.mock("@/lib/prisma", () => ({ prisma: { product: { findUnique } } }));
vi.mock("@/lib/storage/supabase-storage", () => ({ createSupabaseStorageClient: createStorage, loadSupabaseStorageConfig: loadConfig }));

const productId = "33333333-3333-4333-8333-333333333333";
const params = Promise.resolve({ productId });
const config = { url: "https://storage.example.test", serviceRoleKey: "server-only", productImagesBucket: "product-images" };
const pngSignature = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);

function makeFile(name = "ball.png", type = "image/png", bytes: Uint8Array = pngSignature) {
  return new File([bytes], name, { type });
}

function requestWithFiles(files: File[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  return new Request("http://localhost", { method: "POST", body: formData });
}

describe("product image upload route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminRequestIntegrity.mockReturnValue({ valid: true });
    requireAdmin.mockResolvedValue({ authorized: true });
    loadConfig.mockReturnValue(config);
    findUnique.mockResolvedValue({ id: productId, _count: { images: 0 } });
    upload.mockResolvedValue({ data: { path: "uploaded" }, error: null });
    remove.mockResolvedValue({ data: [], error: null });
    getPublicUrl.mockReturnValue({ data: { publicUrl: "https://storage.example.test/product.png" } });
    createStorage.mockReturnValue({ storage: { from: () => ({ upload, remove, getPublicUrl }) } });
  });

  it("rejects invalid request integrity before authorization or database access", async () => {
    requireAdminRequestIntegrity.mockReturnValue({ valid: false, status: 403, code: "ADMIN_CSRF_INVALID" });
    const { POST } = await import("./route");

    const response = await POST(requestWithFiles([makeFile()]), { params });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ code: "ADMIN_CSRF_INVALID" });
    expect(requireAdmin).not.toHaveBeenCalled();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("rejects callers without an active admin authorization", async () => {
    requireAdmin.mockResolvedValue({ authorized: false, status: 403, code: "ADMIN_ACCESS_DENIED" });
    const { POST } = await import("./route");

    const response = await POST(requestWithFiles([makeFile()]), { params });

    expect(response.status).toBe(403);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("rejects unsupported types and content that does not match the declared image type", async () => {
    const { POST } = await import("./route");

    const unsupported = await POST(requestWithFiles([makeFile("payload.txt", "text/plain", Uint8Array.of(1, 2, 3))]), { params });
    expect(unsupported.status).toBe(400);
    await expect(unsupported.json()).resolves.toEqual({ code: "UNSUPPORTED_IMAGE_TYPE" });

    const mismatched = await POST(requestWithFiles([makeFile("fake.png", "image/png", Uint8Array.of(1, 2, 3))]), { params });
    expect(mismatched.status).toBe(400);
    await expect(mismatched.json()).resolves.toEqual({ code: "UNSUPPORTED_IMAGE_TYPE" });
    expect(upload).not.toHaveBeenCalled();
  });

  it("removes files already uploaded when a later Storage upload fails", async () => {
    upload.mockResolvedValueOnce({ data: { path: "first" }, error: null }).mockResolvedValueOnce({ data: null, error: new Error("storage unavailable") });
    const { POST } = await import("./route");

    const response = await POST(requestWithFiles([makeFile("one.png"), makeFile("two.png")]), { params });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ code: "STORAGE_UPLOAD_FAILED" });
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove.mock.calls[0][0]).toHaveLength(1);
    expect(remove.mock.calls[0][0][0]).toMatch(new RegExp(`^products/${productId}/`));
  });
});
