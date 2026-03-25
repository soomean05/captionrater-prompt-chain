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
        <p className="mb-2 text-sm text-danger">{error}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          name="name"
          placeholder="Flavor name"
          required
          className="input-base"
        />
        <input
          type="text"
          name="description"
          placeholder="Description (optional)"
          className="input-base"
        />
        <button
          type="submit"
          disabled={pending}
          className="btn-primary"
        >
          {pending ? "Creating…" : "Create"}
        </button>
      </div>
    </form>
  );
}
