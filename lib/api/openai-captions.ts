const OPENAI_RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

const STRICT_CAPTION_PROMPT =
  "Return ONLY a raw JSON array of exactly five caption strings. No analysis. No explanation. No markdown. No labels. No object wrapper. No text before or after the JSON array. The first character must be [ and the last character must be ]. Think about the image internally, but do not output analysis. Do not mention the flavor name literally in the caption text.";

function extractJsonArrayText(raw: string): string | null {
  const first = raw.indexOf("[");
  const last = raw.lastIndexOf("]");
  if (first < 0 || last < 0 || last <= first) return null;
  return raw.slice(first, last + 1);
}

function toDataUrl(buffer: Buffer, contentType: string): string {
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

function exactlyFive(captions: string[]): string[] {
  const cleaned = captions.map((c) => c.trim()).filter(Boolean);
  if (cleaned.length >= 5) return cleaned.slice(0, 5);
  const out = [...cleaned];
  while (out.length < 5) {
    out.push(`Caption variation ${out.length + 1}`);
  }
  return out;
}

export function generateSimpleFallbackCaptions(input: {
  flavorName?: string | null;
  flavorSteps: Array<{ llm_user_prompt: string | null; llm_system_prompt: string | null }>;
}): string[] {
  const hints = input.flavorSteps
    .map((s) => `${s.llm_system_prompt ?? ""} ${s.llm_user_prompt ?? ""}`.trim())
    .filter(Boolean)
    .slice(-2)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const hintSnippet = hints ? ` ${hints.slice(0, 80)}...` : "";
  return exactlyFive([
    `POV: the chaos mode activated and the photo did not see that coming.${hintSnippet}`,
    "This image is proof that dry wit works better than coffee.",
    "When the picture says one thing but the caption says the louder part out loud.",
    "I brought unearned confidence to this photo and now everyone is nervous.",
    "No notes, just chaotic vibes and questionable confidence.",
  ]);
}

export async function generateCaptionsViaOpenAI(input: {
  imageUrl?: string;
  imageFile?: { buffer: Buffer; contentType: string };
  flavorName?: string | null;
  flavorSteps?: Array<{ llm_user_prompt: string | null; llm_system_prompt: string | null }>;
}): Promise<
  | { ok: true; captions: string[] }
  | { ok: false; error: string; rawOpenAiResponse?: string }
> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "OPENAI_API_KEY is not configured." };
  }

  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
  const imageInput =
    input.imageFile && input.imageFile.buffer.length > 0
      ? toDataUrl(input.imageFile.buffer, input.imageFile.contentType)
      : input.imageUrl?.trim() ?? "";
  if (!imageInput) {
    return { ok: false, error: "OpenAI fallback requires an image URL or file." };
  }

  const stepsText = (input.flavorSteps ?? [])
    .map(
      (s, i) =>
        `Step ${i + 1}\nSystem: ${(s.llm_system_prompt ?? "").trim()}\nUser: ${(s.llm_user_prompt ?? "").trim()}`
    )
    .join("\n\n");
  const flavorLine = input.flavorName?.trim()
    ? `Flavor name: ${input.flavorName.trim()}`
    : "Flavor name: (unknown)";

  const body = {
    model,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `${STRICT_CAPTION_PROMPT}\n\nUse this flavor context while writing captions:\n${flavorLine}\n${stepsText}`,
          },
          { type: "input_image", image_url: imageInput },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "captions_array",
        schema: {
          type: "array",
          minItems: 5,
          maxItems: 5,
          items: { type: "string" },
        },
      },
    },
  };

  const res = await fetch(OPENAI_RESPONSES_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  if (!res.ok) {
    return {
      ok: false,
      error: `OpenAI fallback failed (${res.status}).`,
      rawOpenAiResponse: raw,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "OpenAI fallback returned non-JSON.", rawOpenAiResponse: raw };
  }

  const outputText =
    typeof (parsed as { output_text?: unknown }).output_text === "string"
      ? (parsed as { output_text: string }).output_text
      : "";
  const asArrayText = extractJsonArrayText(outputText) ?? outputText;

  try {
    const arr = JSON.parse(asArrayText) as unknown;
    if (!Array.isArray(arr)) {
      return { ok: false, error: "OpenAI fallback output is not a JSON array.", rawOpenAiResponse: raw };
    }
    const captions = exactlyFive(arr.map((v) => String(v ?? "").trim()));
    if (captions.length === 0) {
      return { ok: false, error: "OpenAI fallback returned empty captions.", rawOpenAiResponse: raw };
    }
    return { ok: true, captions };
  } catch {
    return { ok: false, error: "OpenAI fallback captions could not be parsed.", rawOpenAiResponse: raw };
  }
}
