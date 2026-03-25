import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-shell flex flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold text-foreground">
        404 — Not found
      </h1>
      <p className="muted-text">
        The page you’re looking for doesn’t exist.
      </p>
      <Link
        href="/"
        className="btn-primary"
      >
        Go home
      </Link>
    </div>
  );
}
