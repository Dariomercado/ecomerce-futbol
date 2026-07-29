import { CartContent } from "@/components/cart/cart-content";

export default function CartPage() {
  return <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8"><div className="mb-8"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Compra</p><h1 className="font-heading text-4xl font-bold tracking-tight">Carrito</h1></div><CartContent /></main>;
}
