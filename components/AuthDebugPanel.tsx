"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DebugData = {
  status: "no_session" | "no_profile" | "unauthorized" | "authorized";
  allowed: boolean;
  query: string;
  user: { id: string; email: string | null; matches_expected_id: boolean } | null;
  profile: {
    id: string;
    email: string | null;
    is_superadmin: unknown;
    is_matrix_admin: unknown;
    is_superadmin_type: string;
    is_matrix_admin_type: string;
    expected_id_match: boolean;
    expected_email_match: boolean;
  } | null;
  normalized: {
    is_superadmin: boolean | null;
    is_matrix_admin: boolean | null;
  } | null;
  env: {
    NEXT_PUBLIC_SUPABASE_URL: string | null;
    NEXT_PUBLIC_SUPABASE_ANON_KEY_PREFIX: string | null;
    SUPABASE_SERVICE_ROLE_KEY_SET: boolean;
  };
  error: string | null;
};

export function AuthDebugPanel() {
  const [state, setState] = useState<{
    clientUser: { id: string; email: string | null } | null;
    clientProfile: Record<string, unknown> | null;
    clientProfileError: string | null;
    server: DebugData | null;
    loading: boolean;
  }>({
    clientUser: null,
    clientProfile: null,
    clientProfileError: null,
    server: null,
    loading: true,
  });

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();
      const userRes = await supabase.auth.getUser();
      const user = userRes.data.user
        ? { id: userRes.data.user.id, email: userRes.data.user.email ?? null }
        : null;

      console.log("[auth-debug] client user after load/refresh:", user);

      let clientProfile: Record<string, unknown> | null = null;
      let clientProfileError: string | null = null;
      if (user?.id) {
        console.log(
          "[auth-debug] client profile query:",
          `public.profiles where id = '${user.id}'`
        );
        const profileRes = await supabase
          .from("profiles")
          .select("id,email,is_superadmin,is_matrix_admin")
          .eq("id", user.id)
          .maybeSingle();

        clientProfile = (profileRes.data as Record<string, unknown> | null) ?? null;
        clientProfileError = profileRes.error?.message ?? null;
      }

      const serverRes = await fetch("/api/auth-debug", { cache: "no-store" });
      const server = (await serverRes.json()) as DebugData;

      console.log("[auth-debug] server gate result:", server);

      setState({
        clientUser: user,
        clientProfile,
        clientProfileError,
        server,
        loading: false,
      });
    };

    void run();
  }, []);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800">
      <h2 className="mb-2 font-medium text-zinc-900 dark:text-zinc-100">
        Auth Debug
      </h2>
      {state.loading ? (
        <p className="text-zinc-600 dark:text-zinc-400">Loading auth debug...</p>
      ) : (
        <div className="space-y-2 text-zinc-700 dark:text-zinc-300">
          <p>
            <strong>State:</strong> {state.server?.status ?? "unknown"}
          </p>
          <p>
            <strong>Allowed:</strong> {String(state.server?.allowed ?? false)}
          </p>
          <p>
            <strong>Client user:</strong>{" "}
            {state.clientUser
              ? `${state.clientUser.id} (${state.clientUser.email ?? "no email"})`
              : "none"}
          </p>
          <p>
            <strong>Client profile:</strong>{" "}
            {state.clientProfile
              ? JSON.stringify(state.clientProfile)
              : state.clientProfileError
                ? `error: ${state.clientProfileError}`
                : "none"}
          </p>
          <p>
            <strong>Server query:</strong> {state.server?.query ?? "n/a"}
          </p>
          <p>
            <strong>Server profile:</strong>{" "}
            {state.server?.profile ? JSON.stringify(state.server.profile) : "none"}
          </p>
          <p>
            <strong>Normalized flags:</strong>{" "}
            {state.server?.normalized
              ? JSON.stringify(state.server.normalized)
              : "none"}
          </p>
          <p>
            <strong>Supabase URL:</strong>{" "}
            {state.server?.env.NEXT_PUBLIC_SUPABASE_URL ?? "missing"}
          </p>
        </div>
      )}
    </section>
  );
}
