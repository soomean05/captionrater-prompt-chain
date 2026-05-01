import { getFlavor } from "@/lib/db/flavors";
import { listStepsForFlavor } from "@/lib/db/steps";
import { generateCaptionsForBackend } from "@/lib/api/generate-captions-dispatch";
import type { HumorFlavor } from "@/lib/db/flavors";
import type { HumorFlavorStep } from "@/lib/db/steps";

function stepTextFromRow(step: Record<string, unknown>): string {
  return (
    (step.llm_user_prompt as string) ??
    (step.description as string) ??
    ""
  );
}

function compositeSystemPromptFromSteps(
  steps: HumorFlavorStep[]
): string | undefined {
  const parts = steps
    .map((s) => s.llm_system_prompt?.trim())
    .filter((x): x is string => Boolean(x?.length));
  if (!parts.length) return undefined;
  return parts.join("\n\n");
}

export type CaptionGenerationSuccess = {
  flavor: HumorFlavor;
  steps: HumorFlavorStep[];
  imageUrl: string;
  captions: string[];
  raw?: unknown;
};

export type CaptionGenerationResult =
  | { ok: true; data: CaptionGenerationSuccess }
  | { ok: false; error: string; status?: number };

export async function runCaptionGenerationForTest(input: {
  humorFlavorId: string;
  imageUrl: string;
}): Promise<CaptionGenerationResult> {
  const humorFlavorId = input.humorFlavorId.trim();
  const imageUrl = input.imageUrl.trim();

  if (!humorFlavorId) {
    return { ok: false, error: "humorFlavorId is required", status: 400 };
  }
  if (!imageUrl) {
    return { ok: false, error: "imageUrl is required", status: 400 };
  }

  const { data: flavor, error: flavorError } = await getFlavor(humorFlavorId);
  if (flavorError || !flavor) {
    return { ok: false, error: "Flavor not found", status: 404 };
  }

  const { data: steps, error: stepsError } = await listStepsForFlavor(
    humorFlavorId
  );
  if (stepsError) {
    return { ok: false, error: stepsError.message, status: 500 };
  }

  const stepContents = (steps ?? []).map((s) =>
    stepTextFromRow(s as Record<string, unknown>)
  );
  const prompt = stepContents.filter(Boolean).join("\n\n");

  const compositeSystem = compositeSystemPromptFromSteps(steps ?? []);
  const { data, error } = await generateCaptionsForBackend({
    imageUrl,
    prompt: prompt || undefined,
    steps: stepContents.some(Boolean) ? stepContents : undefined,
    ...(compositeSystem
      ? { compositeSystemPrompt: compositeSystem }
      : {}),
  });

  if (error) {
    return { ok: false, error, status: 502 };
  }

  return {
    ok: true,
    data: {
      flavor,
      steps: steps ?? [],
      imageUrl,
      captions: data?.captions ?? [],
      raw: data?.raw,
    },
  };
}
