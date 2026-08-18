"use client";

import { loadMercadoPago } from "@mercadopago/sdk-js";
import { useEffect, useId, useRef, useState } from "react";

import type { CardToken } from "@/lib/payments/contracts";

type CardFormData = {
  token?: unknown;
  paymentMethodId?: unknown;
  paymentType?: unknown;
  installments?: unknown;
  issuerId?: unknown;
  processingMode?: unknown;
};

type CardFormController = {
  getCardFormData(): CardFormData;
  unmount?: () => void;
};

type CardFormCallbacks = {
  onSubmit(event: Event): void;
  onFormMounted?(error?: unknown): void;
  onError?(error: unknown): void;
};

type MercadoPagoInstance = {
  cardForm(options: {
    amount: string;
    iframe: true;
    form: Record<string, unknown>;
    callbacks: CardFormCallbacks;
  }): CardFormController;
};

type MercadoPagoConstructor = new (publicKey: string, options: { locale: "es-AR" }) => MercadoPagoInstance;

declare global {
  interface Window {
    MercadoPago?: MercadoPagoConstructor;
  }
}

export type MercadoPagoCardFormProps = {
  publicKey: string;
  amount: number;
  onTokenized(card: CardToken): void;
  onTokenizationError?(message: string): void;
  threeDSChallenge?: ThreeDSChallenge | null;
  onThreeDSComplete?(): void;
  onThreeDSClose?(reason: ThreeDSCloseReason): void;
};

export type ThreeDSChallenge = { url: string; expiresAt: string };
type ThreeDSCloseReason = "completed" | "closed" | "expired";

const tokenizationError = "No se pudo tokenizar la tarjeta. Intentá nuevamente.";

export function MercadoPagoCardForm({ publicKey, amount, onTokenized, onTokenizationError, threeDSChallenge, onThreeDSComplete, onThreeDSClose }: MercadoPagoCardFormProps) {
  const instanceId = useId().replace(/:/g, "");
  const formId = `mercado-pago-card-form-${instanceId}`;
  const [error, setError] = useState<string | null>(null);
  const onTokenizedRef = useRef(onTokenized);
  const onTokenizationErrorRef = useRef(onTokenizationError);

  useEffect(() => {
    onTokenizedRef.current = onTokenized;
    onTokenizationErrorRef.current = onTokenizationError;
  }, [onTokenized, onTokenizationError]);

  useEffect(() => {
    let active = true;
    let cardForm: CardFormController | undefined;

    async function mountCardForm() {
      try {
        await loadMercadoPago();
        if (!active) return;

        const MercadoPago = window.MercadoPago;
        if (!MercadoPago) throw new Error("Mercado Pago SDK did not load.");

        const mercadoPago = new MercadoPago(publicKey, { locale: "es-AR" });
        cardForm = mercadoPago.cardForm({
          amount: String(amount),
          iframe: true,
          form: {
            id: formId,
            cardNumber: { id: `${formId}-card-number`, placeholder: "Número de tarjeta" },
            expirationDate: { id: `${formId}-expiration-date`, placeholder: "MM/AA" },
            securityCode: { id: `${formId}-security-code`, placeholder: "CVV" },
            cardholderName: { id: `${formId}-cardholder-name`, placeholder: "Titular de la tarjeta" },
            issuer: { id: `${formId}-issuer`, placeholder: "Banco emisor" },
            installments: { id: `${formId}-installments`, placeholder: "Cuotas" },
            identificationType: { id: `${formId}-identification-type`, placeholder: "Tipo de documento" },
            identificationNumber: { id: `${formId}-identification-number`, placeholder: "Número de documento" },
            cardholderEmail: { id: `${formId}-cardholder-email`, placeholder: "Email" },
          },
          callbacks: {
            onFormMounted(error) {
              if (error) reportFormError(active, setError, onTokenizationErrorRef);
            },
            onError() {
              reportFormError(active, setError, onTokenizationErrorRef);
            },
            onSubmit(event) {
              event.preventDefault();
              const card = tokenFrom(cardForm?.getCardFormData());
              if (!card) return reportTokenizationError(active, setError, onTokenizationErrorRef);

              setError(null);
              onTokenizedRef.current(card);
            },
          },
        });
      } catch {
        reportTokenizationError(active, setError, onTokenizationErrorRef);
      }
    }

    void mountCardForm();
    return () => {
      active = false;
      cardForm?.unmount?.();
    };
  }, [amount, formId, publicKey]);

  return (
    <form id={formId} className="grid gap-4" noValidate>
      <CardIframeField id={`${formId}-card-number`} label="Número de tarjeta" />
      <CardIframeField id={`${formId}-expiration-date`} label="Vencimiento" />
      <CardIframeField id={`${formId}-security-code`} label="Código de seguridad" />
      <label className="grid gap-1" htmlFor={`${formId}-cardholder-name`}>
        Titular de la tarjeta
        <input className="rounded-md border border-input bg-background p-2" id={`${formId}-cardholder-name`} />
      </label>
      <label className="grid gap-1" htmlFor={`${formId}-issuer`}>
        Banco emisor
        <select className="rounded-md border border-input bg-background p-2" id={`${formId}-issuer`} />
      </label>
      <label className="grid gap-1" htmlFor={`${formId}-installments`}>
        Cuotas
        <select className="rounded-md border border-input bg-background p-2" id={`${formId}-installments`} />
      </label>
      <label className="grid gap-1" htmlFor={`${formId}-identification-type`}>
        Tipo de documento
        <select className="rounded-md border border-input bg-background p-2" id={`${formId}-identification-type`} />
      </label>
      <label className="grid gap-1" htmlFor={`${formId}-identification-number`}>
        Número de documento
        <input className="rounded-md border border-input bg-background p-2" id={`${formId}-identification-number`} />
      </label>
      <label className="grid gap-1" htmlFor={`${formId}-cardholder-email`}>
        Email del titular
        <input className="rounded-md border border-input bg-background p-2" id={`${formId}-cardholder-email`} type="email" />
      </label>
      <button className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground" type="submit">Tokenizar tarjeta</button>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {threeDSChallenge ? <ThreeDSChallengeFrame challenge={threeDSChallenge} onComplete={onThreeDSComplete} onClose={onThreeDSClose} /> : null}
    </form>
  );
}

