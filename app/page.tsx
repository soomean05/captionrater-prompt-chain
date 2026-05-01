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
    <div className="page-shell flex flex-col items-center justify-center gap-12 px-6 py-20">
      <div className="max-w-xl text-center space-y-6">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-600 dark:text-violet-400">
          Prompt Chain Tool
        </p>
        <h1 className="bg-linear-to-br from-foreground via-foreground to-violet-600 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent dark:to-violet-400 sm:text-5xl">
          Shape humor flavors, chain prompts, ship captions.
        </h1>
        <p className="mx-auto max-w-md text-lg leading-relaxed text-muted-foreground">
          Manage flavor libraries, orchestrate AlmostCrackd steps, then stress-test
          ideas in one polished workspace.
        </p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link href="/login" className="btn-primary min-w-[10rem] px-8 py-3 text-base shadow-lg">
          Log in with Google
        </Link>
      </div>
    </div>
  );
}
