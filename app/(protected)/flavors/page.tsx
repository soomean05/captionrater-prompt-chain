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
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Humor Flavors
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Create and manage humor flavors and their steps.
          </p>
        </div>
        <FlavorCreateForm />
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
          {error.message}
        </div>
      ) : null}

      {!error && (!flavors || flavors.length === 0) ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-zinc-600 dark:text-zinc-400">
            No humor flavors yet. Create one to get started.
          </p>
          <FlavorCreateForm className="mt-4" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Description
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-zinc-900 dark:text-zinc-100">
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
