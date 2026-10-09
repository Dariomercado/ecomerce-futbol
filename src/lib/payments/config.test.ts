import { describe, expect, it } from "vitest";

import { loadPaymentConfig } from "./config";

describe("loadPaymentConfig", () => {
  it("enables payments only with the server token and browser public key configured", () => {
    const config = loadPaymentConfig({
      PAYMENTS_ENABLED: "true",
      MERCADO_PAGO_ACCESS_TOKEN: "test-access-token",
      NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY: "TEST-public-key",
      PAYMENT_METHOD_IDS: "visa",
    });

    expect(config.enabled).toBe(true);
    expect(config.accessToken).toBe("test-access-token");
    expect(config.publicKey).toBe("TEST-public-key");
  });

  it.each([
    { PAYMENTS_ENABLED: "false", MERCADO_PAGO_ACCESS_TOKEN: "test-token", NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY: "TEST-key" },
    { PAYMENTS_ENABLED: "true", MERCADO_PAGO_ACCESS_TOKEN: "", NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY: "TEST-key" },
    { PAYMENTS_ENABLED: "true", MERCADO_PAGO_ACCESS_TOKEN: "test-token", NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY: "" },
  ])("keeps payments disabled when the enable switch or a required credential is missing", (env) => {
    expect(loadPaymentConfig(env).enabled).toBe(false);
  });
});
