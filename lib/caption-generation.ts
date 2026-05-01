import { getFlavor } from "@/lib/db/flavors";
import { listStepsForFlavor } from "@/lib/db/steps";
import type { HumorFlavor } from "@/lib/db/flavors";
import type { HumorFlavorStep } from "@/lib/db/steps";

const MISSING_KEY_ERROR =
  "OPENAI_API_KEY is missing. Add it to Vercel environment variables.";

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

function buildFlavorAndStepsPrompt(
  flavor: HumorFlavor,
  steps: HumorFlavorStep[],
  imageUrl: string
): string {
  const flavorLines = [
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

  const imageLine = [
    "## Image",
    `Image URL (also attached for vision): ${imageUrl}`,
  ].join("\n");

  return [
    flavorLines,
    stepBlocks.length ? stepBlocks.join("\n\n") : "## Steps\n(no steps)",
    imageLine,
    "",
    "Following the humor flavor and step instructions above, write exactly five short captions for the attached image. Each caption must be concise (one sentence or shorter). Distinct jokes or angles.",
  ].join("\n\n");
}

function extractCaptionsArray(parsed: unknown): string[] {
  if (!parsed || typeof parsed !== "object") return [];
  const o = parsed as Record<string, unknown>;
  const arr = o.captions;
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((item): item is string => typeof item === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function callOpenAIExactlyFiveCaptions(input: {
  flavor: HumorFlavor;
  steps: HumorFlavorStep[];
  imageUrl: string;
}): Promise<{ data?: { captions: string[]; raw: unknown }; error?: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { error: MISSING_KEY_ERROR };
  }

  const base = (
    process.env.OPENAI_API_BASE ?? "https://api.openai.com/v1"
  ).replace(/\/$/, "");
  const model =
    process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini";

  const userText = buildFlavorAndStepsPrompt(
    input.flavor,
    input.steps,
    input.imageUrl
  );

  const systemInstructions = [
    "You write social-style image captions.",
    'Reply with only valid JSON (no markdown) in this exact shape: {"captions":["…","…","…","…","…"]}.',
    "The array must contain exactly 5 non-empty strings.",
  ].join(" ");

  const body = {
    model,
    temperature: 0.8,
    max_tokens: 800,
    response_format: { type: "json_object" as const },
    messages: [
      { role: "system" as const, content: systemInstructions },
      {
        role: "user" as const,
        content: [
          {
            type: "image_url" as const,
            image_url: { url: input.imageUrl },
          },
          { type: "text" as const, text: userText },
        ],
      },
    ],
  };

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    return {
      error: `OpenAI returned non-JSON (HTTP ${res.status}): ${text.slice(0, 400)}`,
    };
  }

  if (!res.ok) {
    const errObj = json as Record<string, unknown> | null;
    const inner =
      errObj?.error && typeof errObj.error === "object"
        ? (errObj.error as Record<string, unknown>).message
        : null;
    const msg =
      (typeof inner === "string" && inner) ||
      (typeof errObj?.message === "string" && errObj.message) ||
      text.slice(0, 400);
    return { error: `OpenAI error ${res.status}: ${msg}` };
  }

  const outer = json as Record<string, unknown>;
  const choice = Array.isArray(outer.choices) ? outer.choices[0] : null;
  const message =
    choice && typeof choice === "object"
      ? (choice as Record<string, unknown>).message
      : null;
  const content =
    message && typeof message === "object"
      ? (message as Record<string, unknown>).content
      : null;

  if (typeof content !== "string") {
    return { error: "OpenAI response missing message content." };
  }

  let innerJson: unknown;
  try {
    innerJson = JSON.parse(content);
  } catch {
    return {
      error: `OpenAI content was not valid JSON: ${content.slice(0, 400)}`,
    };
  }

  let captions = extractCaptionsArray(innerJson);
  if (captions.length > 5) {
    captions = captions.slice(0, 5);
  }
  if (captions.length !== 5) {
    return {
      error: `OpenAI returned ${captions.length} captions; exactly 5 required.`,
    };
  }

  return { data: { captions, raw: json } };
}

/**
 * Test Humor Flavor: load flavor + ordered steps, build prompt, call OpenAI for 5 captions.
 * Used by POST /api/generate-captions and the test page server action.
 */
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

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return { ok: false, error: MISSING_KEY_ERROR, status: 500 };
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

  const { data, error } = await callOpenAIExactlyFiveCaptions({
    flavor,
    steps: orderedSteps,
    imageUrl,
  });

  if (error) {
    const isKey = error === MISSING_KEY_ERROR;
    return { ok: false, error, status: isKey ? 500 : 502 };
  }

  if (!data) {
    return { ok: false, error: "No data from OpenAI", status: 502 };
  }

  return {
    ok: true,
    data: {
      flavor,
      steps: orderedSteps,
      imageUrl,
      captions: data.captions,
      raw: data.raw,
    },
  };
}