function ThreeDSChallengeFrame({ challenge, onComplete, onClose }: { challenge: ThreeDSChallenge; onComplete?: () => void; onClose?: (reason: ThreeDSCloseReason) => void }) {
  const trustedChallenge = trustedThreeDSChallenge(challenge);
  const [expired, setExpired] = useState(() => !trustedChallenge || trustedChallenge.expiresAt <= Date.now());
  const onCompleteRef = useRef(onComplete);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onCloseRef.current = onClose;
  }, [onComplete, onClose]);

  useEffect(() => {
    if (!trustedChallenge || trustedChallenge.expiresAt <= Date.now()) {
      onCloseRef.current?.("expired");
      return;
    }

    const timeout = window.setTimeout(() => {
      setExpired(true);
      onCloseRef.current?.("expired");
    }, trustedChallenge.expiresAt - Date.now());
    return () => window.clearTimeout(timeout);
  }, [trustedChallenge]);

  useEffect(() => {
    if (!trustedChallenge || expired) return;
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== trustedChallenge.origin || !isThreeDSCompletionMessage(event.data)) return;
      onCompleteRef.current?.();
      onCloseRef.current?.("completed");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [expired, trustedChallenge]);

  if (expired || !trustedChallenge) return <p role="alert" className="text-sm text-destructive">La autenticación 3DS venció. Intentá nuevamente.</p>;

  return (
    <section aria-label="Autenticación 3DS" className="grid gap-3 rounded-md border border-border p-3">
      <p className="text-sm">Tu banco requiere una autenticación adicional para continuar.</p>
      <iframe className="min-h-96 w-full rounded-md border" referrerPolicy="no-referrer" src={trustedChallenge.url} title="Autenticación 3DS" />
      <button className="justify-self-start text-sm underline" onClick={() => onClose?.("closed")} type="button">Cancelar autenticación</button>
    </section>
  );
}

function CardIframeField({ id, label }: { id: string; label: string }) {
  return <div className="grid gap-1"><span>{label}</span><div aria-label={label} className="min-h-10 rounded-md border border-input bg-background p-2" id={id} /></div>;
}

function tokenFrom(data: CardFormData | undefined): CardToken | undefined {
  const installments = typeof data?.installments === "string" ? Number(data.installments) : typeof data?.installments === "number" ? data.installments : Number.NaN;
  if (typeof data?.token !== "string" || !data.token || typeof data.paymentMethodId !== "string" || !data.paymentMethodId || !Number.isInteger(installments) || installments <= 0) return undefined;

  // CardForm does not include paymentType in its payload. Treat card payments
  // as credit by default while preserving an explicitly supplied rail.
  const paymentType = data.paymentType === "debit_card" ? "debit_card" : "credit_card";

  return {
    cardToken: data.token,
    paymentMethodId: data.paymentMethodId,
    paymentType,
    installments,
    ...(typeof data.issuerId === "string" && data.issuerId ? { issuerId: data.issuerId } : {}),
  };
}

function reportTokenizationError(active: boolean, setError: (message: string) => void, onTokenizationErrorRef: React.RefObject<((message: string) => void) | undefined>) {
  if (!active) return;
  setError(tokenizationError);
  onTokenizationErrorRef.current?.(tokenizationError);
}

function reportFormError(active: boolean, setError: (message: string) => void, onTokenizationErrorRef: React.RefObject<((message: string) => void) | undefined>) {
  if (!active) return;
  const message = "No se pudo cargar el formulario de pago. Intenta nuevamente.";
  setError(message);
  onTokenizationErrorRef.current?.(message);
}

function trustedThreeDSChallenge(challenge: ThreeDSChallenge): { url: string; origin: string; expiresAt: number } | undefined {
  const expiresAt = Date.parse(challenge.expiresAt);
  try {
    const url = new URL(challenge.url);
    if (url.protocol !== "https:" || Number.isNaN(expiresAt)) return undefined;
    return { url: url.toString(), origin: url.origin, expiresAt };
  } catch {
    return undefined;
  }
}

function isThreeDSCompletionMessage(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && (value as { type?: unknown }).type === "mercado-pago-3ds-complete");
}
