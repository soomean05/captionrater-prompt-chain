import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type JwtClaims = {
  sub?: string;
  email?: string | null;
};

export type AuthedUser = {
  id: string;
  email: string | null;
};

async function getClaims(): Promise<JwtClaims | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error) return null;
  if (!data?.claims) return null;
  return data.claims as JwtClaims;
}

export async function getAuthedUser(): Promise<AuthedUser | null> {
  const claims = await getClaims();
  const userId = claims?.sub;
  if (!userId) return null;
  return { id: userId, email: claims?.email ?? null };
}

export async function requireLogin(): Promise<AuthedUser> {
  const user = await getAuthedUser();
  if (!user) redirect("/login");
  return user;
}

export async function isAuthorized(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, is_superadmin, is_matrix_admin")
    .eq("id", userId)
    .maybeSingle();

  if (!error && data) {
    return data?.is_superadmin === true || data?.is_matrix_admin === true;
  }

  try {
    const admin = createAdminClient();
    const { data: adminData, error: adminError } = await admin
      .from("profiles")
      .select("id, is_superadmin, is_matrix_admin")
      .eq("id", userId)
      .maybeSingle();
    if (adminError) return false;
    return adminData?.is_superadmin === true || adminData?.is_matrix_admin === true;
  } catch {
    return false;
  }
}

export async function requireAuthorized(): Promise<AuthedUser> {
  const user = await requireLogin();
  const ok = await isAuthorized(user.id);
  if (!ok) redirect("/not-authorized");
  return user;
}
