import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 px-6 dark:bg-zinc-900">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        404 — Not found
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        The page you’re looking for doesn’t exist.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Go home
      </Link>
    </div>
  );
}
