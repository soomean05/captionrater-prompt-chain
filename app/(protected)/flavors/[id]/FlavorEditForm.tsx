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
        <p className="text-sm text-danger">{error}</p>
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
            className="input-base"
          />
          <input
            type="text"
            name="description"
            defaultValue={flavor.description ?? ""}
            placeholder="Description"
            className="input-base"
          />
          <button
            type="submit"
            disabled={pending}
            className="btn-primary"
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
          className="text-sm text-danger hover:underline"
        >
          Delete flavor
        </button>
      </form>
    </div>
  );
}
