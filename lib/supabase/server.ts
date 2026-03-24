import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export async function createClient() {
  const cookieStore = await cookies();

  const key = getAnonKey();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored in Server Components
          }
        },
      },
    }
  );
}
