import Link from "next/link";
import { requireAuthorized } from "@/lib/supabase/guards";
import { signOut } from "@/app/actions";
import { AppNav } from "@/components/AppNav";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuthorized();

  return (
    <div className="page-shell">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-4 backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm font-semibold tracking-tight text-foreground"
              >
                Prompt Chain Tool
              </Link>
              <span className="text-xs text-muted-foreground">
                {user.email ?? user.id.slice(0, 8) + "…"}
              </span>
            </div>
            <AppNav />
            <form action={signOut} className="sm:ml-auto">
              <button
                type="submit"
                className="btn-secondary px-3"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
