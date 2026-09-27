import { requireAdmin } from "@/lib/auth/admin-authorization";
import { prisma } from "@/lib/prisma";

export default async function OrdersPage() {
  const auth = await requireAdmin({}, "orders");
  if (!auth.authorized) return <p>Order access denied.</p>;
  const orders = await prisma.order.findMany({ take: 50, orderBy: { createdAt: "desc" }, select: { id: true, createdAt: true, status: true, total: true, currency: true, contactEmail: true } });
  return <section><h1 className="text-2xl font-semibold">Latest 50 orders</h1>
    {orders.length === 0 && <p>No orders yet.</p>}
    <ul>{orders.map((order) => <li key={order.id} className="my-4 rounded border p-4"><p>{order.id}</p><p>{order.contactEmail} | {order.status}</p><p>{new Intl.NumberFormat("en", { style: "currency", currency: order.currency }).format(order.total)} | {order.createdAt.toISOString()}</p></li>)}</ul>
  </section>;
}
