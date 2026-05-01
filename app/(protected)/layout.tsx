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
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-card/85 px-4 py-4 backdrop-blur-xl supports-[backdrop-filter]:bg-card/65">
          <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-violet-500/25 to-transparent dark:via-violet-400/20" aria-hidden />

          <div className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
              <Link
                href="/dashboard"
                className="text-base font-bold tracking-tight bg-linear-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-fuchsia-400"
              >
                Prompt Chain Tool
              </Link>
              <span className="hidden max-w-[200px] truncate text-xs text-muted-foreground lg:inline lg:max-w-xs">
                {user.email ?? `${user.id.slice(0, 8)}…`}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-3">
              <AppNav />
              <form action={signOut}>
                <button type="submit" className="btn-secondary px-3 py-2 text-xs sm:text-sm">
                  Sign out
                </button>
              </form>
            </div>
          </div>
          <p className="relative mt-1 text-[0.72rem] text-muted-foreground lg:hidden">
            {user.email ?? `${user.id.slice(0, 8)}…`}
          </p>
        </header>

        <main className="flex-1 px-4 py-8 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
