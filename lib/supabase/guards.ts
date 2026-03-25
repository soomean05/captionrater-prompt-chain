import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ProfileGateRow = {
  id: string;
  email: string | null;
  is_superadmin: boolean | null;
  is_matrix_admin: boolean | null;
};

export type AuthedUser = {
  id: string;
  email: string | null;
};

export type AuthGateStatus =
  | "no_session"
  | "no_profile"
  | "unauthorized"
  | "authorized";

export type AuthGateResult = {
  status: AuthGateStatus;
  user: AuthedUser | null;
  profile: ProfileGateRow | null;
  allowed: boolean;
  query: string;
  error: string | null;
};

export async function getAuthedUser(): Promise<AuthedUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

export async function requireLogin(): Promise<AuthedUser> {
  const user = await getAuthedUser();
  if (!user) redirect("/login");
  return user;
}

async function getProfileById(
  userId: string,
  useAdminClient = false
): Promise<{ row: ProfileGateRow | null; error: string | null }> {
  const query = `public.profiles select id,email,is_superadmin,is_matrix_admin where id = ${userId}`;
  console.log("[auth] profile query:", query);

  if (useAdminClient) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id,email,is_superadmin,is_matrix_admin")
      .eq("id", userId)
      .maybeSingle();
    return {
      row: (data as ProfileGateRow | null) ?? null,
      error: error?.message ?? null,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,is_superadmin,is_matrix_admin")
    .eq("id", userId)
    .maybeSingle();
  return {
    row: (data as ProfileGateRow | null) ?? null,
    error: error?.message ?? null,
  };
}

export async function getAuthGateResult(): Promise<AuthGateResult> {
  const user = await getAuthedUser();
  if (!user) {
    return {
      status: "no_session",
      user: null,
      profile: null,
      allowed: false,
      query: "public.profiles by auth.user.id",
      error: null,
    };
  }

  console.log("[auth] authenticated user:", { id: user.id, email: user.email });

  const clientResult = await getProfileById(user.id);
  let profile = clientResult.row;
  let queryError = clientResult.error;

  // RLS fallback for secure server-side check
  if (!profile) {
    const adminResult = await getProfileById(user.id, true);
    profile = adminResult.row;
    if (!queryError && adminResult.error) queryError = adminResult.error;
  }

  if (!profile) {
    return {
      status: "no_profile",
      user,
      profile: null,
      allowed: false,
      query: `public.profiles WHERE id = '${user.id}'`,
      error: queryError,
    };
  }

  const allowed =
    profile?.is_superadmin === true || profile?.is_matrix_admin === true;

  console.log("[auth] profile row:", {
    id: profile.id,
    email: profile.email,
    is_superadmin: profile.is_superadmin,
    is_matrix_admin: profile.is_matrix_admin,
    allowed,
  });

  return {
    status: allowed ? "authorized" : "unauthorized",
    user,
    profile,
    allowed,
    query: `public.profiles WHERE id = '${user.id}'`,
    error: queryError,
  };
}

export async function isAuthorized(userId: string): Promise<boolean> {
  const result = await getAuthGateResult();
  if (!result.user || result.user.id !== userId) return false;
  return result.allowed;
}

export async function requireAuthorized(): Promise<AuthedUser> {
  const result = await getAuthGateResult();
  if (!result.user) redirect("/login");
  if (result.status === "no_profile") redirect("/not-authorized?reason=no_profile");
  if (result.status === "unauthorized")
    redirect("/not-authorized?reason=unauthorized");
  return result.user;
}
