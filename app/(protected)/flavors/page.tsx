import Link from "next/link";
import { listFlavors } from "@/lib/db/flavors";
import { FlavorCreateForm } from "./FlavorCreateForm";
import { FlavorRow } from "./FlavorRow";

export default async function FlavorsPage() {
  const { data: flavors, error } = await listFlavors();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Humor Flavors</h1>
          <p className="mt-1 muted-text">
            Create and manage humor flavors and their steps.
          </p>
        </div>
        <FlavorCreateForm />
      </div>

      {error ? (
        <div className="alert-error">{error.message}</div>
      ) : null}

      {!error && (!flavors || flavors.length === 0) ? (
        <div className="empty-state">
          <p>No humor flavors yet. Create one to get started.</p>
          <FlavorCreateForm className="mt-4" />
        </div>
      ) : (
        <div className="card-surface overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                  Description
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {flavors?.map((flavor) => (
                <FlavorRow key={flavor.id} flavor={flavor} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
