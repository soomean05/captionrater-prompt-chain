import Link from "next/link";
import { getAuthGateResult } from "@/lib/supabase/guards";
import { signOut } from "@/app/actions";

export default async function NotAuthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  await searchParams;
  const gate = await getAuthGateResult();
  return (
    <div className="page-shell flex min-h-screen flex-col justify-center px-6 py-16">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <div className="card-surface-interactive overflow-hidden border-amber-200/40 dark:border-amber-900/30">
          <div className="h-1 bg-linear-to-r from-amber-400 via-orange-400 to-amber-500 opacity-90" aria-hidden />

          <div className="p-8 pt-9">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-400/90">
              Access
            </p>
            <h1 className="mt-3 text-2xl font-bold text-card-foreground">
              Permission needed
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              You are signed in with Google, but this account is not cleared for
              the Prompt Chain workspace yet.
            </p>
            <p className="mt-4 rounded-xl border border-border/80 bg-muted/35 px-4 py-3 text-sm text-card-foreground">
              <span className="text-muted-foreground">Signed in as </span>
              <span className="font-medium">
                {gate.user?.email ?? "Unavailable"}
              </span>
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <form action={signOut}>
                <button type="submit" className="btn-secondary px-4 py-2.5">
                  Sign out & try another
                </button>
              </form>
              <Link
                href="/"
                className="btn-primary px-5 py-2.5 shadow-md shadow-violet-500/25"
              >
                Back home
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Need access? Ping your admin with the email above so they can add you.
        </p>
      </div>
    </div>
  );
}
