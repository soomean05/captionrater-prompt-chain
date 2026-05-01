type SupabaseAuthClientLike = {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string } | null };
      error: { message?: string } | null;
    }>;
  };
};

export async function getCurrentUserId(
  supabase: SupabaseAuthClientLike,
  options?: { errorMessage?: string }
) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error(options?.errorMessage ?? "You must be logged in.");
  }

  return user.id;
}
