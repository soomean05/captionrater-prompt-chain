import Link from "next/link";
import { notFound } from "next/navigation";
import { getFlavor } from "@/lib/db/flavors";
import { listStepsForFlavor } from "@/lib/db/steps";
import { FlavorEditForm } from "./FlavorEditForm";
import { StepList } from "./StepList";

export default async function FlavorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: flavor, error: flavorError } = await getFlavor(id);

  if (flavorError || !flavor) {
    notFound();
  }

  const { data: steps, error: stepsError } = await listStepsForFlavor(id);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/flavors"
          className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
        >
          ← Back to flavors
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {flavor.name ?? "Unnamed flavor"}
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          {flavor.description ?? "No description"}
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Edit flavor
        </h2>
        <FlavorEditForm flavor={flavor} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Steps (ordered)
        </h2>
        {stepsError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
            {stepsError.message}
          </div>
        ) : (
          <StepList flavorId={id} steps={steps ?? []} />
        )}
      </section>
    </div>
  );
}
