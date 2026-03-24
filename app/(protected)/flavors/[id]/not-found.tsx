import Link from "next/link";

export default function FlavorNotFound() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Flavor not found
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        The humor flavor you’re looking for doesn’t exist or was deleted.
      </p>
      <Link
        href="/flavors"
        className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        Back to flavors
      </Link>
    </div>
  );
}
