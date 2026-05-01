import { listFlavors } from "@/lib/db/flavors";
import { TestForm } from "./TestForm";

export default async function TestPage() {
  const { data: flavors, error } = await listFlavors();

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-violet-500/14 via-transparent to-fuchsia-500/12 px-6 py-10 dark:from-violet-500/10 dark:to-fuchsia-500/08 sm:px-10">
        <div className="pointer-events-none absolute -right-8 top-8 h-32 w-32 rounded-full bg-fuchsia-400/30 blur-2xl dark:bg-fuchsia-500/18" />
        <div className="pointer-events-none absolute -bottom-12 left-1/4 h-40 w-40 rounded-full bg-violet-400/25 blur-3xl dark:bg-violet-500/14" />

        <div className="relative max-w-2xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
            Lab
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Test humor flavor captions
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Plug in an AlmostCrackd-backed flavor from your dashboard, drop an
            image, and skim multiple caption ideas side by side.
          </p>
        </div>
      </div>

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
