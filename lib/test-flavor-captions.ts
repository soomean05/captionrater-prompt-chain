import { getFlavor } from "@/lib/db/flavors";
import { listStepsForFlavor } from "@/lib/db/steps";
import {
  extractCaptions,
  generateCaptionsForImage,
  uploadImageFromUrl,
  type PipelinePostFailure,
} from "@/lib/api/almostcrackd-pipeline";

function failureMessage(f: PipelinePostFailure): string {
  if (f.status === 405) {
    return f.message;
  }
  return f.message;
}

function registeredImageIdFromUpload(
  data: Record<string, unknown>
): string | undefined {
  const a = data.imageId;
  const b = data.image_id;
  if (typeof a === "string" && a.trim()) return a.trim();
  if (typeof b === "string" && b.trim()) return b.trim();
  return undefined;
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

  const upload = await uploadImageFromUrl(
    imageUrl,
    input.accessToken,
    false
  );
  if (!upload.ok) {
    return {
      ok: false,
      error: failureMessage(upload),
      status: 502,
    };
  }

  const imageId = registeredImageIdFromUpload(
    upload.data as Record<string, unknown>
  );
  if (!imageId) {
    return {
      ok: false,
      error: "imageId not returned from /pipeline/upload-image-from-url",
      status: 502,
    };
  }

  const gen = await generateCaptionsForImage(imageId, input.accessToken, {
    humorFlavorId: flavor.id,
    steps: orderedSteps,
  });
  if (!gen.ok) {
    return {
      ok: false,
      error: failureMessage(gen),
      status: 502,
    };
  }

  const captions = extractCaptions(gen.data);

  if (captions.length === 0) {
    throw new Error(
      `AlmostCrackd returned 0 captions. Raw response: ${JSON.stringify(gen.data)}`
    );
  }

  return { ok: true, captions };
}
