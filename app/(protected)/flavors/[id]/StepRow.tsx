"use client";

import { useState } from "react";
import {
  updateStepAction,
  deleteStepAction,
  moveStepUpAction,
  moveStepDownAction,
} from "./actions";
import type { HumorFlavorStep } from "@/lib/db/steps";

function getContent(step: HumorFlavorStep): string {
  return (
    (step as { prompt?: string }).prompt ??
    (step as { instruction?: string }).instruction ??
    (step as { step_text?: string }).step_text ??
    (step as { system_prompt?: string }).system_prompt ??
    (step as { user_prompt?: string }).user_prompt ??
    (step as { text?: string }).text ??
    ""
  );
}

export function StepRow({
  step,
  flavorId,
  canMoveUp,
  canMoveDown,
}: {
  step: HumorFlavorStep;
  flavorId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const content = getContent(step);

  return (
    <div className="card-surface p-4">
      {editing ? (
        <form
          action={async (formData) => {
            setPending(true);
            await updateStepAction(formData);
            setEditing(false);
            setPending(false);
          }}
          className="space-y-2"
        >
          <input type="hidden" name="id" value={step.id} />
          <input type="hidden" name="humor_flavor_id" value={flavorId} />
          <textarea
            name="content"
            defaultValue={content}
            rows={3}
            className="input-base w-full"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="btn-primary px-3 py-1"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="btn-secondary px-3 py-1"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                {(step as { order_value?: number }).order_value ?? "?"}
              </span>
              <p className="mt-1 whitespace-pre-wrap text-sm text-card-foreground">
                {content || "—"}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1">
              <form
                action={async (fd) => {
                  await moveStepUpAction(fd);
                }}
                className="inline"
              >
                <input type="hidden" name="id" value={step.id} />
                <button
                  type="submit"
                  disabled={!canMoveUp}
                  className="btn-ghost text-xs font-medium disabled:opacity-40"
                >
                  ↑ Up
                </button>
              </form>
              <form
                action={async (fd) => {
                  await moveStepDownAction(fd);
                }}
                className="inline"
              >
                <input type="hidden" name="id" value={step.id} />
                <button
                  type="submit"
                  disabled={!canMoveDown}
                  className="btn-ghost text-xs font-medium disabled:opacity-40"
                >
                  ↓ Down
                </button>
              </form>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="btn-ghost text-xs font-medium"
              >
                Edit
              </button>
              <form
                action={async (fd) => {
                  await deleteStepAction(fd);
                }}
                className="inline"
              >
                <input type="hidden" name="id" value={step.id} />
                <input type="hidden" name="humor_flavor_id" value={flavorId} />
                <button
                  type="submit"
                  onClick={(e) => {
                    if (!confirm("Delete this step?")) e.preventDefault();
                  }}
                  className="btn-danger-ghost text-xs font-medium"
                >
                  Delete
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
