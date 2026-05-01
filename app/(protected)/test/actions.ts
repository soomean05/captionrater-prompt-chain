"use server";

import { runCaptionGenerationForTest } from "@/lib/caption-generation";

export async function generateCaptionsAction(formData: FormData) {
  const humorFlavorId = String(formData.get("flavor_id") ?? "").trim();
  const imageUrl = String(formData.get("image_url") ?? "").trim();

  const result = await runCaptionGenerationForTest({
    humorFlavorId,
    imageUrl,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  return {
    flavor: result.data.flavor,
    steps: result.data.steps,
    imageUrl: result.data.imageUrl,
    captions: result.data.captions,
    raw: result.data.raw,
  };
}
