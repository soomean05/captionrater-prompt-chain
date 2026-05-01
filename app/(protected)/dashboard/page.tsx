import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Jump into flavors, tweak steps, then try AlmostCrackd caption runs from one place."
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/flavors"
          className="card-surface-interactive group p-8"
        >
          <span className="inline-flex rounded-lg bg-linear-to-br from-violet-500/15 to-fuchsia-500/10 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-widest text-violet-700 dark:text-violet-300">
            Flavors
          </span>
          <h2 className="mt-4 text-lg font-semibold text-card-foreground group-hover:text-foreground">
            Humor flavors
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create, edit, and curate prompts for each caption style.
          </p>
        </Link>

        <Link href="/test" className="card-surface-interactive group p-8">
          <span className="inline-flex rounded-lg bg-linear-to-br from-fuchsia-500/15 to-violet-500/10 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-widest text-fuchsia-700 dark:text-fuchsia-300">
            Lab
          </span>
          <h2 className="mt-4 text-lg font-semibold text-card-foreground group-hover:text-foreground">
            Test captions
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Drop an image, pick a flavor, and skim generated lines.
          </p>
        </Link>
      </div>
    </div>
  );
}
