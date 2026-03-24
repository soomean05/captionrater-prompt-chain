import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAuthorized } from "@/lib/supabase/guards";

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as { sub?: string } | undefined;

  if (claims?.sub) {
    const ok = await isAuthorized(claims.sub);
    if (ok) redirect("/dashboard");
    redirect("/not-authorized");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-50 px-6 dark:bg-zinc-900">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Prompt Chain Tool
      </h1>
      <p className="text-center text-zinc-600 dark:text-zinc-400">
        Manage humor flavors and test caption generation via api.almostcrackd.ai
      </p>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          href="/login"
          className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
