import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function AppNav() {
  return (
    <nav className="flex flex-wrap items-center gap-3">
      <Link
        href="/dashboard"
        className="whitespace-nowrap rounded px-2 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Dashboard
      </Link>
      <Link
        href="/flavors"
        className="whitespace-nowrap rounded px-2 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Flavors
      </Link>
      <Link
        href="/test"
        className="whitespace-nowrap rounded px-2 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Test
      </Link>
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
      </div>
    </nav>
  );
}
