import { createAdminClient } from "@/lib/supabase/admin";

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
  const slug = slugify(input.name);
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

export async function updateFlavor(
  id: string,
  input: { name?: string; description?: string; userId: string }
) {
  const supabase = createAdminClient();
  const flavorNameColumn = await getFlavorNameColumn();
  const payload: { description?: string | null; [key: string]: unknown } = {};
  payload.modified_by_user_id = input.userId;
  if (input.name !== undefined) {
    payload[flavorNameColumn] = input.name;
    payload.slug = slugify(input.name);
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
