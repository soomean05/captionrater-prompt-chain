"use client";

import { useState } from "react";
import { createFlavorAction } from "./actions";

export function FlavorCreateForm({ className }: { className?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createFlavorAction(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className={className}>
      {error ? (
        <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          name="name"
          placeholder="Flavor name"
          required
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <input
          type="text"
          name="description"
          placeholder="Description (optional)"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Creating…" : "Create"}
        </button>
      </div>
    </form>
  );
}
