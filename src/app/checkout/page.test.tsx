// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { navigation, router } = vi.hoisted(() => ({
  navigation: { query: "", suspend: false },
  router: { replace: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => {
    if (navigation.suspend) throw new Promise(() => {});
    return new URLSearchParams(navigation.query);
  },
}));

vi.mock("@/components/checkout/mercado-pago-card-form", () => ({
  MercadoPagoCardForm: ({ onTokenized }: { onTokenized: (card: { token: string; paymentMethodId: string; issuerId: string; installments: number }) => void }) => (
    <button type="button" onClick={() => onTokenized({ token: "card-token", paymentMethodId: "visa", issuerId: "issuer", installments: 1 })}>Pay test order</button>
  ),
}));

import CheckoutPage from "./page";
import { CartProvider, useCart } from "@/lib/cart/cart-provider";

function CartProbe() {
  const { items, itemCount, total } = useCart();
  return <output data-testid="cart">{itemCount}:{total}:{items.map((item) => item.id).join(",")}</output>;
}

function SeedCart() {
  const { addItem } = useCart();
  return <button type="button" onClick={() => addItem({ id: "unrelated", slug: "unrelated", name: "Unrelated item", currency: "ARS", price: 500, stock: 3, variant: null })}>Seed existing cart</button>;
}

function renderCheckout() {
  return render(<CartProvider><SeedCart /><CheckoutPage /><CartProbe /></CartProvider>);
}

function fillContactForm() {
  fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Test Buyer" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "buyer@example.com" } });
  fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "123456" } });
  fireEvent.change(screen.getByLabelText("Dirección"), { target: { value: "Test Street 1" } });
  fireEvent.change(screen.getByLabelText("Ciudad"), { target: { value: "Test City" } });
  fireEvent.change(screen.getByLabelText("Provincia"), { target: { value: "Test Province" } });
  fireEvent.change(screen.getByLabelText("Código postal"), { target: { value: "1000" } });
}

describe("CheckoutPage direct purchase intent", () => {
  beforeEach(() => {
    navigation.query = "buyNowProductId=p1&buyNowVariantId=v1&buyNowPrice=110";
    navigation.suspend = false;
    router.replace.mockReset();
  });
  afterEach(() => {
    cleanup();
    navigation.suspend = false;
    vi.unstubAllGlobals();
  });

  it("renders a fallback while search parameters suspend", () => {
    navigation.suspend = true;

    renderCheckout();

    expect(screen.getByText("Cargando checkout…")).toBeInTheDocument();
  });

  it("submits only the direct selection and preserves unrelated cart items after payment", async () => {
    const requests: Array<{ url: string; body?: Record<string, unknown> }> = [];
    vi.stubGlobal("crypto", { randomUUID: () => "payment-intent-1" });
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined;
      requests.push({ url, body });
      if (url === "/api/checkout/orders") return Response.json({ order: { id: "order-1", total: 110 }, statusCapability: "capability-1" });
      if (url === "/api/checkout/config") return Response.json({ enabled: true, publicKey: "TEST-public-key" });
      if (url.endsWith("/payment")) return Response.json({ kind: "paid" });
      throw new Error(`Unexpected request: ${url}`);
    }));

    renderCheckout();
    fireEvent.click(screen.getByRole("button", { name: "Seed existing cart" }));
    fillContactForm();
    fireEvent.click(screen.getByRole("button", { name: "Continuar con el pedido" }));
    await screen.findByRole("button", { name: "Pay test order" });
    fireEvent.click(screen.getByRole("button", { name: "Pay test order" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/checkout/success?orderId=order-1&total=110"));
    expect(requests.find((request) => request.url === "/api/checkout/orders")?.body?.lines).toEqual([
      { productId: "p1", variantId: "v1", quantity: 1 },
    ]);
    expect(screen.getByTestId("cart")).toHaveTextContent("1:500:unrelated");
  });

  it("uses the existing cart lines for ordinary cart checkout", async () => {
    const requests: Array<{ url: string; body?: Record<string, unknown> }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined;
      requests.push({ url, body });
      if (url === "/api/checkout/orders") return Response.json({ order: { id: "order-2", total: 500 }, statusCapability: "capability-2" });
      if (url === "/api/checkout/config") return Response.json({ enabled: false });
      throw new Error(`Unexpected request: ${url}`);
    }));
    navigation.query = "";

    renderCheckout();
    fireEvent.click(screen.getByRole("button", { name: "Seed existing cart" }));
    fillContactForm();
    fireEvent.click(screen.getByRole("button", { name: "Continuar con el pedido" }));

    await screen.findByText(/Pedido order-2 registrado/);
    expect(requests.find((request) => request.url === "/api/checkout/orders")?.body?.lines).toEqual([
      { productId: "unrelated", variantId: null, quantity: 1 },
    ]);
  });

  it.each(["buyNowProductId=p1", "buyNowProductId=p1&buyNowPrice=invalid"])(
    "does not display a zero estimate when the direct price is missing or invalid (%s)",
    (query) => {
      navigation.query = query;
      renderCheckout();

      expect(screen.getByText("Se calculará en el servidor.")).toBeInTheDocument();
      expect(screen.queryByText("$0")).not.toBeInTheDocument();
    },
  );
});
