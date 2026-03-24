import { createAdminClient } from "@/lib/supabase/admin";

export type HumorFlavorStep = {
  id: string;
  humor_flavor_id: string;
  step_number: number;
  content: string | null;
  created_datetime_utc?: string | null;
};

const contentKey = "content";

export async function listStepsForFlavor(flavorId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("humor_flavor_steps")
    .select("*")
    .eq("humor_flavor_id", flavorId)
    .order("step_number", { ascending: true });
  return { data: (data ?? []) as HumorFlavorStep[], error };
}

export async function getStep(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("humor_flavor_steps")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return { data: data as HumorFlavorStep | null, error };
}

function getContentFromRow(row: Record<string, unknown>): string {
  return (
    (row[contentKey] as string) ??
    (row.prompt as string) ??
    (row.text as string) ??
    (row.instruction as string) ??
    ""
  );
}

export async function createStep(input: {
  humor_flavor_id: string;
  step_number: number;
  content: string;
}) {
  const supabase = createAdminClient();
  const insertPayload: Record<string, unknown> = {
    humor_flavor_id: input.humor_flavor_id,
    step_number: input.step_number,
  };
  const { data: schemaData } = await supabase
    .from("humor_flavor_steps")
    .select("*")
    .limit(1)
    .maybeSingle();
  const columns = schemaData ? Object.keys(schemaData) : [];
  if (columns.includes("content")) {
    insertPayload.content = input.content;
  } else if (columns.includes("prompt")) {
    insertPayload.prompt = input.content;
  } else if (columns.includes("text")) {
    insertPayload.text = input.content;
  } else if (columns.includes("instruction")) {
    insertPayload.instruction = input.content;
  } else {
    insertPayload.content = input.content;
  }

  const { data, error } = await supabase
    .from("humor_flavor_steps")
    .insert(insertPayload)
    .select()
    .single();
  return {
    data: data
      ? { ...data, content: getContentFromRow(data as Record<string, unknown>) }
      : null,
    error,
  };
}

export async function updateStep(
  id: string,
  input: { step_number?: number; content?: string }
) {
  const supabase = createAdminClient();
  const updatePayload: Record<string, unknown> = {};
  if (input.step_number != null) updatePayload.step_number = input.step_number;
  if (input.content != null) {
    const { data: schemaData } = await supabase
      .from("humor_flavor_steps")
      .select("*")
      .limit(1)
      .maybeSingle();
    const columns = schemaData ? Object.keys(schemaData) : [];
    if (columns.includes("content")) updatePayload.content = input.content;
    else if (columns.includes("prompt")) updatePayload.prompt = input.content;
    else if (columns.includes("text")) updatePayload.text = input.content;
    else if (columns.includes("instruction"))
      updatePayload.instruction = input.content;
    else updatePayload.content = input.content;
  }

  const { data, error } = await supabase
    .from("humor_flavor_steps")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();
  return {
    data: data
      ? { ...data, content: getContentFromRow(data as Record<string, unknown>) }
      : null,
    error,
  };
}

export async function deleteStep(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("humor_flavor_steps").delete().eq("id", id);
  return { error };
}

export async function reorderStep(
  id: string,
  direction: "up" | "down"
): Promise<{ error: { message: string } | null }> {
  const supabase = createAdminClient();
  const { data: step, error: stepErr } = await getStep(id);
  if (stepErr || !step) return { error: stepErr ?? { message: "Step not found" } };

  const { data: steps, error: listErr } = await listStepsForFlavor(
    step.humor_flavor_id
  );
  if (listErr || !steps?.length) return { error: listErr ?? { message: "No steps" } };

  const idx = steps.findIndex((s) => s.id === id);
  if (idx < 0) return { error: { message: "Step not found in list" } };

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= steps.length) return { error: null };

  const otherStep = steps[swapIdx];
  const currentNum = step.step_number ?? idx;
  const otherNum = otherStep.step_number ?? swapIdx;

  const { error: u1 } = await supabase
    .from("humor_flavor_steps")
    .update({ step_number: otherNum })
    .eq("id", id);
  if (u1) return { error: u1 };

  const { error: u2 } = await supabase
    .from("humor_flavor_steps")
    .update({ step_number: currentNum })
    .eq("id", otherStep.id);
  if (u2) return { error: u2 };

  return { error: null };
}
