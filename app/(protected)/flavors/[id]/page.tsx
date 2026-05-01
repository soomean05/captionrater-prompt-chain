import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
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
    <div className="space-y-10">
      <div>
        <Link
          href="/flavors"
          className="text-sm font-medium text-muted-foreground transition hover:text-violet-600 dark:hover:text-violet-400"
        >
          ← Back to flavors
        </Link>
        <PageHeader
          eyebrow="Flavor"
          title={flavor.name ?? "Unnamed flavor"}
          description={flavor.description ?? "No description yet."}
          className="mt-6"
        />
      </div>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="h-1 w-6 rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500" aria-hidden />
          Edit flavor
        </h2>
        <FlavorEditForm flavor={flavor} />
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="h-1 w-6 rounded-full bg-linear-to-r from-fuchsia-500 to-violet-500" aria-hidden />
          Steps (ordered)
        </h2>
        {stepsError ? (
          <div className="alert-error">
            {stepsError.message}
          </div>
        ) : (
          <StepList flavorId={id} steps={steps ?? []} />
        )}
      </section>
    </div>
  );
}
