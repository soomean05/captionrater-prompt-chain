import { createAdminClient } from "@/lib/supabase/admin";
import { listStepsForFlavor, createStep } from "@/lib/db/steps";

type FlavorNameColumn = "label" | "title" | "description";

export type HumorFlavor = {
  id: string;
  name: string | null;
  description: string | null;
  created_datetime_utc?: string | null;
};

type HumorFlavorRow = {
  id: string;
  description: string | null;
  created_datetime_utc?: string | null;
  [key: string]: unknown;
};

let flavorNameColumnPromise: Promise<FlavorNameColumn> | null = null;

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

type SupabaseLike = ReturnType<typeof createAdminClient>;

export async function makeUniqueFlavorSlug(
  supabase: SupabaseLike,
  baseName: string,
  options?: { excludeFlavorId?: string }
) {
  const baseSlug = slugify(baseName);

  if (!baseSlug) {
    throw new Error("Please enter a valid flavor name.");
  }

  let q = supabase
    .from("humor_flavors")
    .select("id,slug")
    .ilike("slug", `${baseSlug}%`);
  if (options?.excludeFlavorId) {
    q = q.neq("id", options.excludeFlavorId);
  }
  const { data, error } = await q;

  if (error) throw error;

  const existing = new Set((data ?? []).map((row) => row.slug));

  if (!existing.has(baseSlug)) return baseSlug;

  let i = 2;
  while (existing.has(`${baseSlug}-${i}`)) {
    i++;
  }

  return `${baseSlug}-${i}`;
}

async function detectFlavorNameColumn(): Promise<FlavorNameColumn> {
  const supabase = createAdminClient();
  const candidates: FlavorNameColumn[] = ["label", "title", "description"];

  for (const candidate of candidates) {
    const { error } = await supabase
      .from("humor_flavors")
      .select(`id,${candidate}`)
      .limit(1);
    if (!error) return candidate;
  }

  return "description";
}

async function getFlavorNameColumn() {
  if (!flavorNameColumnPromise) {
    flavorNameColumnPromise = detectFlavorNameColumn();
  }
  return flavorNameColumnPromise;
}

function mapFlavor(
  row: HumorFlavorRow,
  flavorNameColumn: FlavorNameColumn
): HumorFlavor {
  const displayName = row[flavorNameColumn];
  return {
    id: row.id,
    name: typeof displayName === "string" ? displayName : null,
    description: row.description ?? null,
    created_datetime_utc: row.created_datetime_utc ?? null,
  };
}

export async function listFlavors(input?: {
  page?: number;
  pageSize?: number;
  query?: string;
}) {
  const supabase = createAdminClient();
  const flavorNameColumn = await getFlavorNameColumn();
  const page = Math.max(1, input?.page ?? 1);
  const pageSize = input?.pageSize ?? 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const query = input?.query?.trim() ?? "";

  let q = supabase
    .from("humor_flavors")
    .select(`id,description,created_datetime_utc,${flavorNameColumn}`, {
      count: "exact",
    })
    .order("created_datetime_utc", { ascending: false });

  if (query) {
    q = q.or(
      `${flavorNameColumn}.ilike.%${query}%,description.ilike.%${query}%`
    );
  }

  const { data, error, count } = await q.range(from, to);
  return {
    data: ((data ?? []) as HumorFlavorRow[]).map((row) =>
      mapFlavor(row, flavorNameColumn)
    ),
    count: count ?? 0,
    page,
    pageSize,
    error,
  };
}

export async function getFlavor(id: string) {
  const supabase = createAdminClient();
  const flavorNameColumn = await getFlavorNameColumn();
  const { data, error } = await supabase
    .from("humor_flavors")
    .select(`id,description,created_datetime_utc,${flavorNameColumn}`)
    .eq("id", id)
    .maybeSingle();
  return {
    data: data ? mapFlavor(data as HumorFlavorRow, flavorNameColumn) : null,
    error,
  };
}

export async function createFlavor(input: {
  name: string;
  description?: string;
  userId: string;
}) {
  const supabase = createAdminClient();
  const flavorNameColumn = await getFlavorNameColumn();
  const slug = await makeUniqueFlavorSlug(supabase, input.name);
  const { data, error } = await supabase
    .from("humor_flavors")
    .insert({
      [flavorNameColumn]: input.name,
      created_by_user_id: input.userId,
      modified_by_user_id: input.userId,
      slug,
      description: input.description ?? null,
    })
    .select(`id,description,created_datetime_utc,${flavorNameColumn}`)
    .single();
  return {
    data: data ? mapFlavor(data as HumorFlavorRow, flavorNameColumn) : null,
    error,
  };
}

export async function duplicateFlavor(input: { id: string; userId: string }) {
  const { data: original, error } = await getFlavor(input.id);
  if (error) return { data: null, error };
  if (!original) return { data: null, error: { message: "Flavor not found" } };

  const duplicateName = `${original.name ?? "Flavor"} Copy`;
  const { data: createdFlavor, error: createError } = await createFlavor({
    name: duplicateName,
    description: original.description ?? "",
    userId: input.userId,
  });
  if (createError || !createdFlavor) {
    return { data: null, error: createError ?? { message: "Failed to duplicate flavor" } };
  }

  const { data: steps, error: stepsError } = await listStepsForFlavor(input.id);
  if (stepsError) return { data: createdFlavor, error: stepsError };

  for (const step of steps ?? []) {
    const { error: createStepError } = await createStep({
      humor_flavor_id: createdFlavor.id,
      orderValue: step.order_value ?? undefined,
      content: step.content ?? "",
      userId: input.userId,
    });
    if (createStepError) return { data: createdFlavor, error: createStepError };
  }

  return { data: createdFlavor, error: null };
}

export async function updateFlavor(
  id: string,
  input: { name?: string; description?: string; userId: string }
) {
  const supabase = createAdminClient();
  const flavorNameColumn = await getFlavorNameColumn();
  const payload: { description?: string | null; [key: string]: unknown } = {};
  payload.modified_by_user_id = input.userId;
  if (input.name !== undefined) {
    const { data: currentFlavor, error: currentFlavorError } = await supabase
      .from("humor_flavors")
      .select(`id,${flavorNameColumn},slug`)
      .eq("id", id)
      .maybeSingle();
    if (currentFlavorError) {
      return { data: null, error: currentFlavorError };
    }
    const currentRow = (currentFlavor ?? null) as Record<string, unknown> | null;
    const currentName = (currentRow?.[flavorNameColumn] as string | null) ?? null;
    if (currentName !== input.name) {
      payload[flavorNameColumn] = input.name;
      payload.slug = await makeUniqueFlavorSlug(supabase, input.name, {
        excludeFlavorId: id,
      });
    }
  }
  if (input.description !== undefined) payload.description = input.description;
  const { data, error } = await supabase
    .from("humor_flavors")
    .update(payload)
    .eq("id", id)
    .select(`id,description,created_datetime_utc,${flavorNameColumn}`)
    .single();
  return {
    data: data ? mapFlavor(data as HumorFlavorRow, flavorNameColumn) : null,
    error,
  };
}

export async function deleteFlavor(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("humor_flavors").delete().eq("id", id);
  return { error };
}
