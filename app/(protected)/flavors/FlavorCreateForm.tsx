"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createFlavorAction } from "./actions";

type FormState = { error: string } | null;

async function flavorCreate(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const result = await createFlavorAction(formData);
  if (result?.error) {
    return { error: result.error };
  }
  return null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Creating…" : "Create"}
    </button>
  );
}

export function FlavorCreateForm({ className }: { className?: string }) {
  const [state, formAction] = useActionState(flavorCreate, null);

  return (
    <form action={formAction} className={className}>
      {state?.error ? (
        <p className="mb-2 text-sm text-danger">{state.error}</p>
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
        <SubmitButton />
      </div>
    </form>
  );
}
