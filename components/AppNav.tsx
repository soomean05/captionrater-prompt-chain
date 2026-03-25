import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function AppNav() {
  return (
    <nav className="flex flex-wrap items-center gap-3">
      <Link
        href="/dashboard"
        className="btn-ghost whitespace-nowrap"
      >
        Dashboard
      </Link>
      <Link
        href="/flavors"
        className="btn-ghost whitespace-nowrap"
      >
        Flavors
      </Link>
      <Link
        href="/test"
        className="btn-ghost whitespace-nowrap"
      >
        Test
      </Link>
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
      </div>
    </nav>
  );
}
