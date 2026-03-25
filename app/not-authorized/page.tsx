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
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-card-foreground">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You are signed in, but this account does not have permission to use this tool.
          </p>
          <p className="mt-3 text-sm text-card-foreground">
            Current signed-in account:{" "}
            <span className="font-medium">{gate.user?.email ?? "Unavailable"}</span>
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <form action={signOut}>
              <button
                type="submit"
                className="btn-primary px-3"
              >
                Sign out
              </button>
            </form>
            <Link
              href="/"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-card-foreground hover:bg-muted"
            >
              Back home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
