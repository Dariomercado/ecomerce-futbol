export type PaymentConfig = {
  enabled: boolean;
  accessToken?: string;
  publicKey?: string;
  supportedMethodIds: ReadonlySet<string>;
};

type Environment = Record<string, string | undefined>;

export function loadPaymentConfig(env: Environment = process.env): PaymentConfig {
  const enabled = env.PAYMENTS_ENABLED === "true";
  return {
    enabled,
    accessToken: env.MERCADO_PAGO_ACCESS_TOKEN || undefined,
    publicKey: env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY || undefined,
    supportedMethodIds: new Set((env.PAYMENT_METHOD_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean)),
  };
}

export function publicPaymentConfig(config: PaymentConfig): { enabled: boolean; publicKey?: string } {
  return config.enabled ? { enabled: true, publicKey: config.publicKey } : { enabled: false };
}
