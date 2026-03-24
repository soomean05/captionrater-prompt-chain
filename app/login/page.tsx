import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignInWithGoogleButton } from "./SignInWithGoogleButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as { sub?: string } | undefined;
  if (claims?.sub) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-900">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Log in
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Sign in with Google to access the Prompt Chain Tool.
        </p>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-6">
          <SignInWithGoogleButton />
        </div>

        <div className="mt-6">
          <Link
            href="/"
            className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
