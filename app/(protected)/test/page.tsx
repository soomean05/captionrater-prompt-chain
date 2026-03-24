import { listFlavors } from "@/lib/db/flavors";
import { TestForm } from "./TestForm";

export default async function TestPage() {
  const { data: flavors, error } = await listFlavors();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Test Humor Flavor
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Generate captions using a humor flavor and an image URL.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
          {error.message}
        </div>
      ) : (
        <TestForm flavors={flavors ?? []} />
      )}
    </div>
  );
}
