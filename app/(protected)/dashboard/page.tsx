import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 muted-text">
          Manage humor flavors and test caption generation.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/flavors"
          className="card-surface p-6 transition-colors hover:bg-muted"
        >
          <h2 className="font-medium text-card-foreground">Humor Flavors</h2>
          <p className="mt-2 text-sm muted-text">
            Create, edit, and manage humor flavors and their steps.
          </p>
        </Link>

        <Link
          href="/test"
          className="card-surface p-6 transition-colors hover:bg-muted"
        >
          <h2 className="font-medium text-card-foreground">Test Flavors</h2>
          <p className="mt-2 text-sm muted-text">
            Generate captions using a humor flavor and view results.
          </p>
        </Link>
      </div>
    </div>
  );
}
