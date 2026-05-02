import { PageHeader } from "@/components/PageHeader";
import { listFlavors } from "@/lib/db/flavors";
import { TestForm } from "./TestForm";

export const dynamic = "force-dynamic";

export default async function TestPage() {
  const { data: flavors, error } = await listFlavors();

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Lab"
        title="Test humor flavor captions"
        description="Use your saved AlmostCrackd flavor and steps with a public URL or uploaded image. One generate-captions request (with count) returns up to five lines by default; optional parallel mode is available via env if you need it."
      />

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
