import { NextResponse } from "next/server";
import { getAuthGateResult } from "@/lib/supabase/guards";

export async function GET() {
  const gate = await getAuthGateResult();
  const expectedId = "c3aa6727-4578-4ed7-b6e8-b9f5d4ea2129";

  const payload = {
    status: gate.status,
    allowed: gate.allowed,
    query: gate.query,
    user: gate.user
      ? {
          id: gate.user.id,
          email: gate.user.email,
          matches_expected_id: gate.user.id === expectedId,
        }
      : null,
    profile: gate.profile
      ? {
          id: gate.profile.id,
          email: gate.profile.email,
          is_superadmin: gate.profile.is_superadmin,
          is_matrix_admin: gate.profile.is_matrix_admin,
          is_superadmin_type: typeof gate.profile.is_superadmin,
          is_matrix_admin_type: typeof gate.profile.is_matrix_admin,
          expected_id_match:
            gate.profile.id === "c3aa6727-4578-4ed7-b6e8-b9f5d4ea2129",
          expected_email_match: gate.profile.email === "sl5676@columbia.edu",
        }
      : null,
    normalized: gate.normalized,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
      NEXT_PUBLIC_SUPABASE_ANON_KEY_PREFIX:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 12) ?? null,
      SUPABASE_SERVICE_ROLE_KEY_SET: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    error: gate.error,
  };

  return NextResponse.json(payload);
}
