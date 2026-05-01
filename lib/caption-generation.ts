import { getFlavor } from "@/lib/db/flavors";
import { listStepsForFlavor } from "@/lib/db/steps";
import { generateCaptions } from "@/lib/api/almostcrackd";
import type { HumorFlavor } from "@/lib/db/flavors";
import type { HumorFlavorStep } from "@/lib/db/steps";

function stepTextFromRow(step: Record<string, unknown>): string {
  return (
    (step.llm_user_prompt as string) ??
    (step.description as string) ??
    ""
  );
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

  const { data, error } = await generateCaptions({
    imageUrl,
    prompt: prompt || undefined,
    steps: stepContents.some(Boolean) ? stepContents : undefined,
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
