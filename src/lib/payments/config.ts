export type PaymentConfig = {
  enabled: boolean;
  accessToken?: string;
  publicKey?: string;
  supportedMethodIds: ReadonlySet<string>;
};

type Environment = Record<string, string | undefined>;

export function loadPaymentConfig(env: Environment = process.env): PaymentConfig {
  const accessToken = env.MERCADO_PAGO_ACCESS_TOKEN?.trim() || undefined;
  const publicKey = env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY?.trim() || undefined;
  const enabled = env.PAYMENTS_ENABLED === "true" && Boolean(accessToken && publicKey);
  return {
    enabled,
    accessToken,
    publicKey,
    supportedMethodIds: new Set((env.PAYMENT_METHOD_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean)),
  };
}

export function publicPaymentConfig(config: PaymentConfig): { enabled: boolean; publicKey?: string } {
  return config.enabled ? { enabled: true, publicKey: config.publicKey } : { enabled: false };
}
