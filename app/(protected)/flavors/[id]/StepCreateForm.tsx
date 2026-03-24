"use client";

import { useState } from "react";
import { createStepAction } from "./actions";

export function StepCreateForm({ flavorId }: { flavorId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createStepAction(formData);
    if (result?.error) {
      setError(result.error);
    }
    setPending(false);
  }

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="humor_flavor_id" value={flavorId} />
      {error ? (
        <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <textarea
          name="content"
          placeholder="Step content / prompt"
          required
          rows={2}
          className="min-w-[300px] rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Adding…" : "Add step"}
        </button>
      </div>
    </form>
  );
}
