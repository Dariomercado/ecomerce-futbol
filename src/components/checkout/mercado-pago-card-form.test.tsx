// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loadMercadoPago = vi.fn();
const cardForm = vi.fn();
const getCardFormData = vi.fn();

vi.mock("@mercadopago/sdk-js", () => ({ loadMercadoPago }));

describe("MercadoPagoCardForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCardFormData.mockReturnValue({
      token: "mp-card-token",
      paymentMethodId: "visa",
      paymentType: "credit_card",
      installments: "1",
      issuerId: "123",
    });
    cardForm.mockReturnValue({ getCardFormData, unmount: vi.fn() });
    loadMercadoPago.mockResolvedValue(undefined);
    window.MercadoPago = vi.fn(function MercadoPago() { return { cardForm }; }) as never;
  });

  it("mounts Mercado Pago iframe fields and emits only tokenized card metadata without a network request", async () => {
    const onTokenized = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { MercadoPagoCardForm } = await import("./mercado-pago-card-form");

    render(<MercadoPagoCardForm publicKey="TEST-public-key" amount={18000} onTokenized={onTokenized} />);

    await act(async () => {});

    expect(loadMercadoPago).toHaveBeenCalledOnce();
    expect(window.MercadoPago).toHaveBeenCalledWith("TEST-public-key", { locale: "es-AR" });
    expect(cardForm).toHaveBeenCalledWith(expect.objectContaining({
      amount: "18000",
      iframe: true,
      form: expect.objectContaining({
        cardNumber: expect.objectContaining({ id: expect.any(String) }),
        securityCode: expect.objectContaining({ id: expect.any(String) }),
      }),
    }));
    expect(screen.getByText("Número de tarjeta")).toBeInTheDocument();
    expect(screen.getByText("Código de seguridad")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("4111111111111111")).not.toBeInTheDocument();

    const options = cardForm.mock.calls[0]?.[0] as { callbacks: { onSubmit(event: Event): void } };
    const event = { preventDefault: vi.fn() } as unknown as Event;
    options.callbacks.onSubmit(event);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(onTokenized).toHaveBeenCalledWith({
      cardToken: "mp-card-token",
      paymentMethodId: "visa",
      paymentType: "credit_card",
      installments: 1,
      issuerId: "123",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("keeps tokenization failures local and never exposes PAN or CVV fields to the component", async () => {
    const onTokenized = vi.fn();
    const onTokenizationError = vi.fn();
    const { MercadoPagoCardForm } = await import("./mercado-pago-card-form");
    getCardFormData.mockReturnValue({ token: "", paymentMethodId: "visa", paymentType: "credit_card", installments: "1" });

    const { container } = render(<MercadoPagoCardForm publicKey="TEST-public-key" amount={18000} onTokenized={onTokenized} onTokenizationError={onTokenizationError} />);
    await act(async () => {});
    const options = cardForm.mock.calls[0]?.[0] as { callbacks: { onSubmit(event: Event): void } };
    act(() => options.callbacks.onSubmit({ preventDefault: vi.fn() } as unknown as Event));

    expect(onTokenized).not.toHaveBeenCalled();
    expect(onTokenizationError).toHaveBeenCalledWith("No se pudo tokenizar la tarjeta. Intentá nuevamente.");
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo tokenizar la tarjeta. Intentá nuevamente.");
    expect(container.querySelectorAll('input[name*="card" i], input[name*="cvv" i], input[name*="security" i]')).toHaveLength(0);
  });

  it("maps the SDK card payload when paymentType is omitted", async () => {
    const onTokenized = vi.fn();
    const { MercadoPagoCardForm } = await import("./mercado-pago-card-form");
    getCardFormData.mockReturnValue({ token: "mp-card-token", paymentMethodId: "visa", installments: "1" });

    render(<MercadoPagoCardForm publicKey="TEST-public-key" amount={18000} onTokenized={onTokenized} />);
    await act(async () => {});
    const options = cardForm.mock.calls[0]?.[0] as { callbacks: { onSubmit(event: Event): void } };
    options.callbacks.onSubmit({ preventDefault: vi.fn() } as unknown as Event);

    expect(onTokenized).toHaveBeenCalledWith({
      cardToken: "mp-card-token",
      paymentMethodId: "visa",
      paymentType: "credit_card",
      installments: 1,
    });
  });

  it("renders a non-expired 3DS challenge only for its trusted origin and closes it on a trusted completion message", async () => {
    const onThreeDSComplete = vi.fn();
    const onThreeDSClose = vi.fn();
    const { MercadoPagoCardForm } = await import("./mercado-pago-card-form");

    render(
      <MercadoPagoCardForm
        publicKey="TEST-public-key"
        amount={18000}
        onTokenized={vi.fn()}
        threeDSChallenge={{ url: "https://3ds.example.test/challenge", expiresAt: new Date(Date.now() + 60_000).toISOString() }}
        onThreeDSComplete={onThreeDSComplete}
        onThreeDSClose={onThreeDSClose}
      />,
    );

    await act(async () => {});

    expect(screen.getByTitle("Autenticación 3DS")).toHaveAttribute("src", "https://3ds.example.test/challenge");
    window.dispatchEvent(new MessageEvent("message", { origin: "https://untrusted.example.test", data: { type: "mercado-pago-3ds-complete" } }));
    expect(onThreeDSComplete).not.toHaveBeenCalled();

    window.dispatchEvent(new MessageEvent("message", { origin: "https://3ds.example.test", data: { type: "mercado-pago-3ds-complete" } }));
    expect(onThreeDSComplete).toHaveBeenCalledOnce();
    expect(onThreeDSClose).toHaveBeenCalledWith("completed");
  });

  it("never opens an expired 3DS challenge and reports the expiry safely", async () => {
    const onThreeDSClose = vi.fn();
    const { MercadoPagoCardForm } = await import("./mercado-pago-card-form");

    const { container } = render(
      <MercadoPagoCardForm
        publicKey="TEST-public-key"
        amount={18000}
        onTokenized={vi.fn()}
        threeDSChallenge={{ url: "https://3ds.example.test/challenge", expiresAt: "2020-01-01T00:00:00.000Z" }}
        onThreeDSClose={onThreeDSClose}
      />,
    );

    await act(async () => {});

    expect(container.querySelector('iframe[title="Autenticación 3DS"]')).toBeNull();
    expect(container).toHaveTextContent("La autenticación 3DS venció. Intentá nuevamente.");
    expect(onThreeDSClose).toHaveBeenCalledWith("expired");
  });
});
