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
    (step as { content?: string }).content ??
    (step as { prompt?: string }).prompt ??
    (step as { text?: string }).text ??
    (step as { instruction?: string }).instruction ??
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
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
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
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded bg-zinc-900 px-3 py-1 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-600"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium dark:bg-zinc-600">
                {(step as { step_number?: number }).step_number ?? "?"}
              </span>
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
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
                  className="rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-700"
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
                  className="rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-700"
                >
                  ↓ Down
                </button>
              </form>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
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
                  className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
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
