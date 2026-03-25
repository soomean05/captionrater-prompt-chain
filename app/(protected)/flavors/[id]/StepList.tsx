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
        <p className="empty-state p-6">
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
