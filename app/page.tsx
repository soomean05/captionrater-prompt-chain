import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthGateResult } from "@/lib/supabase/guards";

export default async function HomePage() {
  const gate = await getAuthGateResult();
  if (gate.status === "authorized") {
    redirect("/dashboard");
  }
  if (gate.status === "no_profile") {
    redirect("/not-authorized?reason=no_profile");
  }
  if (gate.status === "unauthorized") {
    redirect("/not-authorized?reason=unauthorized");
  }

  return (
    <div className="page-shell flex flex-col items-center justify-center gap-8 px-6">
      <h1 className="text-2xl font-semibold text-foreground">
        Prompt Chain Tool
      </h1>
      <p className="text-center muted-text">
        Manage humor flavors and test AlmostCrackd caption generation
      </p>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          href="/login"
          className="btn-primary px-6 py-3"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
