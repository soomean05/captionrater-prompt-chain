import { listFlavors } from "@/lib/db/flavors";
import { listStepsForFlavor } from "@/lib/db/steps";
import type { HumorFlavorStep } from "@/lib/db/steps";
import { TestForm } from "./TestForm";

export default async function TestPage() {
  const { data: flavors, error } = await listFlavors();
  const stepsByFlavorId: Record<string, HumorFlavorStep[]> = {};
  if (!error && flavors) {
    await Promise.all(
      flavors.map(async (f) => {
        const { data: steps } = await listStepsForFlavor(f.id);
        stepsByFlavorId[f.id] = steps ?? [];
      })
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Test Humor Flavor
        </h1>
        <p className="mt-1 muted-text">
          Generates captions via{" "}
          <code className="text-xs">api.almostcrackd.ai</code> Assignment 5
          pipeline (POST{" "}
          <code className="text-xs">/api/test-flavor/generate</code>).
        </p>
      </div>

      {error ? (
        <div className="alert-error">
          {error.message}
        </div>
      ) : (
        <TestForm flavors={flavors ?? []} stepsByFlavorId={stepsByFlavorId} />
      )}
    </div>
  );
}
