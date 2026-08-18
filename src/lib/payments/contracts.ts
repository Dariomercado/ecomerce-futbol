export type NextAction = "none" | "poll" | "retry_same_intent" | "retry_new_intent" | "complete_3ds" | "contact_support";
export type SafeCode = "PAYMENTS_DISABLED" | "UNSUPPORTED_PAYMENT_METHOD" | "PAYMENT_DECLINED" | "PAYMENT_REQUIRES_SUPPORT" | "PAYMENT_PENDING" | "INVALID_PAYMENT_INTENT";
export type SafeError<A extends NextAction = NextAction> = { code: SafeCode; nextAction: A; message: string; providerCode?: string; providerStatus?: number; providerMessage?: string };
export type Intent = { intentId: string; intentToken: string };
export type CardToken = { cardToken: string; paymentMethodId: string; paymentType: "credit_card" | "debit_card"; installments: number; issuerId?: string };
export type NextIntent = Intent & { priorAttemptId: string; singleUse: true };
export type PaymentResult = | { kind: "paid"; attemptId: string; nextAction: "none" } | { kind: "pending"; attemptId: string; nextAction: "poll" | "retry_same_intent" } | { kind: "action_required"; attemptId: string; nextAction: "complete_3ds"; challenge: { url: string; expiresAt: string } } | { kind: "failed_retryable"; attemptId: string; nextAction: "retry_new_intent"; error: SafeError<"retry_new_intent">; nextIntent: NextIntent } | { kind: "failed_terminal"; attemptId: string; nextAction: "none"; error: SafeError<"none">; nextIntent?: never } | { kind: "failed_terminal"; attemptId: string; nextAction: "contact_support"; error: SafeError<"contact_support">; nextIntent?: never };
export type ProviderPaymentEvidence = { id: string; status: string; statusDetail: string };
export type ProviderOrderEvidence = {
  id: string;
  externalReference?: string;
  status: string;
  statusDetail: string;
  updatedAt: string;
  payment: ProviderPaymentEvidence;
  /** Present when the provider requires an in-storefront 3DS challenge. */
  challenge?: { url: string; expiresAt: string };
};
export type LocalPaymentState = { status: "PENDING" | "PAID" | "FAILED"; providerUpdatedAt?: string; orderStatus?: string; paymentStatus?: string };

