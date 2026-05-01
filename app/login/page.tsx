import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignInWithGoogleButton } from "./SignInWithGoogleButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; switched?: string }>;
}) {
  const { error, switched } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user?.id) {
    redirect("/dashboard");
  }

  return (
    <div className="page-shell flex items-center justify-center px-6 py-16">
      <div className="card-surface-interactive relative w-full max-w-md overflow-hidden border-violet-200/35 p-0 shadow-xl dark:border-violet-900/35">
        <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-violet-500 via-fuchsia-500 to-violet-500" aria-hidden />
        <div className="relative space-y-2 px-9 pb-8 pt-10">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
            Welcome back
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Log in
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in with Google to open the Prompt Chain Tool.
          </p>
        </div>

        <div className="space-y-4 border-t border-border/70 bg-muted/25 px-9 pb-9 pt-6 dark:bg-muted/15">
          {error ? (
            <div className="alert-error px-4 py-3 text-sm">{error}</div>
          ) : null}
          {switched ? (
            <div className="alert-success px-4 py-3 text-sm">
              Signed out. Choose the account you want to use.
            </div>
          ) : null}

          <SignInWithGoogleButton />

          <p className="text-center text-xs text-muted-foreground">
            Account chooser opens on every attempt so you always pick the
            right workspace.
          </p>

          <div className="border-t border-border/60 pt-5 text-center">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground underline-offset-4 transition hover:text-violet-600 hover:underline dark:hover:text-violet-400"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
