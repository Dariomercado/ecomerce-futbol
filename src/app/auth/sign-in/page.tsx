import { redirect } from "next/navigation";

import { loadAppOrigin } from "@/lib/auth/request-integrity";
import { createSupabaseServerClient, loadSupabaseServerConfig } from "@/lib/auth/supabase-server";

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

export default function SignInPage() {
  return (
    <section className="mx-auto flex w-full max-w-md flex-1 items-center px-6 py-16">
      <div className="w-full rounded-lg border bg-card p-6 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">Operator access</p>
        <h1 className="mt-2 text-3xl font-semibold">Sign in to administration</h1>
        <p className="mt-3 text-sm text-muted-foreground">Invited operators receive a secure sign-in link by email.</p>
        <form action={requestOperatorSignIn} className="mt-6 space-y-4">
          <label className="grid gap-2 text-sm font-medium" htmlFor="email">
            Email address
            <input className="h-10 rounded-md border bg-background px-3" id="email" name="email" type="email" autoComplete="email" required />
          </label>
          <button className="h-10 w-full rounded-md bg-primary px-4 font-medium text-primary-foreground" type="submit">
            Send sign-in link
          </button>
        </form>
      </div>
    </section>
  );
}
