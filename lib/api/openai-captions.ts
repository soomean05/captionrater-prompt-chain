import type {
  GenerateCaptionsInput,
  GenerateCaptionsResult,
} from "@/lib/api/caption-types";
import { normalizeCaptions } from "@/lib/api/caption-types";

function imagePartForVision(input: GenerateCaptionsInput): {
  type: "image_url";
  image_url: { url: string };
} {
  const b64 = input.imageBase64?.trim();
  if (b64) {
    const url = b64.startsWith("data:")
      ? b64
      : `data:image/jpeg;base64,${b64}`;
    return { type: "image_url", image_url: { url } };
  }
  const url = input.imageUrl?.trim();
  if (!url) throw new Error("missing image");
  return { type: "image_url", image_url: { url } };
}

/** Generate captions via OpenAI Chat Completions (vision-capable models). */
export async function generateCaptionsOpenAI(
  input: GenerateCaptionsInput
): Promise<{ data?: GenerateCaptionsResult; error?: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      error:
        "CAPTION_BACKEND=openai requires OPENAI_API_KEY. Or use AlmostCrackd with a valid ALMOSTCRACKD_ENDPOINT from their docs.",
    };
  }

  const base = (
    process.env.OPENAI_API_BASE ?? "https://api.openai.com/v1"
  ).replace(/\/$/, "");
  const model =
    process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini";

  const parts: Record<string, unknown>[] = [];

  try {
    parts.push(imagePartForVision(input));
  } catch {
    return { error: "Provide imageUrl or imageBase64, and prompt or steps" };
  }

  const userBits: string[] = [];
  if (input.prompt?.trim()) userBits.push(input.prompt.trim());
  if (input.steps?.length) {
    userBits.push(
      `Prompt chain (${input.steps.length} steps):\n${input.steps
        .filter(Boolean)
        .map((s, i) => `${i + 1}. ${s}`)
        .join("\n")}`
    );
  }
  if (!userBits.length) {
    return { error: "Provide image_url or image_base64, and prompt or steps" };
  }

  const systemPieces = [
    input.compositeSystemPrompt?.trim(),
    "Caption the attached image.",
    'Reply with only valid JSON, no markdown, matching: {"captions":["...","..."]}. Include at least one string in captions.',
  ].filter(Boolean) as string[];
  const instructions = systemPieces.join("\n\n");

  const body = {
    model,
    temperature: 0.7,
    max_tokens: 1024,
    response_format: { type: "json_object" as const },
    messages: [
      { role: "system" as const, content: instructions },
      {
        role: "user" as const,
        content: [...parts, { type: "text", text: userBits.join("\n\n") }],
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
      error: `OpenAI response was not JSON (HTTP ${res.status}): ${text.slice(0, 400)}`,
    };
  }

  if (!res.ok) {
    const errObj = json as Record<string, unknown> | null;
    const msg =
      (typeof errObj?.error === "object" &&
        errObj?.error &&
        typeof (errObj.error as Record<string, unknown>).message === "string" &&
        (errObj.error as Record<string, unknown>).message) ||
      (typeof errObj?.message === "string" && errObj.message) ||
      text.slice(0, 400);
    return {
      error: `OpenAI error ${res.status}: ${msg}`,
    };
  }

  const outer = json as Record<string, unknown>;
  const choice = outer.choices && Array.isArray(outer.choices) ? outer.choices[0] : null;
  const message = choice && typeof choice === "object" ? (choice as Record<string, unknown>).message : null;
  const content =
    message && typeof message === "object"
      ? (message as Record<string, unknown>).content
      : null;

  let parsedInner: unknown;
  if (typeof content === "string") {
    try {
      parsedInner = JSON.parse(content);
    } catch {
      parsedInner = { captions: normalizeCaptions(content) };
    }
  } else {
    parsedInner = content;
  }

  const captions = normalizeCaptions(parsedInner);
  if (!captions.length) {
    return {
      error: `OpenAI returned no captions. Parsed: ${typeof content === "string" ? content.slice(0, 280) : ""}`,
      data: { captions: [], raw: json },
    };
  }

  return {
    data: {
      captions,
      raw: json,
    },
  };
}
