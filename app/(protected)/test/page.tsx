import { PageHeader } from "@/components/PageHeader";
import { listAllFlavors } from "@/lib/db/flavors";
import { TestForm } from "./TestForm";

export const dynamic = "force-dynamic";

export default async function TestPage() {
  const { data: flavors, error } = await listAllFlavors();

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Lab" title="Test humor flavor captions" />

      {error ? (
        <div className="alert-error rounded-xl border px-5 py-4">
          {error.message}
        </div>
      ) : (
        <TestForm flavors={flavors ?? []} />
      )}
    </div>
  );
}
