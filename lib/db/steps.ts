import { createAdminClient } from "@/lib/supabase/admin";

export type HumorFlavorStep = {
  id: string;
  humor_flavor_id: string;
  order_value: number | null;
  content: string | null;
  created_datetime_utc?: string | null;
};

const contentKey = "content";
type StepColumns = {
  contentColumn: "content" | "prompt" | "text" | "instruction";
  orderColumn: "order_index" | "sort_order" | "position" | "step_order" | "sequence" | null;
  hasCreatedByUserId: boolean;
  hasModifiedByUserId: boolean;
};
let stepColumnsPromise: Promise<StepColumns> | null = null;

async function columnExists(table: string, column: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from(table).select(`id,${column}`).limit(1);
  return !error;
}

async function getStepColumns(): Promise<StepColumns> {
  if (!stepColumnsPromise) {
    stepColumnsPromise = (async () => {
      const contentCandidates: StepColumns["contentColumn"][] = [
        "content",
        "prompt",
        "text",
        "instruction",
      ];
      let contentColumn: StepColumns["contentColumn"] = "content";
      for (const candidate of contentCandidates) {
        if (await columnExists("humor_flavor_steps", candidate)) {
          contentColumn = candidate;
          break;
        }
      }
      const orderCandidates: Exclude<StepColumns["orderColumn"], null>[] = [
        "order_index",
        "sort_order",
        "position",
        "step_order",
        "sequence",
      ];
      let orderColumn: StepColumns["orderColumn"] = null;
      for (const candidate of orderCandidates) {
        if (await columnExists("humor_flavor_steps", candidate)) {
          orderColumn = candidate;
          break;
        }
      }

      return {
        contentColumn,
        orderColumn,
        hasCreatedByUserId: await columnExists(
          "humor_flavor_steps",
          "created_by_user_id"
        ),
        hasModifiedByUserId: await columnExists(
          "humor_flavor_steps",
          "modified_by_user_id"
        ),
      };
    })();
  }
  return stepColumnsPromise;
}

export async function listStepsForFlavor(flavorId: string) {
  const supabase = createAdminClient();
  const columns = await getStepColumns();
  let q = supabase
    .from("humor_flavor_steps")
    .select("*")
    .eq("humor_flavor_id", flavorId);
  q = columns.orderColumn
    ? q.order(columns.orderColumn, { ascending: true })
    : q.order("created_datetime_utc", { ascending: true });
  const { data, error } = await q;
  const mapped = ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    ...(row as HumorFlavorStep),
    order_value: columns.orderColumn
      ? ((row[columns.orderColumn] as number | null | undefined) ?? null)
      : null,
    content: getContentFromRow(row),
  })) as HumorFlavorStep[];
  return { data: mapped, error };
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
  orderValue?: number;
  content: string;
  userId: string;
}) {
  const supabase = createAdminClient();
  const columns = await getStepColumns();
  const insertPayload: Record<string, unknown> = {
    humor_flavor_id: input.humor_flavor_id,
    [columns.contentColumn]: input.content,
  };
  if (columns.orderColumn && input.orderValue != null) {
    insertPayload[columns.orderColumn] = input.orderValue;
  }
  if (columns.hasCreatedByUserId) insertPayload.created_by_user_id = input.userId;
  if (columns.hasModifiedByUserId) insertPayload.modified_by_user_id = input.userId;

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
  input: { orderValue?: number; content?: string; userId?: string }
) {
  const supabase = createAdminClient();
  const columns = await getStepColumns();
  const updatePayload: Record<string, unknown> = {};
  if (columns.orderColumn && input.orderValue != null) {
    updatePayload[columns.orderColumn] = input.orderValue;
  }
  if (input.content != null) updatePayload[columns.contentColumn] = input.content;
  if (input.userId && columns.hasModifiedByUserId) {
    updatePayload.modified_by_user_id = input.userId;
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
  const columns = await getStepColumns();
  if (!columns.orderColumn) {
    return { error: { message: "Step ordering is not supported by this schema" } };
  }
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
  const currentNum = step.order_value ?? idx;
  const otherNum = otherStep.order_value ?? swapIdx;

  const { error: u1 } = await supabase
    .from("humor_flavor_steps")
    .update({ [columns.orderColumn]: otherNum })
    .eq("id", id);
  if (u1) return { error: u1 };

  const { error: u2 } = await supabase
    .from("humor_flavor_steps")
    .update({ [columns.orderColumn]: currentNum })
    .eq("id", otherStep.id);
  if (u2) return { error: u2 };

  return { error: null };
}
