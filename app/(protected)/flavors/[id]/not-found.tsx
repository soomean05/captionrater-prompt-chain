import Link from "next/link";

export default function FlavorNotFound() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">
        Flavor not found
      </h1>
      <p className="muted-text">
        The humor flavor you’re looking for doesn’t exist or was deleted.
      </p>
      <Link
        href="/flavors"
        className="text-sm muted-text underline hover:text-foreground"
      >
        Back to flavors
      </Link>
    </div>
  );
}
