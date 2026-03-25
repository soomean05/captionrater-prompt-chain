import Link from "next/link";
import { getAuthGateResult } from "@/lib/supabase/guards";

function getReasonMessage(reason?: string) {
  if (reason === "no_profile") {
    return "Session exists, but no profile row was found for your auth user id.";
  }
  if (reason === "unauthorized") {
    return "Profile row found, but the account is not authorized.";
  }
  return "Your account is logged in, but it does not have superadmin or matrix admin access.";
}

export default async function NotAuthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const gate = await getAuthGateResult();
  const profile = gate.profile;
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Access denied
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {getReasonMessage(reason)}
          </p>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Auth state: {reason ?? "unknown"}
          </p>
          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
            <p className="font-semibold">Temporary auth debug</p>
            <p>auth user id: {gate.user?.id ?? "none"}</p>
            <p>auth email: {gate.user?.email ?? "none"}</p>
            <p>profile id: {profile?.id ?? "none"}</p>
            <p>profile email: {profile?.email ?? "none"}</p>
            <p>
              is_superadmin raw:{" "}
              {profile ? String(profile.is_superadmin) : "none"} (
              {profile ? typeof profile.is_superadmin : "n/a"})
            </p>
            <p>
              is_matrix_admin raw:{" "}
              {profile ? String(profile.is_matrix_admin) : "none"} (
              {profile ? typeof profile.is_matrix_admin : "n/a"})
            </p>
            <p>
              normalized is_superadmin:{" "}
              {gate.normalized ? String(gate.normalized.is_superadmin) : "none"}
            </p>
            <p>
              normalized is_matrix_admin:{" "}
              {gate.normalized ? String(gate.normalized.is_matrix_admin) : "none"}
            </p>
            <p>final allowed: {String(gate.allowed)}</p>
          </div>
          <div className="mt-6 flex gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Go to login
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-700"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
