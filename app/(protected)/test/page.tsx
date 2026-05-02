import { PageHeader } from "@/components/PageHeader";
import { listFlavors } from "@/lib/db/flavors";
import { TestForm } from "./TestForm";

export default async function TestPage() {
  const { data: flavors, error } = await listFlavors();

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Lab"
        title="Test humor flavor captions"
        description="Use your saved AlmostCrackd flavor and steps with a public URL or uploaded image. Five parallel generate calls merge into up to five distinct captions, capped at about fourteen seconds for that batch."
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
