import { createHash } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

describe("Mercado Pago webhook route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redacts rejected provider data IDs without changing the rejection response", async () => {
    const dataId = "MP_ORDER_PRIVATE_928374650192837465";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { POST } = await import("./route");

    const response = await POST(new Request(`http://localhost/api/webhooks/mercado-pago?data.id=${encodeURIComponent(dataId)}`, {
      method: "POST",
      headers: { "x-request-id": "request-1" },
    }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ code: "INVALID_WEBHOOK_SIGNATURE" });
    expect(warn).toHaveBeenCalledOnce();
    expect(JSON.stringify(warn.mock.calls)).not.toContain(dataId);
    expect(warn).toHaveBeenCalledWith("[payments] Mercado Pago webhook signature rejected", expect.objectContaining({
      dataIdHash: createHash("sha256").update(dataId).digest("hex").slice(0, 12),
    }));
    expect(warn.mock.calls[0]?.[1]).not.toHaveProperty("dataId");
  });
});
