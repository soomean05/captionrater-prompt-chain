import { StepCreateForm } from "./StepCreateForm";
import { StepRow } from "./StepRow";
import type { HumorFlavorStep } from "@/lib/db/steps";

export function StepList({
  flavorId,
  flavorName,
  flavorDescription,
  steps,
}: {
  flavorId: string;
  flavorName: string | null;
  flavorDescription: string | null;
  steps: HumorFlavorStep[];
}) {
  return (
    <div className="space-y-4">
      <div className="card-surface p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Flavor
        </p>
        <p className="mt-1 text-base font-medium text-card-foreground">
          {flavorName?.trim() ? flavorName : "Unnamed flavor"}
        </p>
        {flavorDescription?.trim() ? (
          <p className="mt-2 text-sm text-muted-foreground">{flavorDescription}</p>
        ) : (
          <p className="mt-2 text-sm italic text-muted-foreground">
            No description
          </p>
        )}
      </div>
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
