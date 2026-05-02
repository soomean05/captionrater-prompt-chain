import { createAdminClient } from "@/lib/supabase/admin";

/** Non-final steps: keep intermediate work out of the final JSON array. */
export const ALMOSTCRACKD_INTERMEDIATE_STEP_SYSTEM_PROMPT =
  "You are part of a multi-step humor caption pipeline. Follow the user prompt. This step is not the final step: do not output the final JSON array of captions here.";

export const ALMOSTCRACKD_INTERMEDIATE_STEP_USER_PROMPT =
  "Refine humor or caption ideas for this flavor from the image context. Produce intermediate text for the next step only—do not return the final JSON array of five captions; the last pipeline step emits that JSON.";

/** Final step: AlmostCrackd expects parseable JSON (array of 5 caption strings). */
export const ALMOSTCRACKD_FINAL_STEP_SYSTEM_PROMPT =
  "You are a caption generator. Your final response must be parseable JSON only.";

export const ALMOSTCRACKD_FINAL_STEP_USER_PROMPT = `Return ONLY valid JSON. Do not include markdown, explanations, numbering, or extra text. The JSON must be an array of 5 strings, where each string is one caption.

Example:
["caption one", "caption two", "caption three", "caption four", "caption five"]`;

/**
 * AlmostCrackd returns 502 if any step has a missing/null/empty `llm_system_prompt`.
 * Backfill uses the intermediate system prompt until `reconcileAlmostCrackdJsonPromptsForFlavor` runs.
 */
export const DEFAULT_LLM_SYSTEM_PROMPT =
  ALMOSTCRACKD_INTERMEDIATE_STEP_SYSTEM_PROMPT;

const STEP_SELECT = `
  id,
  humor_flavor_id,
  order_by,
  llm_system_prompt,
  llm_user_prompt,
  description,
  llm_temperature,
  llm_input_type_id,
  llm_output_type_id,
  llm_model_id,
  humor_flavor_step_type_id
`;

export type HumorFlavorStep = {
  id: string;
  humor_flavor_id: string;
  order_by: number | null;
  llm_system_prompt: string | null;
  llm_user_prompt: string | null;
  description: string | null;
  llm_temperature: number | null;
  llm_input_type_id: number | null;
  llm_output_type_id: number | null;
  llm_model_id: number | null;
  humor_flavor_step_type_id: number | null;
};

/** Minimal rows for gates (Test Humor Flavor before AlmostCrackd). */
export async function listStepsMinimalForFlavor(humorFlavorId: string) {
  const supabase = createAdminClient();
  return supabase
    .from("humor_flavor_steps")
    .select("id, order_by, llm_user_prompt, llm_system_prompt")
    .eq("humor_flavor_id", humorFlavorId)
    .order("order_by", { ascending: true });
}

/** Sets a default system prompt on steps that AlmostCrackd would reject. */
export async function backfillEmptySystemPromptsForFlavor(
  flavorId: string,
  userId: string
): Promise<{ error: { message: string } | null }> {
  const supabase = createAdminClient();
  const { data: steps, error: listErr } = await listStepsForFlavor(flavorId);
  if (listErr) return { error: listErr };

  for (const step of steps ?? []) {
    if ((step.llm_system_prompt ?? "").trim() !== "") continue;
    const { error } = await supabase
      .from("humor_flavor_steps")
      .update({
        llm_system_prompt: DEFAULT_LLM_SYSTEM_PROMPT,
        modified_by_user_id: userId,
      })
      .eq("id", step.id);
    if (error) return { error };
  }
  return { error: null };
}

export async function listStepsForFlavor(flavorId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("humor_flavor_steps")
    .select(STEP_SELECT)
    .eq("humor_flavor_id", flavorId)
    .order("order_by", { ascending: true });
  return { data: (data ?? []) as HumorFlavorStep[], error };
}

/**
 * Ensures the **last** step (by `order_by`) uses the AlmostCrackd JSON caption contract.
 * Non-final steps with **empty** user+system prompts get intermediate defaults.
 */
export async function reconcileAlmostCrackdJsonPromptsForFlavor(
  flavorId: string,
  userId: string
): Promise<{ error: { message: string } | null }> {
  const supabase = createAdminClient();
  const { data: steps, error: listErr } = await listStepsForFlavor(flavorId);
  if (listErr) return { error: listErr };
  if (!steps?.length) return { error: null };

  const sorted = [...steps].sort(
    (a, b) => (a.order_by ?? 0) - (b.order_by ?? 0)
  );
  const n = sorted.length;

  for (let i = 0; i < n; i++) {
    const step = sorted[i];
    const isLast = i === n - 1;
    const blank =
      (step.llm_user_prompt ?? "").trim() === "" &&
      (step.llm_system_prompt ?? "").trim() === "";

    if (isLast) {
      const { error } = await supabase
        .from("humor_flavor_steps")
        .update({
          llm_user_prompt: ALMOSTCRACKD_FINAL_STEP_USER_PROMPT,
          llm_system_prompt: ALMOSTCRACKD_FINAL_STEP_SYSTEM_PROMPT,
          modified_by_user_id: userId,
        })
        .eq("id", step.id);
      if (error) return { error };
    } else if (blank) {
      const { error } = await supabase
        .from("humor_flavor_steps")
        .update({
          llm_user_prompt: ALMOSTCRACKD_INTERMEDIATE_STEP_USER_PROMPT,
          llm_system_prompt: ALMOSTCRACKD_INTERMEDIATE_STEP_SYSTEM_PROMPT,
          modified_by_user_id: userId,
        })
        .eq("id", step.id);
      if (error) return { error };
    }
  }
  return { error: null };
}

