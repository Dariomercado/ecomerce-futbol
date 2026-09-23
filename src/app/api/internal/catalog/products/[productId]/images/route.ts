import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin-authorization";
import { requireAdminRequestIntegrity } from "@/lib/auth/request-integrity";
import { prisma } from "@/lib/prisma";
import { createSupabaseStorageClient, loadSupabaseStorageConfig } from "@/lib/storage/supabase-storage";
export const runtime = "nodejs";
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES_PER_PRODUCT = 8;
const MIME_EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
type SupportedMime = keyof typeof MIME_EXTENSIONS;
type RouteContext = { params: Promise<{ productId: string }> };
export async function POST(request: Request, { params }: RouteContext) {
  const integrity = requireAdminRequestIntegrity(request);
  if (!integrity.valid) return NextResponse.json({ code: integrity.code }, { status: integrity.status });
  const authorization = await requireAdmin();
  if (!authorization.authorized) return NextResponse.json({ code: authorization.code }, { status: authorization.status });
  const { productId } = await params;
  if (!isUuid(productId)) return failure("INVALID_PRODUCT_ID", 400);
  const config = loadSupabaseStorageConfig();
  if (!config) return failure("STORAGE_UNAVAILABLE", 503);
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, _count: { select: { images: true } } } });
  if (!product) return failure("CATALOG_PRODUCT_NOT_FOUND", 404);
  let formData: FormData;
  try { formData = await request.formData(); } catch { return failure("INVALID_MULTIPART", 400); }
  const files = formData.getAll("files").concat(formData.getAll("file")).filter((value): value is File => typeof File !== "undefined" && value instanceof File);
  if (files.length === 0) return failure("IMAGE_REQUIRED", 400);
  if (product._count.images + files.length > MAX_IMAGES_PER_PRODUCT) return failure("IMAGE_LIMIT_EXCEEDED", 400);
  const storage = createSupabaseStorageClient(config);
  const uploaded: Array<{ path: string; url: string; mimeType: SupportedMime; sizeBytes: number; name: string }> = [];
  try {
    for (const file of files) {
      const mimeType = file.type as SupportedMime;
      if (!(mimeType in MIME_EXTENSIONS)) throw new UploadError("UNSUPPORTED_IMAGE_TYPE");
      if (file.size <= 0 || file.size > MAX_FILE_BYTES) throw new UploadError("IMAGE_SIZE_INVALID");
      if (!await hasMatchingImageSignature(file, mimeType)) throw new UploadError("UNSUPPORTED_IMAGE_TYPE");
      const path = `products/${productId}/${crypto.randomUUID()}.${MIME_EXTENSIONS[mimeType]}`;
      const result = await storage.storage.from(config.productImagesBucket).upload(path, file, { contentType: mimeType, upsert: false });
      if (result.error) throw result.error;
      const { data } = storage.storage.from(config.productImagesBucket).getPublicUrl(path);
      uploaded.push({ path, url: data.publicUrl, mimeType, sizeBytes: file.size, name: file.name });
    }
  } catch (error) {
    if (uploaded.length) await storage.storage.from(config.productImagesBucket).remove(uploaded.map((item) => item.path));
    if (error instanceof UploadError) return failure(error.code, 400);
    return failure("STORAGE_UPLOAD_FAILED", 502);
  }
  return NextResponse.json({ productId, images: uploaded }, { status: 201 });
}
class UploadError extends Error { constructor(readonly code: "UNSUPPORTED_IMAGE_TYPE" | "IMAGE_SIZE_INVALID") { super(code); } }
function failure(code: string, status: number) { return NextResponse.json({ code }, { status }); }
function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
async function hasMatchingImageSignature(file: File, mimeType: SupportedMime) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
  return bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}
