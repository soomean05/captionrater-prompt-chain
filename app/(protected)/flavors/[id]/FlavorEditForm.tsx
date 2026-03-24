"use client";

import { useState } from "react";
import { updateFlavorAction, deleteFlavorAction } from "./actions";
import type { HumorFlavor } from "@/lib/db/flavors";

export function FlavorEditForm({ flavor }: { flavor: HumorFlavor }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpdate(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await updateFlavorAction(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <form action={handleUpdate}>
        <input type="hidden" name="id" value={flavor.id} />
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            name="name"
            defaultValue={flavor.name ?? ""}
            placeholder="Name"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <input
            type="text"
            name="description"
            defaultValue={flavor.description ?? ""}
            placeholder="Description"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
      <form
        action={async (fd) => {
          await deleteFlavorAction(fd);
        }}
      >
        <input type="hidden" name="id" value={flavor.id} />
        <button
          type="submit"
          onClick={(e) => {
            if (!confirm("Delete this flavor and all its steps?")) {
              e.preventDefault();
            }
          }}
          className="text-sm text-red-600 hover:underline dark:text-red-400"
        >
          Delete flavor
        </button>
      </form>
    </div>
  );
}
