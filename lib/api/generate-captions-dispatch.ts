import { generateCaptions as generateCaptionsAlmostCrackd } from "@/lib/api/almostcrackd";
import { generateCaptionsOpenAI } from "@/lib/api/openai-captions";
import type {
  GenerateCaptionsInput,
  GenerateCaptionsResult,
} from "@/lib/api/caption-types";

/**
 * CAPTION_BACKEND=openai uses OpenAI (OPENAI_API_KEY). Default AlmostCrackd.
 * AlmostCrackd’s public api.almostcrackd.ai often returns POST 405 everywhere;
 * prefer CAPTION_BACKEND=openai until they publish a POST URL.
 */
export async function generateCaptionsForBackend(
  input: GenerateCaptionsInput
): Promise<{ data?: GenerateCaptionsResult; error?: string }> {
  const backend = process.env.CAPTION_BACKEND?.toLowerCase()?.trim();
  if (backend === "openai") {
    return generateCaptionsOpenAI(input);
  }
  return generateCaptionsAlmostCrackd(input);
}
