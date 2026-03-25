import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_noStore as noStore } from "next/cache";

type ProfileGateRow = {
  id: string;
  email: string | null;
  is_superadmin: unknown;
  is_matrix_admin: unknown;
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
  normalized: {
    is_superadmin: boolean | null;
    is_matrix_admin: boolean | null;
  } | null;
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
  if (process.env.NODE_ENV === "development") {
    console.log("[auth] profile query:", query);
  }

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

function normalizeBoolean(value: unknown): boolean | null {
  if (value === true) return true;
  if (value === false) return false;
  if (value == null) return null;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "t" || v === "1") return true;
    if (v === "false" || v === "f" || v === "0") return false;
  }
  return null;
}

export async function getAuthGateResult(): Promise<AuthGateResult> {
  noStore();
  const isDev = process.env.NODE_ENV === "development";
  const user = await getAuthedUser();
  if (!user) {
    return {
      status: "no_session",
      user: null,
      profile: null,
      allowed: false,
      query: "public.profiles by auth.user.id",
      error: null,
      normalized: null,
    };
  }

  if (isDev) {
    console.log("[auth] authenticated user:", { id: user.id, email: user.email });
  }

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
      normalized: null,
    };
  }

  const normalizedSuperadmin = normalizeBoolean(profile.is_superadmin);
  const normalizedMatrixAdmin = normalizeBoolean(profile.is_matrix_admin);
  const allowed =
    normalizedSuperadmin === true || normalizedMatrixAdmin === true;

  if (isDev) {
    console.log("[auth] profile row:", {
      id: profile.id,
      email: profile.email,
      is_superadmin: profile.is_superadmin,
      is_matrix_admin: profile.is_matrix_admin,
      is_superadmin_type: typeof profile.is_superadmin,
      is_matrix_admin_type: typeof profile.is_matrix_admin,
      normalized_is_superadmin: normalizedSuperadmin,
      normalized_is_matrix_admin: normalizedMatrixAdmin,
      expected_id_match: profile.id === "c3aa6727-4578-4ed7-b6e8-b9f5d4ea2129",
      expected_email_match: profile.email === "sl5676@columbia.edu",
      allowed,
    });
  }

  return {
    status: allowed ? "authorized" : "unauthorized",
    user,
    profile,
    allowed,
    query: `public.profiles WHERE id = '${user.id}'`,
    error: queryError,
    normalized: {
      is_superadmin: normalizedSuperadmin,
      is_matrix_admin: normalizedMatrixAdmin,
    },
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