/** True if the last step (by order) is not already on the AlmostCrackd JSON caption template. */
export function needsAlmostCrackdJsonReconcile(steps: HumorFlavorStep[]): boolean {
  if (!steps.length) return false;
  const sorted = [...steps].sort(
    (a, b) => (a.order_by ?? 0) - (b.order_by ?? 0)
  );
  const last = sorted[sorted.length - 1]!;
  const u = (last.llm_user_prompt ?? "").trim();
  const s = (last.llm_system_prompt ?? "").trim();
  const matchesContract =
    u.startsWith("Return ONLY valid JSON") &&
    s === ALMOSTCRACKD_FINAL_STEP_SYSTEM_PROMPT.trim();
  return !matchesContract;
}

export async function getStep(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("humor_flavor_steps")
    .select(STEP_SELECT)
    .eq("id", id)
    .maybeSingle();
  return { data: data as HumorFlavorStep | null, error };
}

export async function createStep(input: {
  humor_flavor_id: string;
  orderBy: number;
  llmUserPrompt: string;
  userId: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("humor_flavor_steps")
    .insert({
      humor_flavor_id: input.humor_flavor_id,
      order_by: input.orderBy,
      llm_system_prompt: DEFAULT_LLM_SYSTEM_PROMPT,
      llm_user_prompt: input.llmUserPrompt,
      llm_input_type_id: 1,
      llm_output_type_id: 1,
      llm_model_id: 1,
      humor_flavor_step_type_id: 1,
      created_by_user_id: input.userId,
      modified_by_user_id: input.userId,
    })
    .select(STEP_SELECT)
    .single();
  if (!error) {
    const rec = await reconcileAlmostCrackdJsonPromptsForFlavor(
      input.humor_flavor_id,
      input.userId
    );
    if (rec.error) return { data: data as HumorFlavorStep | null, error: rec.error };
  }
  return { data: data as HumorFlavorStep | null, error };
}

export async function updateStep(
  id: string,
  input: { orderBy?: number; llmUserPrompt?: string; userId: string }
) {
  const supabase = createAdminClient();
  const updatePayload: Record<string, unknown> = {
    modified_by_user_id: input.userId,
  };
  if (input.orderBy != null) updatePayload.order_by = input.orderBy;
  if (input.llmUserPrompt != null) updatePayload.llm_user_prompt = input.llmUserPrompt;

  const { data, error } = await supabase
    .from("humor_flavor_steps")
    .update(updatePayload)
    .eq("id", id)
    .select(STEP_SELECT)
    .single();
  return { data: data as HumorFlavorStep | null, error };
}

export async function deleteStep(
  id: string,
  options?: { reconcileUserId?: string }
) {
  const supabase = createAdminClient();
  const { data: before } = await getStep(id);
  const flavorId = before?.humor_flavor_id;
  const { error } = await supabase.from("humor_flavor_steps").delete().eq("id", id);
  if (
    !error &&
    flavorId &&
    options?.reconcileUserId
  ) {
    const rec = await reconcileAlmostCrackdJsonPromptsForFlavor(
      flavorId,
      options.reconcileUserId
    );
    if (rec.error) return { error: rec.error };
  }
  return { error };
}

export async function reorderStep(
  id: string,
  direction: "up" | "down",
  userIdForReconcile?: string
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
  const currentNum = step.order_by ?? idx;
  const otherNum = otherStep.order_by ?? swapIdx;

  const { error: u1 } = await supabase
    .from("humor_flavor_steps")
    .update({ order_by: otherNum })
    .eq("id", id);
  if (u1) return { error: u1 };

  const { error: u2 } = await supabase
    .from("humor_flavor_steps")
    .update({ order_by: currentNum })
    .eq("id", otherStep.id);
  if (u2) return { error: u2 };

  if (userIdForReconcile) {
    const rec = await reconcileAlmostCrackdJsonPromptsForFlavor(
      step.humor_flavor_id,
      userIdForReconcile
    );
    if (rec.error) return { error: rec.error };
  }

  return { error: null };
}
