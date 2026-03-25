import { listFlavors } from "@/lib/db/flavors";
import { TestForm } from "./TestForm";

export default async function TestPage() {
  const { data: flavors, error } = await listFlavors();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Test Humor Flavor
        </h1>
        <p className="mt-1 muted-text">
          Generate captions using a humor flavor and an image URL.
        </p>
      </div>

      {error ? (
        <div className="alert-error">
          {error.message}
        </div>
      ) : (
        <TestForm flavors={flavors ?? []} />
      )}
    </div>
  );
}
