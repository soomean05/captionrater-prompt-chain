import { createAdminClient } from "@/lib/supabase/admin";

export type HumorFlavor = {
  id: string;
  name: string | null;
  description: string | null;
  created_datetime_utc?: string | null;
};

export async function listFlavors() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("humor_flavors")
    .select("*")
    .order("created_datetime_utc", { ascending: false });
  return { data: (data ?? []) as HumorFlavor[], error };
}

export async function getFlavor(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("humor_flavors")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return { data: data as HumorFlavor | null, error };
}

export async function createFlavor(input: {
  name: string;
  description?: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("humor_flavors")
    .insert({
      name: input.name,
      description: input.description ?? null,
    })
    .select()
    .single();
  return { data: data as HumorFlavor | null, error };
}

export async function updateFlavor(
  id: string,
  input: { name?: string; description?: string }
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("humor_flavors")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  return { data: data as HumorFlavor | null, error };
}

export async function deleteFlavor(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("humor_flavors").delete().eq("id", id);
  return { error };
}
