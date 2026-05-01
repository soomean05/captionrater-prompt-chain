import { getFlavor } from "@/lib/db/flavors";
import { listStepsForFlavor } from "@/lib/db/steps";
import type { HumorFlavor } from "@/lib/db/flavors";
import type { HumorFlavorStep } from "@/lib/db/steps";
import {
  generateCaptionsForImage,
  normalizePipelineCaptions,
  uploadImageFromUrl,
  type PipelinePostFailure,
} from "@/lib/api/almostcrackd-pipeline";

function failureMessage(f: PipelinePostFailure): string {
  if (f.status === 405) {
    return f.message;
  }
  return f.message;
}

function buildHumorFlavorPrompt(
  flavor: HumorFlavor,
  steps: HumorFlavorStep[]
): string {
  const header = [
    "## Humor flavor",
    `Name / label: ${flavor.name?.trim() || "(none)"}`,
    `Description: ${flavor.description?.trim() || "(none)"}`,
  ].join("\n");

  const stepBlocks = steps.map((s, i) => {
    const ord = s.order_by ?? i + 1;
    const parts = [
      `### Step ${ord}`,
      s.llm_system_prompt?.trim()
        ? `llm_system_prompt:\n${s.llm_system_prompt.trim()}`
        : null,
      s.llm_user_prompt?.trim()
        ? `llm_user_prompt:\n${s.llm_user_prompt.trim()}`
        : null,
      s.description?.trim()
        ? `description:\n${s.description.trim()}`
        : null,
    ].filter(Boolean);
    return parts.join("\n\n");
  });

  return [
    header,
    stepBlocks.length ? stepBlocks.join("\n\n") : "## Steps\n(no steps)",
    "",
    "Apply this humor flavor and step chain when generating captions.",
  ].join("\n\n");
}

/**
 * Public https image URL → upload-image-from-url → generate-captions (Assignment 5).
 * Uses Supabase access token as AlmostCrackd Bearer (same as caption rater app).
 */
export async function runAssignment5TestFlavorCaptions(input: {
  accessToken: string;
  humorFlavorId: string;
  imageUrl: string;
}): Promise<
  | { ok: true; captions: string[] }
  | { ok: false; error: string; status: number }
> {
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

  const orderedSteps = steps ?? [];
  const humorPrompt = buildHumorFlavorPrompt(flavor, orderedSteps);

  const upload = await uploadImageFromUrl(
    imageUrl,
    input.accessToken,
    false
  );
  if (!upload.ok) {
    return {
      ok: false,
      error: failureMessage(upload),
      status: upload.status === 405 ? 502 : 502,
    };
  }

  const imageId = upload.data.imageId;
  if (!imageId || typeof imageId !== "string") {
    return {
      ok: false,
      error: "imageId not returned from /pipeline/upload-image-from-url",
      status: 502,
    };
  }

  let gen = await generateCaptionsForImage(imageId, input.accessToken, {
    prompt: humorPrompt,
  });
  if (!gen.ok && gen.status === 400) {
    gen = await generateCaptionsForImage(imageId, input.accessToken);
  }
  if (!gen.ok) {
    return {
      ok: false,
      error: failureMessage(gen),
      status: 502,
    };
  }

  let captions = normalizePipelineCaptions(gen.data);
  if (captions.length > 5) {
    captions = captions.slice(0, 5);
  }
  if (captions.length < 5) {
    return {
      ok: false,
      error: `AlmostCrackd returned ${captions.length} captions; expected 5.`,
      status: 502,
    };
  }

  return { ok: true, captions };
}
