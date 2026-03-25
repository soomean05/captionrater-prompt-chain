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
    <div className="page-shell flex flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-xl font-semibold text-foreground">
        Something went wrong
      </h1>
      <p className="max-w-md text-center text-sm muted-text">
        {error.message}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="btn-primary"
        >
          Try again
        </button>
        <Link
          href="/"
          className="btn-secondary"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
