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
    <div className="page-shell flex items-center justify-center px-6">
      <div className="card-surface w-full max-w-sm p-8">
        <h1 className="text-xl font-semibold text-foreground">
          Log in
        </h1>
        <p className="mt-1 text-sm muted-text">
          Sign in with Google to access the Prompt Chain Tool.
        </p>

        {error ? (
          <div className="alert-error mt-4 px-3 py-2">
            {error}
          </div>
        ) : null}
        {switched ? (
          <div className="alert-success mt-4 px-3 py-2">
            Signed out. Choose the account you want to use.
          </div>
        ) : null}

        <div className="mt-6">
          <SignInWithGoogleButton />
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Google account selection is forced on each sign-in attempt.
        </p>

        <div className="mt-6">
          <Link
            href="/"
            className="text-sm muted-text underline hover:text-foreground"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
