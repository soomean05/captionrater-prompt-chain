"use server";

import { getFlavor } from "@/lib/db/flavors";
import { listStepsForFlavor } from "@/lib/db/steps";
import { generateCaptions } from "@/lib/api/almostcrackd";

function getContentFromStep(step: Record<string, unknown>): string {
  return (
    (step.prompt as string) ??
    (step.instruction as string) ??
    (step.step_text as string) ??
    (step.system_prompt as string) ??
    (step.user_prompt as string) ??
    (step.text as string) ??
    ""
  );
}

export async function generateCaptionsAction(formData: FormData) {
  const flavorId = String(formData.get("flavor_id") ?? "").trim();
  const imageUrl = String(formData.get("image_url") ?? "").trim();

  if (!flavorId) return { error: "Select a humor flavor" };
  if (!imageUrl) return { error: "Provide an image URL" };

  const { data: flavor, error: flavorError } = await getFlavor(flavorId);
  if (flavorError || !flavor) {
    return { error: "Flavor not found" };
  }

  const { data: steps, error: stepsError } = await listStepsForFlavor(flavorId);
  if (stepsError) return { error: stepsError.message };

  const stepContents = (steps ?? []).map((s) =>
    getContentFromStep(s as Record<string, unknown>)
  );
  const prompt = stepContents.join("\n\n");

  const { data, error } = await generateCaptions({
    imageUrl,
    prompt: prompt || undefined,
    steps: stepContents.length ? stepContents : undefined,
  });

  if (error) return { error };

  return {
    flavor,
    steps: steps ?? [],
    imageUrl,
    captions: data?.captions ?? [],
    raw: data?.raw,
  };
}
