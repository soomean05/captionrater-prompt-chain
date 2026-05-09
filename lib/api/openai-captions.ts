const OPENAI_RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

const STRICT_CAPTION_PROMPT =
  "Return ONLY a raw JSON array of exactly five caption strings. No analysis. No explanation. No markdown. No labels. No object wrapper. No text before or after the JSON array. The first character must be [ and the last character must be ]. Think about the image internally, but do not output analysis.";

function extractJsonArrayText(raw: string): string | null {
  const first = raw.indexOf("[");
  const last = raw.lastIndexOf("]");
  if (first < 0 || last < 0 || last <= first) return null;
  return raw.slice(first, last + 1);
}

function toDataUrl(buffer: Buffer, contentType: string): string {
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

export async function generateCaptionsViaOpenAI(input: {
  imageUrl?: string;
  imageFile?: { buffer: Buffer; contentType: string };
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

  const body = {
    model,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: STRICT_CAPTION_PROMPT },
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
    const captions = arr.map((v) => String(v ?? "").trim()).filter(Boolean).slice(0, 5);
    if (captions.length === 0) {
      return { ok: false, error: "OpenAI fallback returned empty captions.", rawOpenAiResponse: raw };
    }
    return { ok: true, captions };
  } catch {
    return { ok: false, error: "OpenAI fallback captions could not be parsed.", rawOpenAiResponse: raw };
  }
}
