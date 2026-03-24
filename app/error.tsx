"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 px-6 dark:bg-zinc-900">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Something went wrong
      </h1>
      <p className="max-w-md text-center text-sm text-zinc-600 dark:text-zinc-400">
        {error.message}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
