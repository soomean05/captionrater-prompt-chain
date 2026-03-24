import Link from "next/link";

export default function NotAuthorizedPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Access denied
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Your account is logged in, but it does not have superadmin or
            matrix admin access. Contact an administrator to get access.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Go to login
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-700"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
