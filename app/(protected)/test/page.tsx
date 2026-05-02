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
        description="Use your saved AlmostCrackd flavor and steps with a public URL or uploaded image. AlmostCrackd receives only imageId and humorFlavorId; the last step prompts must require valid JSON (five strings). Sequential runs merge lines; optional parallel mode via env."
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
