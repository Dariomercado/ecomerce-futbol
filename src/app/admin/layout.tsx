import { requireAdmin } from "@/lib/auth/admin-authorization";

type AdminLayoutProps = Readonly<{ children: React.ReactNode }>;

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const authorization = await requireAdmin();

  if (!authorization.authorized) {
    const state = authorization.status === 401
      ? "unauthenticated"
      : authorization.status === 403
        ? "forbidden"
        : "unavailable";

    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-6 py-16">
        <section className="w-full rounded-lg border bg-card p-6 shadow-sm" data-state={state} data-testid="admin-shell">
          <h1 className="text-2xl font-semibold">Administration unavailable</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {state === "unauthenticated" && "Sign in with an invited operator account to continue."}
            {state === "forbidden" && "This account does not have active operator access."}
            {state === "unavailable" && "Operator access cannot be verified right now. Please try again later."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10" data-state="authorized" data-testid="admin-shell">
      <header className="mb-8 flex items-center justify-between border-b pb-4">
        <p className="font-semibold">Operator administration</p>
        <form action="/auth/sign-out" method="post">
          <button className="rounded-md border px-3 py-2 text-sm font-medium" type="submit">Sign out</button>
        </form>
      </header>
      {children}
    </main>
  );
}
