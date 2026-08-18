import { createHash, createHmac } from "node:crypto";
import { WebhookSignatureValidator } from "mercadopago";

type SignatureInput = { secret: string; dataId: string; requestId?: string | null; timestamp?: string | null; xSignature?: string | null };

export function createMercadoPagoWebhookSignature({ secret, dataId, requestId, timestamp }: Omit<SignatureInput, "xSignature">) {
  if (!timestamp) return "";
  const digest = createHmac("sha256", secret).update(webhookManifest(dataId, requestId, timestamp)).digest("hex");
  return `ts=${timestamp},v1=${digest}`;
}

export function verifyMercadoPagoWebhookSignature(input: SignatureInput) {
  if (!input.secret || !input.dataId || !input.xSignature) return false;
  try {
    WebhookSignatureValidator.validate({ xSignature: input.xSignature, xRequestId: input.requestId, dataId: input.dataId, secret: input.secret });
    return true;
  } catch {
    return false;
  }
}

export function parseMercadoPagoWebhookSignature(value: string) {
  const parts = value.split(",").map((part) => part.trim().split("=", 2));
  const timestamp = parts.find(([key]) => key === "ts")?.[1];
  const signature = parts.find(([key]) => key === "v1")?.[1];
  if (!timestamp || !signature || !/^[a-f0-9]{64}$/i.test(signature)) return null;
  return { timestamp, value: signature };
}

export function sha256RawWebhookBody(rawBody: string) {
  return createHash("sha256").update(rawBody).digest("hex");
}

function webhookManifest(dataId: string, requestId: string | null | undefined, timestamp: string) {
  return `id:${dataId};${requestId ? `request-id:${requestId};` : ""}ts:${timestamp};`;
}
