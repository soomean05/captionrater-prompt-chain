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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col">
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 px-4 py-4 backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
              >
                Prompt Chain Tool
              </Link>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {user.email ?? user.id.slice(0, 8) + "…"}
              </span>
            </div>
            <AppNav />
            <form action={signOut} className="sm:ml-auto">
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
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
