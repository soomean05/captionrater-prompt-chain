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
        <p className="mb-2 text-sm text-danger">{error}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <textarea
          name="step_text"
          placeholder="Step content / prompt"
          required
          rows={2}
          className="input-base min-w-[300px]"
        />
        <button
          type="submit"
          disabled={pending}
          className="btn-primary"
        >
          {pending ? "Adding…" : "Add step"}
        </button>
      </div>
    </form>
  );
}
