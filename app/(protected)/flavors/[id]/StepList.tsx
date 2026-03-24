import { StepCreateForm } from "./StepCreateForm";
import { StepRow } from "./StepRow";
import type { HumorFlavorStep } from "@/lib/db/steps";

export function StepList({
  flavorId,
  steps,
}: {
  flavorId: string;
  steps: HumorFlavorStep[];
}) {
  return (
    <div className="space-y-4">
      <StepCreateForm flavorId={flavorId} />
      {steps.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white p-6 text-center text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
          No steps yet. Add one above.
        </p>
      ) : (
        <div className="space-y-2">
          {steps.map((step, idx) => (
            <StepRow
              key={step.id}
              step={step}
              flavorId={flavorId}
              canMoveUp={idx > 0}
              canMoveDown={idx < steps.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
