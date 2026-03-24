import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Dashboard
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Manage humor flavors and test caption generation.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/flavors"
          className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
        >
          <h2 className="font-medium text-zinc-900 dark:text-zinc-100">
            Humor Flavors
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Create, edit, and manage humor flavors and their steps.
          </p>
        </Link>

        <Link
          href="/test"
          className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
        >
          <h2 className="font-medium text-zinc-900 dark:text-zinc-100">
            Test Flavors
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Generate captions using a humor flavor and view results.
          </p>
        </Link>
      </div>
    </div>
  );
}
