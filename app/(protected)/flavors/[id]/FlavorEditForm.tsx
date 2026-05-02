"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateFlavorAction, deleteFlavorAction } from "./actions";
import type { HumorFlavor } from "@/lib/db/flavors";

type FormState = { error: string } | null;

async function flavorUpdate(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const result = await updateFlavorAction(formData);
  if (result?.error) {
    return { error: result.error };
  }
  return null;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

export function FlavorEditForm({ flavor }: { flavor: HumorFlavor }) {
  const [state, formAction] = useActionState(flavorUpdate, null);

  return (
    <div className="space-y-4">
      {state?.error ? (
        <p className="text-sm text-danger">{state.error}</p>
      ) : null}
      <form action={formAction}>
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
          <SaveButton />
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
