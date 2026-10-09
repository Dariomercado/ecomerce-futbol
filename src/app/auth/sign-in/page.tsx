import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/admin-authorization";
import { loadAppOrigin } from "@/lib/auth/request-integrity";
import { adminRedirectPath, createSupabaseServerClient, loadSupabaseServerConfig } from "@/lib/auth/supabase-server";

async function requestOperatorSignIn(formData: FormData) {
  "use server";

  const email = formData.get("email");
  const config = loadSupabaseServerConfig();
  const appOrigin = loadAppOrigin();

  if (typeof email !== "string" || !email.trim() || !config || !appOrigin) {
    redirect("/auth/sign-in?error=unavailable");
  }

  const emailRedirectTo = `${appOrigin}/auth/confirm`;

  const supabase = await createSupabaseServerClient(config);
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      shouldCreateUser: false,
      emailRedirectTo,
    },
  });

  if (error) redirect("/auth/sign-in?error=unavailable");
  redirect("/auth/sign-in?sent=1");
}

type SignInSearchParams = Promise<Record<string, string | string[] | undefined>>;

function getQueryValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function getSignInNotice(params: Record<string, string | string[] | undefined>) {
  const error = getQueryValue(params.error);

  if (error === "confirmation_failed") {
    return { role: "alert" as const, message: "That sign-in link could not be confirmed. Request a new link." };
  }

  if (error === "unavailable") {
    return { role: "alert" as const, message: "Sign-in is temporarily unavailable. Please try again." };
  }

  if (getQueryValue(params.sent) === "1") {
    return { role: "status" as const, message: "Check your email for a secure sign-in link." };
  }

  return null;
}

export default async function SignInPage({ searchParams }: { searchParams?: SignInSearchParams }) {
  const params = searchParams ? await searchParams : {};
  const authorization = await requireAdmin();
  if (authorization.authorized && getQueryValue(params.error) !== "confirmation_failed") {
    redirect(adminRedirectPath);
  }

  const canRequestSignIn = !authorization.authorized && authorization.status === 401;
  const notice = authorization.authorized
    ? { role: "alert" as const, message: "This sign-in link could not be confirmed, but your existing operator session is still active." }
    : canRequestSignIn
      ? getSignInNotice(params)
      : {
          role: "alert" as const,
          message: authorization.status === 403
            ? "This account does not have active operator access."
            : "Operator access cannot be verified right now. Please try again later.",
        };

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 items-center px-6 py-16">
      <div className="w-full rounded-lg border bg-card p-6 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">Operator access</p>
        <h1 className="mt-2 text-3xl font-semibold">{authorization.authorized ? "Operator session active" : canRequestSignIn ? "Sign in to administration" : "Administration unavailable"}</h1>
        {canRequestSignIn ? <p className="mt-3 text-sm text-muted-foreground">Invited operators receive a secure sign-in link by email.</p> : null}
        {notice ? <p className="mt-4 text-sm" role={notice.role}>{notice.message}</p> : null}
        {authorization.authorized ? (
          <Link className="mt-6 inline-flex rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground" href={adminRedirectPath}>
            Continue to administration
          </Link>
        ) : null}
        {canRequestSignIn ? <form action={requestOperatorSignIn} className="mt-6 space-y-4">
          <label className="grid gap-2 text-sm font-medium" htmlFor="email">
            Email address
            <input className="h-10 rounded-md border bg-background px-3" id="email" name="email" type="email" autoComplete="email" required />
          </label>
          <button className="h-10 w-full rounded-md bg-primary px-4 font-medium text-primary-foreground" type="submit">
            Send sign-in link
          </button>
        </form> : null}
      </div>
    </section>
  );
}
